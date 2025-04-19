import * as Comlink from "comlink";
import type { Progress } from "@mintplex-labs/piper-tts-web";

import { WorkerPool } from "./worker-pool";
import { CPU_COUNT, DEFAULT_VOICE_ID } from "./constants";

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

export async function processSentences(sentences: string[]) {
  const tasks = sentences.map((sentence, index) => {
    console.log(`Processing sentence ${index}: ${sentence}`);
    return pool.exec((worker) =>
      worker
        .getAudio({ text: sentence, voiceId: DEFAULT_VOICE_ID })
        .then((result) => {
          console.log(
            `Finished processing sentence ${index}: ${sentence} - Result: ${result}`
          );

          if (result.type === "error") {
            console.error(
              `Error processing sentence ${index}: ${result.message}`
            );
            return null;
          }

          return result.audio;
        })
    );
  });

  const results = await Promise.all(tasks);

  // Filter out null results
  const audioBlobs = results.filter((result) => result !== null) as Blob[];

  return audioBlobs;
}

export function mergeAudioBlobs(blobs: Blob[]) {
  const blob = new Blob(blobs, { type: "audio/wav" });
  const audio = new Audio(URL.createObjectURL(blob));
  return audio;
}
