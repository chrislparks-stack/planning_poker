// scripts/add-404-redirect.js
import { writeFileSync } from "fs";
import { resolve } from "path";

const redirectHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Redirecting...</title>
    <meta http-equiv="refresh" content="0;url=/" />
    <script>
      const redirect = '/?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(redirect);
    </script>
  </head>
  <body></body>
</html>
`;

const outPath = resolve("dist", "404.html");
writeFileSync(outPath, redirectHtml.trim());
console.log("✅ 404.html redirect created:", outPath);
