import { writeFileSync, mkdirSync } from "fs";

const config = {
  version: 3,
  routes: [
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" }
  ]
};

mkdirSync(".vercel/output", { recursive: true });
writeFileSync(".vercel/output/config.json", JSON.stringify(config, null, 2));
