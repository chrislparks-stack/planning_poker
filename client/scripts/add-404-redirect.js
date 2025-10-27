// scripts/add-404-redirect.js
import { writeFileSync } from "fs";
import { resolve } from "path";

const redirectHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="refresh" content="0; url=/?redirect=${encodeURIComponent(
  window.location.pathname + window.location.search
)}" />
    <script>
      const dest = '/?redirect=' + encodeURIComponent(location.pathname + location.search);
      location.replace(dest);
    </script>
  </head>
</html>
`;

const outPath = resolve("dist", "404.html");
writeFileSync(outPath, redirectHtml.trim());
console.log("✅ 404.html redirect created:", outPath);
