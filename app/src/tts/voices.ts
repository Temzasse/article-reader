import type { Voice } from "./types";
import voicesData from "../assets/voices_static.json";

/**
 * Retrieves all available voices local cache.
 */
export function voices(): Voice[] {
  return Object.values(voicesData);
}
