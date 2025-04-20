import * as Comlink from "comlink";
import * as tts from "./tts";

let __session__: tts.TtsSession | null = null;

export async function downloadModel(
  voideId: string,
  onProgress?: (e: tts.Progress) => void
) {
  const storedModels = await tts.stored();
  if (storedModels.includes(voideId)) return;

  return await tts.download(voideId, onProgress);
}

export async function deleteModels() {
  return await tts.flush();
}

export async function getVoices() {
  return await tts.voices();
}

export async function getModels() {
  return await tts.stored();
}

export async function getSession(voiceId: string) {
  if (!__session__) {
    __session__ = new tts.TtsSession({ voiceId });
  }

  if (__session__.voiceId !== voiceId) {
    __session__.voiceId = voiceId;
    await __session__.init();
  }

  return __session__;
}

export async function getAudio({
  text,
  voiceId,
}: {
  text: string;
  voiceId: string;
}) {
  const session = await getSession(voiceId);

  try {
    const result = await session.predict(text);

    if (result instanceof Blob) {
      return { type: "result", audio: result };
    }

    return { type: "error", message: "Invalid result type" };
  } catch (error: any) {
    return { type: "error", message: error.message };
  }
}

const api = {
  downloadModel,
  deleteModels,
  getModels,
  getVoices,
  getAudio,
};

Comlink.expose(api);
