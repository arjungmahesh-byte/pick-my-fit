// Pick My Fit shop-link helper (Cloudflare Worker, free plan).
// The iPhone website can't read shop pages directly (browsers block it), so it asks this helper.
// Paste this whole file into a Cloudflare Worker and press Deploy. Nothing else to set up.
// Optional: add a secret named SCRAPER_KEY (a ScraperAPI key) so shops that block Cloudflare (Max, Zara, H&M, SHEIN) work too.

const ALLOWED_ORIGINS = [
  "https://arjungmahesh-byte.github.io",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
];
const MAX_BYTES = 6 * 1024 * 1024;
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const WRAP_PARAMS = ["adjust_redirect", "adj_redirect", "redirect", "redirect_url", "redirectUrl", "browser_fallback_url", "fallback_url", "deep_link_value", "url", "u", "target", "dest", "destination"];

function cors(origin) {
  const ok = ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o + ":"));
  return {
    "access-control-allow-origin": ok ? origin : ALLOWED_ORIGINS[0],
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-app-key",
    "access-control-max-age": "86400",
    "vary": "origin",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...cors(origin) } });
}

function safeUrl(s) {
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":")) return null;
  return u;
}

// Tracking links (like ty.gl) hide the real shop link inside a parameter.
function unwrap(u) {
  for (const p of WRAP_PARAMS) {
    const v = u.searchParams.get(p);
    if (v && /^https?:\/\//i.test(v)) { const inner = safeUrl(v); if (inner) return inner; }
  }
  return null;
}

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function blocked(status, text) {
  if (status === 403 || status === 429 || status === 503 || status >= 520) return true;
  return text.length < 20000 && /bm-verify|__cf_chl|Just a moment|Access Denied|captcha|challenge-platform/i.test(text);
}

async function viaScraper(u, binary, key) {
  const api = "https://api.scraperapi.com/?api_key=" + encodeURIComponent(key) + "&country_code=ae&url=" + encodeURIComponent(u.href);
  const r = await fetch(api);
  const buf = await r.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new Error("too big");
  const contentType = r.headers.get("content-type") || "";
  const isText = !binary && /text|html|json|xml/i.test(contentType || "text/html");
  return { status: r.status, contentType, url: u.href, via: "scraper", body: isText ? new TextDecoder().decode(buf) : toBase64(buf) };
}

async function grabOrRetry(u, binary, env) {
  const first = await grab(u, binary).catch(e => ({ status: 599, contentType: "", url: u.href, body: "", err: String(e && e.message || e) }));
  const key = env && env.SCRAPER_KEY;
  if (key && !binary && blocked(first.status, first.body)) {
    try { const second = await viaScraper(new URL(first.url), binary, key); if (second.status < 400) return second; } catch (_) {}
  }
  if (first.err) throw new Error(first.err);
  return first;
}

async function grab(start, binary) {
  let u = start;
  for (let hop = 0; hop < 10; hop++) {
    const inner = unwrap(u);
    if (inner && inner.href !== u.href) { u = inner; continue; }
    const r = await fetch(u.href, {
      redirect: "manual",
      headers: {
        "user-agent": UA,
        "accept": binary ? "image/avif,image/webp,image/*,*/*;q=0.8" : "text/html,application/xhtml+xml,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      const next = safeUrl(new URL(r.headers.get("location"), u).href);
      if (!next) throw new Error("bad redirect");
      u = next;
      continue;
    }
    const len = Number(r.headers.get("content-length") || 0);
    if (len > MAX_BYTES) throw new Error("too big");
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) throw new Error("too big");
    const contentType = r.headers.get("content-type") || "";
    const isText = !binary && /text|html|json|xml/i.test(contentType || "text/html");
    return {
      status: r.status,
      contentType,
      url: u.href,
      body: isText ? new TextDecoder().decode(buf) : toBase64(buf),
    };
  }
  throw new Error("too many redirects");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    const path = new URL(request.url).pathname.replace(/\/+$/, "");
    if (request.method === "GET" && (path === "" || path === "/")) return json({ ok: true, name: "Pick My Fit helper" }, 200, origin);
    if (request.method !== "POST" || path !== "/fetch") return json({ error: "not found" }, 404, origin);
    if (!ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o + ":"))) return json({ error: "not allowed" }, 403, origin);
    let body;
    try { body = await request.json(); } catch { return json({ error: "bad request" }, 400, origin); }
    const u = safeUrl(body && body.url);
    if (!u) return json({ error: "bad url" }, 400, origin);
    try {
      return json(await grabOrRetry(u, !!body.binary, env), 200, origin);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 502, origin);
    }
  },
};
