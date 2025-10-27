import fs from "fs";
import path from "path";

const outDir = "dist";
const filePath = path.join(outDir, "404.html");

const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="refresh" content="0;url=/" />
    <script>
      const path = window.location.pathname + window.location.search + window.location.hash;
      window.location.replace("/?" + path);
    </script>
  </head>
  <body></body>
</html>
`;

fs.writeFileSync(filePath, html.trim());
console.log("Added 404.html redirect to /");
