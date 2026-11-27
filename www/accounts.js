// Pick My Fit accounts: lets people sign in (email) or just pick a nickname, and lets the
// app owner see who uses the app. Only active when PICKMYFIT_CONFIG.firebase is filled in.
(function(){
  const cfg = window.PICKMYFIT_CONFIG || {};
  if (!cfg.firebase || !window.firebase) return;
  const app = firebase.initializeApp(cfg.firebase);
  const auth = firebase.auth(), db = firebase.firestore();
  const owner = String(cfg.ownerEmail || "").toLowerCase();
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const platform = window.Capacitor ? (window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || "app" : (navigator.standalone || matchMedia("(display-mode: standalone)").matches ? "home-screen" : "web");
  let me = null, gateEl = null, gateNext = null;

  const css = document.createElement("style");
  css.textContent = `
  .acct-btn{border:1.5px solid var(--line);background:var(--panel);border-radius:999px;padding:6px 12px;font-weight:700;font-size:.78rem;min-height:34px;max-width:40vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gate{position:fixed;inset:0;z-index:40;background:var(--bg);overflow:auto;padding-block:calc(24px + env(safe-area-inset-top,0px)) calc(24px + env(safe-area-inset-bottom,0px));padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px))}
  .gate .in{max-width:420px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
  .gate h1{font-family:var(--display);font-size:2rem;margin:0;letter-spacing:-.02em}.gate h1 span{color:var(--accent)}
  .gate .err{color:var(--bad);font-size:.85rem;margin:0}
  .ulist{display:flex;flex-direction:column;gap:8px}
  .urow{display:flex;justify-content:space-between;gap:10px;background:var(--panel);border-radius:12px;padding:10px 12px;font-size:.85rem}
  .urow b{display:block}.urow span{color:var(--muted);font-size:.75rem}
  .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .stats div{background:var(--panel);border-radius:12px;padding:10px;text-align:center}.stats b{display:block;font-family:var(--display);font-size:1.4rem;font-variant-numeric:tabular-nums}`;
  document.head.append(css);

  function gate(mode = "start", msg = ""){
    if (!gateEl){ gateEl = document.createElement("div"); gateEl.className = "gate"; gateEl.setAttribute("role","dialog"); document.body.append(gateEl); }
    gateEl.hidden = false;
    gateEl.innerHTML = `<div class="in">
      <h1>Pick My <span>Fit</span></h1>
      <p class="muted" style="margin:0">Snap your clothes, add shop finds and build outfits.</p>
      <div class="field"><label for="g-nick">Your name or nickname</label><input id="g-nick" maxlength="30" placeholder="e.g. Sam" autocomplete="nickname"></div>
      <div class="field"><label for="g-code">Invite code</label><input id="g-code" maxlength="12" placeholder="e.g. K7P2QX" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase;letter-spacing:.08em"></div>
      ${mode === "email" ? `
        <div class="field"><label for="g-email">Email</label><input id="g-email" type="email" autocomplete="email" inputmode="email"></div>
        <div class="field"><label for="g-pass">Password (6+ characters)</label><input id="g-pass" type="password" autocomplete="current-password"></div>
        <button class="btn" id="g-signin">Sign in</button>
        <button class="btn ghost" id="g-create">Create account</button>
        <button class="btn line" id="g-back">Back</button>`
      : `<button class="btn" id="g-nickgo">Start with my nickname</button>
        <button class="btn ghost" id="g-email-mode">Sign in with email instead</button>`}
      ${msg ? `<p class="err" role="alert">${esc(msg)}</p>` : ""}
      <p class="small muted" style="margin:0">The app's owner can see your nickname or email, when you joined and how often you use the app. Your clothes and photos stay on this phone and aren't uploaded.</p>
    </div>`;
    const nick = () => (gateEl.querySelector("#g-nick").value || "").trim().slice(0, 30);
    const code = () => (gateEl.querySelector("#g-code").value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    const keepCode = () => { if (code()) sessionStorage.setItem("pmf_code", code()); else sessionStorage.removeItem("pmf_code"); };
    const run = async (fn) => { try { await fn(); } catch (e) { gate(mode, friendly(e)); } };
    gateEl.querySelector("#g-nickgo")?.addEventListener("click", () => run(async () => { if (!nick()) throw {code:"nick"}; if (!code()) throw {code:"invite"}; sessionStorage.setItem("pmf_nick", nick()); keepCode(); await auth.signInAnonymously(); }));
    gateEl.querySelector("#g-email-mode")?.addEventListener("click", () => gate("email"));
    gateEl.querySelector("#g-back")?.addEventListener("click", () => gate("start"));
    const em = () => gateEl.querySelector("#g-email").value.trim(), pw = () => gateEl.querySelector("#g-pass").value;
    gateEl.querySelector("#g-signin")?.addEventListener("click", () => run(async () => { if (nick()) sessionStorage.setItem("pmf_nick", nick()); keepCode(); await auth.signInWithEmailAndPassword(em(), pw()); }));
    gateEl.querySelector("#g-create")?.addEventListener("click", () => run(async () => { if (!nick()) throw {code:"nick"}; sessionStorage.setItem("pmf_nick", nick()); keepCode(); await auth.createUserWithEmailAndPassword(em(), pw()); }));
  }
  function friendly(e){
    const c = e && e.code || "";
    if (c === "nick") return "Type a name or nickname first.";
    if (c === "invite") return "Type your invite code. Ask the person who sent you the app for one.";
    if (c.includes("invalid-email")) return "That email doesn't look right.";
    if (c.includes("weak-password")) return "Use a password with at least 6 characters.";
    if (c.includes("email-already-in-use")) return "That email already has an account. Tap Sign in.";
    if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "Email or password is wrong.";
    if (c.includes("network")) return "No internet connection. Connect and try again.";
    return "Something went wrong. Try again.";
  }

  async function touch(user){
    const ref = db.collection("users").doc(user.uid);
    const nick = sessionStorage.getItem("pmf_nick"); sessionStorage.removeItem("pmf_nick");
    const code = sessionStorage.getItem("pmf_code"); sessionStorage.removeItem("pmf_code");
    const now = firebase.firestore.FieldValue.serverTimestamp(), inc = firebase.firestore.FieldValue.increment;
    let snap = null; try { snap = await ref.get(); } catch (e) { if (!String(e && e.code).includes("permission")) { offline(user); return; } }
    const base = {lastSeen: now, opens: inc(1), platform, email: user.email || null};
    if (nick) base.nickname = nick;
    if (!snap || !snap.exists){ base.joined = now; if (code) base.invite = code; }
    try { await ref.set(base, {merge: true}); }
    catch (e) {
      if (!String(e && e.code).includes("permission")) { offline(user); return; }
      // not a member: the invite code was missing, wrong or stopped
      const anon = user.isAnonymous; try { if (anon) await user.delete(); } catch (_) {} await auth.signOut().catch(() => {});
      gateNext = [anon ? "start" : "email", code ? "That invite code doesn't work. Check it, or ask for a new one." : "Type your invite code to join."];
      gate(gateNext[0], gateNext[1]); return;
    }
    const d = (await ref.get().catch(() => null))?.data() || {};
    me = {uid: user.uid, email: user.email, nickname: d.nickname || user.email || "You"};
    if (gateEl) gateEl.hidden = true;
    button();
  }
  // no connection: let a known member in, details sync next time
  function offline(user){ me = {uid: user.uid, email: user.email, nickname: user.email || "You"}; if (gateEl) gateEl.hidden = true; button(); }
  document.addEventListener("pmf:event", e => {
    if (!me) return; const t = String(e.detail && e.detail.type || ""); if (!/^[a-z_]{1,20}$/.test(t)) return;
    db.collection("users").doc(me.uid).set({["count_" + t]: firebase.firestore.FieldValue.increment(1)}, {merge: true}).catch(() => {});
  });

  function button(){
    let b = document.querySelector(".acct-btn");
    if (!b){ b = document.createElement("button"); b.className = "acct-btn"; b.addEventListener("click", sheet); document.querySelector("header.top")?.append(b); }
    b.textContent = me ? me.nickname : "Sign in";
    const sync = document.getElementById("sync"); if (sync) sync.hidden = true;
  }
  async function sheet(){
    let isOwner = !!(me && me.email && owner && me.email.toLowerCase() === owner);
    // no email in the code: the rules only let the owner list everyone, so try it
    if (!isOwner && !owner && me && me.email){ try { await db.collection("users").limit(1).get(); isOwner = true; } catch (_) {} }
    let bg = document.createElement("div"); bg.className = "sheet-bg"; document.body.append(bg);
    bg.addEventListener("click", e => { if (e.target === bg) bg.remove(); });
    const draw = (inner) => bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="stack">
      <div class="row between"><h2>${isOwner ? "My users" : "Your account"}</h2><button class="btn sm ghost" id="a-close">Close</button></div>${inner}
      ${window.Capacitor ? `<button class="btn line" id="a-upd">Check for updates <span class="small muted">(version 1.0.${Number(window.PMF_BUILD) || 0})</span></button>` : ""}
      <button class="btn line" id="a-out">Sign out</button></div></div>`;
    const wire = () => { bg.querySelector("#a-close").onclick = () => bg.remove(); bg.querySelector("#a-out").onclick = async () => { bg.remove(); await auth.signOut(); }; const u = bg.querySelector("#a-upd"); if (u) u.onclick = () => { bg.remove(); window.pmfCheckUpdate && window.pmfCheckUpdate(true); }; };
    if (!isOwner){ draw(`<p style="margin:0">Signed in as <b>${esc(me ? me.nickname : "")}</b>${me && me.email ? ` (${esc(me.email)})` : ""}.</p><p class="small muted" style="margin:0">Your clothes and photos stay on this phone.</p>`); return wire(); }
    draw(`<p class="muted">Loading users…</p>`); wire();
    try {
      const snap = await db.collection("users").orderBy("lastSeen", "desc").limit(500).get();
      const us = snap.docs.map(d => ({...d.data(), _id: d.id}));
      const inv = (await db.collection("invites").orderBy("created", "desc").limit(100).get().catch(() => ({docs: []}))).docs.map(d => ({...d.data(), _id: d.id}));
      const day = Date.now() - 864e5, week = Date.now() - 7*864e5;
      const t = u => u.lastSeen && u.lastSeen.toDate ? u.lastSeen.toDate() : null;
      const fmt = d => d ? d.toLocaleString([], {dateStyle:"medium", timeStyle:"short"}) : "–";
      draw(`<div class="stats"><div><b>${us.length}</b><span class="small muted">users</span></div><div><b>${us.filter(u => t(u) && t(u) > day).length}</b><span class="small muted">today</span></div><div><b>${us.filter(u => t(u) && t(u) > week).length}</b><span class="small muted">this week</span></div></div>
        <h3 style="margin:6px 0 0">Invite codes</h3>
        <p class="small muted" style="margin:0">Only people with a code can join. Send a code with the app link. Stop a code and nobody new can join with it.</p>
        <button class="btn" id="a-newcode">Make a new code</button>
        <div class="ulist">${inv.map(c => `<div class="urow"><div><b style="letter-spacing:.08em">${esc(c._id)}</b><span>${c.revoked ? "stopped" : "active"} · ${us.filter(u => u.invite === c._id).length} joined</span></div>
          <div style="display:flex;gap:6px;align-items:center">${c.revoked ? "" : `<button class="btn sm line" data-share="${esc(c._id)}">Send</button><button class="btn sm ghost" data-stop="${esc(c._id)}">Stop</button>`}</div></div>`).join("") || `<p class="small muted" style="margin:0">No codes yet.</p>`}</div>
        <h3 style="margin:6px 0 0">People</h3>
        <div class="ulist">${us.map(u => `<div class="urow"><div><b>${esc(u.nickname || u.email || "No name")}</b><span>${esc(u.email || "nickname only")} · ${esc(u.platform || "")}${u.invite ? " · code " + esc(u.invite) : ""}</span></div>
          <div style="text-align:right"><span>last seen ${esc(fmt(t(u)))}</span><br><span>${Number(u.opens)||0} opens · ${Number(u.count_item_added)||0} clothes · ${Number(u.count_outfit_saved)||0} outfits</span>
          ${u._id !== me.uid ? `<br><button class="btn sm ghost" data-remove="${esc(u._id)}">Remove</button>` : ""}</div></div>`).join("") || `<p class="muted">No users yet.</p>`}</div>`);
      const again = () => { bg.remove(); sheet(); };
      bg.querySelector("#a-newcode").onclick = async () => {
        const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const r = crypto.getRandomValues(new Uint32Array(6)); const c = [...r].map(v => A[v % A.length]).join("");
        await db.collection("invites").doc(c).set({created: firebase.firestore.FieldValue.serverTimestamp(), revoked: false}).catch(() => {}); again(); };
      bg.querySelectorAll("[data-stop]").forEach(b => b.onclick = async () => { await db.collection("invites").doc(b.dataset.stop).set({revoked: true}, {merge: true}).catch(() => {}); again(); });
      bg.querySelectorAll("[data-remove]").forEach(b => b.onclick = async () => { await db.collection("users").doc(b.dataset.remove).delete().catch(() => {}); again(); });
      bg.querySelectorAll("[data-share]").forEach(b => b.onclick = async () => {
        const text = `Join me on Pick My Fit! Open https://arjungmahesh-byte.github.io/pick-my-fit/ and use invite code ${b.dataset.share}`;
        try { if (navigator.share) await navigator.share({text}); else { await navigator.clipboard.writeText(text); b.textContent = "Copied"; } } catch (_) {} });
      wire();
    } catch (e) { draw(`<p>Couldn't load users. Check the Firestore rules in docs/ACCOUNTS.md.</p>`); wire(); }
  }

  auth.onAuthStateChanged(user => {
    if (user){ touch(user); }
    else { me = null; const g = gateNext || ["start", ""]; gateNext = null; gate(g[0], g[1]); }
  });
})();
