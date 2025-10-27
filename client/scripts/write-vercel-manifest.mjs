// scripts/write-vercel-manifest.mjs
import { mkdirSync, cpSync, writeFileSync } from "fs";
import path from "path";

const outDir = "vercel_build"; // custom deploy output directory

// 1. Copy Vite output to a deploy folder
mkdirSync(`${outDir}/static`, { recursive: true });
cpSync("dist", `${outDir}/static`, { recursive: true });

// 2. Create Build Output API manifest
const config = {
  version: 3,
  overrides: {
    "index.html": { path: "index.html" }
  },
  routes: [
    { handle: "filesystem" },
    { src: "/.*", dest: "/index.html" }
  ]
};

writeFileSync(`${outDir}/config.json`, JSON.stringify(config, null, 2));

console.log("✅ Prepared deploy folder:", path.resolve(outDir));
