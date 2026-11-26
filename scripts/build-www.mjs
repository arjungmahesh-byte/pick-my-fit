// Builds www/index.html from src/closet.html (the same file as the claude.ai version).
import fs from "fs";
const app = fs.readFileSync("src/closet.html", "utf8")
  .replace("The AI helper is turned off for this page. You can still use the color meter.", "The AI helper isn't set up in this version yet. The color meter still works.");
const head = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#eef0f4">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
<script src="config.js"></script><script src="native-shim.js"></script>
</head><body>`;
fs.mkdirSync("www", {recursive:true});
fs.writeFileSync("www/index.html", head + app + "</body></html>");
for(const f of ["config.js", "native-shim.js"]) fs.copyFileSync("src/" + f, "www/" + f);
console.log("www/index.html built");
