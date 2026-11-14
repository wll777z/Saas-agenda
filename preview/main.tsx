import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "../src/components/App";
import "../src/app/globals.css";
import "../src/app/redesign.css";
import "../src/app/product-features.css";
const root = document.getElementById("root")!;
if (root.dataset.ssr === "true") hydrateRoot(root, <App />);
else createRoot(root).render(<App />);
