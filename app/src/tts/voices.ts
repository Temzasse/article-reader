import type { Voice } from "./types";
import voicesJSON from "./voices_static.json";

/**
 * Retrieves all available voices local cache.
 */
export function voices(): Voice[] {
  return Object.values(voicesJSON);
}
