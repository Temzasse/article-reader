// @ts-check
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

async function main() {
  console.log("Starting...");
  const url =
    "https://www.smashingmagazine.com/2025/04/how-build-business-case-promote-accessibility-b2b-products/";
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (TTS Reader)",
      Accept: "text/html",
    },
  });

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document, {});
  const article = reader.parse();

  if (article) {
    console.log("Title:", article.title);
    console.log("Content:", fixMissingSentenceSpacing(article.textContent));
  }
}

function fixMissingSentenceSpacing(text) {
  return text.replace(/([a-z])\.([A-Z])/g, "$1. $2");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    console.log("Done");
  });
