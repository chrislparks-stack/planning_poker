// scripts/write-vercel-manifest.mjs
import { mkdirSync, cpSync, writeFileSync } from "fs";

const outRoot = ".vercel/output";

// Create directories
mkdirSync(`${outRoot}/static`, { recursive: true });

// Copy Vite dist → static
cpSync("dist", `${outRoot}/static`, { recursive: true });

// Create Build Output API manifest
const config = {
  version: 3,
  overrides: {
    "index.html": { path: "index.html" }
  }
};

writeFileSync(`${outRoot}/config.json`, JSON.stringify(config, null, 2));

console.log("✅ Build Output API manifest written to .vercel/output/config.json");
