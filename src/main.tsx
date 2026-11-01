import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@xyflow/react/dist/style.css";
import "./index.css";
import "./app/theme";
import { App } from "./app/App";

async function start() {
  // Outside Tauri (plain `npm run dev` in a browser), fake the Rust commands so screens can be reviewed.
  if (import.meta.env.DEV && !("__TAURI_INTERNALS__" in window)) {
    (await import("./dev/mockBackend")).installMockBackend();
  }
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

start();
