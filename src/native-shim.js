// Outside claude.ai there is no window.claude. This gives the app the same shape:
// storage falls back to this phone (IndexedDB), and "sample" calls your own AI server.
(function(){
  const cfg = window.PICKMYFIT_CONFIG || {};
  const err = (code, message, text) => Object.assign(new Error(message || code), {code, text});
  async function blobToB64(b){
    const buf = new Uint8Array(await b.arrayBuffer()); let s = "";
    for(let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return {media_type: b.type || "image/jpeg", data: btoa(s)};
  }
  function parseJson(text){
    const tries = [text];
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/); if(fence) tries.push(fence[1]);
    const a = text.search(/[\[{]/), z = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]")); if(a >= 0 && z > a) tries.push(text.slice(a, z + 1));
    for(const t of tries){ try{ return JSON.parse(t); }catch(_){} }
    throw err("invalid_json", "Could not read the answer", text);
  }
  async function call(input, opts = {}, wantJson = false){
    if(!cfg.aiUrl) throw err("not_granted", "AI server not set up");
    const prompt = typeof input === "string" ? input : input.map(m => (m.role === "assistant" ? "Assistant: " : "") + m.content).join("\n\n");
    const images = opts.images ? await Promise.all(opts.images.slice(0, 4).map(blobToB64)) : [];
    let res;
    try{
      res = await fetch(cfg.aiUrl, {method:"POST", headers:{"content-type":"application/json", "x-app-key": cfg.appKey || ""}, signal: opts.signal,
        body: JSON.stringify({prompt: prompt + (wantJson ? "\n\nReply with only the JSON value, no other text." : ""), images, tier: opts.modelTier || "default"})});
    }catch(e){ throw err("unavailable", "No internet connection"); }
    if(res.status === 429) throw err("rate_limited", "Too many requests");
    if(!res.ok) throw err("unavailable", "AI server error " + res.status);
    const body = await res.json();
    const text = String(body.text || "");
    if(opts.onText) try{ opts.onText({text, delta:text}); }catch(_){}
    return wantJson ? parseJson(text) : {text, truncated: !!body.truncated};
  }
  const sample = (input, opts) => call(input, opts, false);
  sample.json = (input, opts) => call(input, opts, true);
  sample.limits = async () => ({maxPromptBytes: 200000, images: cfg.aiUrl ? {maxCount: 4, maxInputBytes: 5000000, mediaTypes:["image/jpeg","image/png","image/webp"]} : undefined});
  window.claude = { use: async (name) => name === "sample" ? (cfg.aiUrl ? sample : null) : null };
})();
