// scripts/add-404-redirect.js
import { copyFileSync } from "fs";
import { resolve } from "path";

// Copy index.html directly to 404.html
const src = resolve("dist", "index.html");
const dest = resolve("dist", "404.html");

copyFileSync(src, dest);
console.log("✅ 404.html rewrite created:", dest);
