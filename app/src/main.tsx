import { createRoot } from "react-dom/client";
import "./index.css";
import { Root } from "./root.tsx";

console.log("Starting app...");

createRoot(document.getElementById("root")!).render(<Root />);
