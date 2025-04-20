import { createRoot } from "react-dom/client";

import "./index.css";
import { Root } from "./root.tsx";
import { audioDb } from "./audio-db.ts";

async function init() {
  await audioDb.create();
  createRoot(document.getElementById("root")!).render(<Root />);
}

init().catch((error) => {
  console.error("Error initializing the app:", error);
});
