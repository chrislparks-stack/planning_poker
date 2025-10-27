import { mkdirSync, cpSync, writeFileSync } from "fs";
import path from "path";

const outputDir = ".vercel/output";

// 1. Copy Vite build into `.vercel/output/static`
mkdirSync(path.join(outputDir, "static"), { recursive: true });
cpSync("dist", path.join(outputDir, "static"), { recursive: true });

// 2. Write the routing config
const config = {
  version: 3,
  routes: [
    { handle: "filesystem" },
    { src: "/.*", dest: "/index.html" }
  ]
};

writeFileSync(
  path.join(outputDir, "config.json"),
  JSON.stringify(config, null, 2)
);

console.log("✅ Prepared Build Output API bundle in .vercel/output");
