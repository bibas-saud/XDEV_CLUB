import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@/styles/globals.css";
import App from "./App.jsx";

// Apply the stored theme before React mounts to avoid a flash of the
// wrong theme. Mirrors the logic in hooks/useTheme.js.
(function applyInitialTheme() {
  const stored = localStorage.getItem("xdev-theme");
  const dark =
    stored === "dark" ||
    (stored !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
})();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
