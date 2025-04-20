import { DIRECTORY } from "./constants";

export async function writeBlob(url: string, blob: Blob): Promise<void> {
  if (!url.match("https://huggingface.co")) return; // only store models

  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(DIRECTORY, {
      create: true,
    });

    const path = url.split("/").at(-1)!;
    const file = await dir.getFileHandle(path, { create: true });

    if (file.createWritable) {
      const writable = await file.createWritable();
      await writable.write(blob);
      await writable.close();
    } else if (self.WorkerGlobalScope) {
      console.log(
        "createWritable not supported, trying syncronous API with createSyncAccessHandle as we are a worker"
      );
      // use the synchronous write API to write to the file. Only works in web workers
      const writer = await file.createSyncAccessHandle();
      writer.write(await blob.arrayBuffer());
      writer.close();
    } else {
      console.error(
        "Cannot write to OPFS file using createWritable and we are not a worker, so can't use createSyncAccessHandle"
      );
      // Remove the empty file
      await dir.removeEntry(path);
    }
  } catch (e) {
    console.error(e);
  }
}

export async function removeBlob(url: string) {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(DIRECTORY);
    const path = url.split("/").at(-1)!;
    await dir.removeEntry(path);
  } catch (e) {
    console.error(e);
  }
}

export async function readBlob(url: string): Promise<Blob | undefined> {
  if (!url.match("https://huggingface.co")) return; // only read models

  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(DIRECTORY, { create: true });
    const path = url.split("/").at(-1)!;
    const fileHandle = await dir.getFileHandle(path);
    const file = await fileHandle.getFile();

    if (file.size === 0) {
      console.error("File is empty");
      // Remove the empty file
      await dir.removeEntry(path);
      return undefined;
    }

    return file;
  } catch (e) {
    console.error(e);
    return undefined;
  }
}
