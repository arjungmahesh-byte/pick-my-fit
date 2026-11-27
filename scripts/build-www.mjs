// Builds www/index.html from src/closet.html (the same file as the claude.ai version).
import fs from "fs";
const app = fs.readFileSync("src/closet.html", "utf8")
  .replace("The AI helper is turned off for this page. You can still use the color meter.", "The AI helper isn't set up in this version yet. The color meter still works.");
const head = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#eef0f4">
<title>Pick My Fit</title>
<meta name="description" content="Choose what to wear from your own closet. Add clothes from any shop link.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pick My Fit">
<meta property="og:title" content="Pick My Fit">
<meta property="og:description" content="Choose what to wear from your own closet. Add clothes from any shop link.">
<meta property="og:url" content="https://arjungmahesh-byte.github.io/pick-my-fit/">
<meta property="og:image" content="https://arjungmahesh-byte.github.io/pick-my-fit/icons/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Pick My Fit">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
<script src="version.js"></script><script>window.PMF_ML = "vendor/ml/";</script><script src="config.js"></script><script src="native-shim.js"></script>
<script src="vendor/firebase-app-compat.js"></script><script src="vendor/firebase-auth-compat.js"></script><script src="vendor/firebase-firestore-compat.js"></script>
</head><body>`;
fs.mkdirSync("www", {recursive:true});
const sw = `<script>if("serviceWorker" in navigator && location.protocol === "https:" && !window.Capacitor){navigator.serviceWorker.register("sw.js").catch(()=>{});}</script>`;
fs.writeFileSync("www/index.html", head + app + `<script src="accounts.js"></script>` + sw + "</body></html>");
for(const f of ["config.js", "native-shim.js", "accounts.js", "manifest.webmanifest", "sw.js"]) fs.copyFileSync("src/" + f, "www/" + f);
fs.mkdirSync("www/icons", {recursive:true});
fs.mkdirSync("www/vendor", {recursive:true});
for(const f of ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]) fs.copyFileSync("node_modules/firebase/" + f, "www/vendor/" + f);
for(const f of fs.readdirSync("src/icons")) fs.copyFileSync("src/icons/" + f, "www/icons/" + f);
fs.writeFileSync("www/version.js", `window.PMF_BUILD = ${Number(process.env.BUILD_NUM) || 0};\n`);
fs.mkdirSync("www/vendor/ml", {recursive:true});
for(const f of ["ort.wasm.min.js", "ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) fs.copyFileSync("node_modules/onnxruntime-web/dist/" + f, "www/vendor/ml/" + f);
fs.copyFileSync("src/models/u2netp.onnx", "www/vendor/ml/u2netp.onnx");   // U-2-Net small model, Apache-2.0 (github.com/xuebinqin/U-2-Net)
console.log("www/index.html built");
