import * as Comlink from "comlink";

import type { Progress } from "./tts";
import { WorkerPool } from "./worker-pool";
import { CPU_COUNT, VOICE_ID } from "./constants";
import { audioPlayer } from "./audio-player";
import { audioDb } from "./audio-db";

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
    return worker.downloadModel(VOICE_ID, onProgress);
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
  let enqueueing = false;

  async function enqueueReadyAudio() {
    if (enqueueing) return;
    enqueueing = true;

    try {
      while (results.has(nextToEnqueue)) {
        const blob = results.get(nextToEnqueue);
        if (blob) {
          console.log(`Enqueuing audio for sentence ${nextToEnqueue + 1} / ${total}`); // prettier-ignore
          await audioPlayer.enqueue(blob);
        }
        results.delete(nextToEnqueue);
        nextToEnqueue++;
      }
    } finally {
      enqueueing = false;
    }
  }

  const tasks = sentences.map(async (text, index) => {
    const current = index + 1;
    const key = await audioDb.key({ text, voiceId: VOICE_ID });
    let blob = await audioDb.get(key);

    if (blob) {
      console.log(`Using cached audio for sentence ${current} / ${total}`);
    } else {
      console.log(`Processing sentence ${current} / ${total}`);

      const result = await pool.exec(async (worker) => {
        return worker.getAudio({ text, voiceId: VOICE_ID });
      });

      console.log(`Finished processing sentence ${current} / ${total}`);

      if (!result.audio) {
        console.error(`Error processing sentence ${current}: ${result.message}`); // prettier-ignore
        return;
      }

      blob = result.audio;
      await audioDb.set(key, blob);
    }

    results.set(index, blob);
    await enqueueReadyAudio();
  });

  await Promise.all(tasks);
}
