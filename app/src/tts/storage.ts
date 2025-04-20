import { PATH_MAP, HF_BASE, DIRECTORY } from "./constants";
import { fetchBlob } from "./http";
import { removeBlob, writeBlob } from "./opfs";
import type { ProgressCallback, VoiceId } from "./types";

/**
 * Prefetch a model for later use
 */
export async function download(
  voiceId: VoiceId,
  callback?: ProgressCallback
): Promise<void> {
  const path = PATH_MAP[voiceId];
  const urls = [`${HF_BASE}/${path}`, `${HF_BASE}/${path}.json`];

  await Promise.all(
    urls.map(async (url) => {
      const blob = await fetchBlob(
        url,
        url.endsWith(".onnx") ? callback : undefined
      );

      await writeBlob(url, blob);
    })
  );
}

/**
 * Remove a model from opfs
 */
export async function remove(voiceId: VoiceId) {
  const path = PATH_MAP[voiceId];
  const urls = [`${HF_BASE}/${path}`, `${HF_BASE}/${path}.json`];

  await Promise.all(urls.map(removeBlob));
}

/**
 * Get all stored models
 */
export async function stored(): Promise<VoiceId[]> {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(DIRECTORY, { create: true });
  const result: VoiceId[] = [];

  // @ts-expect-error: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/keys
  for await (const name of dir.keys()) {
    const key = name.split(".")[0];
    if (name.endsWith(".onnx") && key in PATH_MAP) {
      result.push(key as VoiceId);
    }
  }

  return result;
}

/**
 * Delete the models directory
 */
export async function flush() {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(DIRECTORY, { recursive: true });
  } catch (e) {
    console.error(e);
  }
}
