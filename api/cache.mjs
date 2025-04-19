import fs from "fs";
import path from "path";

const ROBOTS_CACHE_PATH = path.join(__dirname, "robots-cache.json");
const CONTENT_CACHE_PATH = path.join(__dirname, "content-cache.json");
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

let robotsCache = {};
let contentCache = {};

let saveTimeout = null;

// Load cache from disk asynchronously
async function loadCache() {
  try {
    const [robotsData, contentData] = await Promise.all([
      fs.promises.readFile(ROBOTS_CACHE_PATH, "utf-8").catch(() => "{}"),
      fs.promises.readFile(CONTENT_CACHE_PATH, "utf-8").catch(() => "{}"),
    ]);
    robotsCache = JSON.parse(robotsData);
    contentCache = JSON.parse(contentData);
  } catch (err) {
    console.error("Error loading cache:", err);
  }
}

// Save cache to disk asynchronously with debouncing
async function scheduleSaveCache() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(async () => {
    try {
      await Promise.all([
        fs.promises.writeFile(
          ROBOTS_CACHE_PATH,
          JSON.stringify(robotsCache, null, 2)
        ),
        fs.promises.writeFile(
          CONTENT_CACHE_PATH,
          JSON.stringify(contentCache, null, 2)
        ),
      ]);
    } catch (err) {
      console.error("Error saving cache:", err);
    } finally {
      saveTimeout = null;
    }
  }, 1000); // Debounce interval: 1 second
}

export const cache = {
  loadCache,
  scheduleSaveCache,
  getRobotsCache: () => robotsCache,
  getContentCache: () => contentCache,
  setRobotsCache: (newCache) => {
    robotsCache = newCache;
    scheduleSaveCache();
  },
  setContentCache: (newCache) => {
    contentCache = newCache;
    scheduleSaveCache();
  },
  CACHE_TTL_MS,
};
