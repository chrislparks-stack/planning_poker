import { mkdirSync, writeFileSync, cpSync } from "fs";

mkdirSync(".vercel/output/static", { recursive: true });

// Copy the built Vite output into the static directory
cpSync("dist", ".vercel/output/static", { recursive: true });

// Write the routing config
const config = {
  version: 3,
  routes: [
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" }
  ]
};

writeFileSync(".vercel/output/config.json", JSON.stringify(config, null, 2));

console.log("✅ Build Output API manifest and static files prepared");
