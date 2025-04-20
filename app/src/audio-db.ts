import { openDB } from "idb";

import { hashKey } from "./hash";

const version = 1;
const dbName = "tts-audio-cache";
const storeName = "audio";

let audioDB: Awaited<ReturnType<typeof openDB>> | null = null;

async function setAudio(id: string, blob: Blob) {
  if (!audioDB) throw new Error("Audio DB not initialized");
  await audioDB.put(storeName, { id, blob });
}

async function getAudio(id: string): Promise<Blob | undefined> {
  if (!audioDB) throw new Error("Audio DB not initialized");
  const entry = await audioDB.get(storeName, id);
  return entry?.blob;
}

async function getKey({
  text,
  voiceId,
}: {
  text: string;
  voiceId: string;
}): Promise<string> {
  const rawKey = `${voiceId}::${text}`;
  const key = await hashKey(rawKey);
  return key;
}

async function createAudioDb() {
  audioDB = await openDB(dbName, version, {
    upgrade(db) {
      db.createObjectStore(storeName, { keyPath: "id" });
    },
  });
}

export const audioDb = {
  create: createAudioDb,
  get: getAudio,
  set: setAudio,
  key: getKey,
};
