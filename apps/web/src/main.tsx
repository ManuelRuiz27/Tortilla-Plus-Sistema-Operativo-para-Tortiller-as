import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./app/app-shell";
import "./styles/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <AppShell />
  </StrictMode>
);
