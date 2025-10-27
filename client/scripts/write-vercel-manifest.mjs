import fs from "fs";

fs.rmSync(".vercel/output", { recursive: true, force: true });
fs.mkdirSync(".vercel/output/static", { recursive: true });
fs.cpSync("dist", ".vercel/output/static", { recursive: true });

const manifest = {
  version: 3,
  routes: [
    { handle: "filesystem" },
    { src: "/.*", dest: "/index.html" }
  ]
};

fs.writeFileSync(".vercel/output/config.json", JSON.stringify(manifest, null, 2));
console.log("Vercel Build Output API manifest created");
