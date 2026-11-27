// Pick My Fit AI helper: a tiny Cloudflare Worker that keeps your Anthropic API key
// off the phone. The app sends {prompt, images, tier}; this calls Claude and returns {text}.
import Anthropic from "@anthropic-ai/sdk";

const MAX_IMAGES = 4;
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, x-app-key",
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {...cors, "content-type": "application/json"}});

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, {headers: cors});
    if (request.method !== "POST") return json({error: "POST only"}, 405);
    if (env.APP_KEY && request.headers.get("x-app-key") !== env.APP_KEY) return json({error: "unauthorized"}, 401);

    let body;
    try { body = await request.json(); } catch { return json({error: "bad json"}, 400); }
    if (new URL(request.url).pathname.endsWith("/fetch")) return fetchForApp(body);
    const prompt = String(body.prompt || "").slice(0, 60000);
    if (!prompt) return json({error: "empty prompt"}, 400);
    const images = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];
    const okTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    const content = [
      ...images
        .filter(i => i && okTypes.includes(i.media_type) && typeof i.data === "string" && i.data.length < 7_000_000)
        .map(i => ({type: "image", source: {type: "base64", media_type: i.media_type, data: i.data}})),
      {type: "text", text: prompt},
    ];

    const client = new Anthropic({apiKey: env.ANTHROPIC_API_KEY});
    try {
      const response = await client.beta.messages.create({
        model: env.MODEL || "claude-opus-5-5",
        max_tokens: 4000,
        output_config: {effort: body.tier === "quick" ? "low" : "medium"},
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: "You are the styling assistant inside Pick My Fit, a wardrobe app. Be friendly, short and concrete. When asked for JSON, reply with only that JSON.",
        messages: [{role: "user", content}],
      });
      if (response.stop_reason === "refusal") return json({text: "", refused: true});
      const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
      return json({text, truncated: response.stop_reason === "max_tokens"});
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return json({error: "busy"}, 429);
      if (e instanceof Anthropic.APIError) return json({error: "ai error"}, 502);
      return json({error: "server error"}, 500);
    }
  },
};

// Shop links: the phone can't read most shop pages directly (browsers block it), so this
// fetches a product page or its photo and hands it back. Only public http(s) pages, max 6 MB.
async function fetchForApp(body) {
  let url;
  try { url = new URL(String(body.url || "")); } catch { return json({error: "bad url"}, 400); }
  if (!/^https?:$/.test(url.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) return json({error: "bad url"}, 400);
  const res = await fetch(url.href, {redirect: "follow", headers: {
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
    "accept": body.binary ? "image/*" : "text/html,application/xhtml+xml", "accept-language": "en-US,en;q=0.8"}});
  if (!res.ok) return json({error: "shop said " + res.status}, 502);
  const type = (res.headers.get("content-type") || "").split(";")[0];
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > 6_000_000) return json({error: "too big"}, 413);
  if (body.binary) {
    if (!type.startsWith("image/")) return json({error: "not an image"}, 415);
    let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return json({contentType: type, body: btoa(s), url: res.url});
  }
  return json({contentType: type, body: new TextDecoder().decode(buf), url: res.url});
}
