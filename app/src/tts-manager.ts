import * as Comlink from "comlink";

import type { Progress } from "./tts";
import { WorkerPool } from "./worker-pool";
import { CPU_COUNT, DEFAULT_VOICE_ID } from "./constants";
import { audioPlayer } from "./audio-player";

const pool = new WorkerPool(CPU_COUNT);

export async function downloadModel() {
  const onProgress = Comlink.proxy((progress: Progress) => {
    console.log(
      `Downloading ${progress.url} - ${Math.round(
        (progress.loaded * 100) / progress.total
      )}%`
    );
  });

  await pool.exec((worker) => {
    return worker.downloadModel(DEFAULT_VOICE_ID, onProgress);
  });
}

export async function deleteModels() {
  await pool.exec((worker) => {
    return worker.deleteModels();
  });
}

export async function processSentences(sentences: string[]) {
  const total = sentences.length;
  const results = new Map<number, Blob>();

  let nextToEnqueue = 0;

  async function enqueueReadyAudio() {
    while (results.has(nextToEnqueue)) {
      const blob = results.get(nextToEnqueue);
      if (blob) {
        console.log(
          `Enqueuing audio for sentence ${nextToEnqueue + 1} / ${total}`
        );
        await audioPlayer.enqueue(blob);
      }
      results.delete(nextToEnqueue);
      nextToEnqueue++;
    }
  }

  const tasks = sentences.map((sentence, index) => {
    const current = index + 1;
    console.log(`Processing sentence ${current} / ${total}`);

    return pool.exec(async (worker) => {
      const result = await worker.getAudio({
        text: sentence,
        voiceId: DEFAULT_VOICE_ID,
      });

      console.log(`Finished processing sentence ${current} / ${total}`);

      if (result.audio) {
        results.set(index, result.audio);
      } else {
        console.error(
          `Error processing sentence ${current}: ${result.message}`
        );
      }

      return enqueueReadyAudio();
    });
  });

  await Promise.all(tasks);
}
