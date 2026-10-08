// Essai Nest Hub (apps/cast/README.md) : une recette en pages, au doigt et à la voix.
// Pages : ingrédients, une étape par page, « Bon appétit ». Sur le Hub, chaque page est aussi un élément
// d'une file média (un silence en boucle) : « Ok Google, suivant / précédent » arrive au récepteur comme
// une commande de file, et l'appli reste ouverte tant que « ça joue ».
// ?preview : sans Cast, dans un navigateur (flèches, glisser, toucher).

const NS = "urn:x-cast:app.mijote";
const PREVIEW = new URLSearchParams(location.search).has("preview");
const SILENCE = new URL("silence.wav", location.href).href;

const $ = (s) => document.querySelector(s);
const started = Date.now();
let recipe = null;
let pages = [];
let page = 0;
let context = null;
let player = null;

// —— Journal à l'écran (ce que l'essai doit observer) ——
const lines = [];
function log(msg) {
  const t = Math.round((Date.now() - started) / 1000);
  lines.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")} ${msg}`);
  if (lines.length > 16) lines.shift();
  $("#log").textContent = lines.join("\n");
  console.log("[mijote]", msg);
}
$("#log").addEventListener("click", () => $("#log").classList.toggle("full"));
setInterval(() => log(`toujours là · ${pages[page]?.label ?? "—"}`), 5 * 60 * 1000);

// —— Pages ——
function buildPages(r) {
  const babyStep = r.baby ? r.steps.findIndex((s) => /b[ée]b[ée]/i.test(s)) : -1;
  const ps = [{ kind: "ings", label: "Ingrédients" }];
  r.steps.forEach((text, i) => ps.push({ kind: "step", label: `Étape ${i + 1}`, n: i + 1, text, baby: i === babyStep }));
  if (r.baby && babyStep < 0) ps.push({ kind: "baby", label: "Portion bébé" });
  ps.push({ kind: "end", label: "Bon appétit" });
  return ps;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// Les durées (« 1 h 30 », « 20 min ») ressortent : ce seront les minuteurs.
const DUR = /\b\d+(?:[,.]\d+)?\s?(?:h(?:eures?)?(?:\s?\d{2})?|min(?:utes?)?)(?!\p{L})/gu;
const fmt = (s) => esc(s).replace(DUR, (m) => `<span class="dur">${m}</span>`);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const babyBox = (b) => `<div class="baby"><b>Portion bébé</b> · ${esc(b.when)}.<br>${esc(cap(b.texture))}. ${esc(cap(b.amount))}.</div>`;

function body(p) {
  if (p.kind === "ings") {
    const many = recipe.ingredients.length > 14 ? " many" : "";
    const lis = recipe.ingredients.map((i) => `<li><span class="q">${esc(i.qty)}</span> ${esc(i.name)}${i.note ? ` <span class="n">(${esc(i.note)})</span>` : ""}</li>`);
    return `<h2 class="ings-title">Ingrédients</h2><div class="meta">${esc(recipe.meta ?? "")}</div><ul class="ings${many}">${lis.join("")}</ul>`;
  }
  if (p.kind === "step") {
    const size = p.text.length > 220 ? " s" : p.text.length > 140 ? " m" : "";
    return `<div class="step"><div class="num">${p.n}</div><div class="text${size}">${fmt(p.text)}</div></div>${p.baby ? babyBox(recipe.baby) : ""}`;
  }
  if (p.kind === "baby") return babyBox(recipe.baby);
  return `<div class="end">Bon appétit !<small>${esc(recipe.title)}</small></div>`;
}

function render(i) {
  page = Math.max(0, Math.min(pages.length - 1, i));
  const p = pages[page];
  $("#app").innerHTML = `
    <header><h1>${esc(recipe.title)}</h1><span class="where">${p.kind === "step" ? `${p.n} / ${recipe.steps.length}` : esc(p.label)}</span></header>
    <div class="dots">${pages.map((_, k) => `<i class="${k <= page ? "on" : ""}"></i>`).join("")}</div>
    <main>${body(p)}</main>
    <nav><button class="prev"${page === 0 ? " disabled" : ""}>‹ Précédent</button><button class="next"${page === pages.length - 1 ? " disabled" : ""}>Suivant ›</button></nav>`;
}

// —— Une recette : affichée, et chargée en file média sur le Hub ——
function show(r, start = 0) {
  recipe = r;
  pages = buildPages(r);
  render(start);
  if (!player) return;
  const M = cast.framework.messages;
  const items = pages.map((p, i) => {
    const media = new M.MediaInformation();
    media.contentId = SILENCE;
    media.contentUrl = SILENCE;
    media.contentType = "audio/wav";
    media.streamType = M.StreamType.BUFFERED;
    media.metadata = new M.GenericMediaMetadata();
    media.metadata.title = `${p.label} · ${r.title}`;
    media.customData = { page: i };
    const item = new M.QueueItem();
    item.media = media;
    item.autoplay = true;
    return item;
  });
  const req = new M.LoadRequestData();
  req.media = items[start].media;
  req.autoplay = true;
  req.queueData = new M.QueueData();
  req.queueData.items = items;
  req.queueData.startIndex = start;
  // Le silence boucle sur la même page : on ne change de page que sur commande.
  req.queueData.repeatMode = M.RepeatMode.REPEAT_SINGLE;
  player.load(req).then(
    () => log(`file prête : ${items.length} pages`),
    (err) => log(`échec du chargement : ${err?.detailedErrorCode ?? err?.reason ?? err}`),
  );
}

function go(delta, how) {
  if (!pages.length) return;
  const target = Math.max(0, Math.min(pages.length - 1, page + delta));
  if (target === page) return;
  log(`${how} → ${pages[target].label}`);
  render(target);
  if (!player) return;
  // La file suit la page touchée : la prochaine commande vocale part de la bonne page.
  try {
    const item = player.getQueueManager()?.getItems()[target];
    const req = new cast.framework.messages.QueueUpdateRequestData();
    req.currentItemId = item.itemId;
    player.sendLocalMediaRequest(req);
  } catch (err) {
    log(`file non suivie : ${err?.message ?? err}`);
  }
}

// La page vient de la file (voix, ou expéditeur) : on l'affiche.
function syncFromPlayer(src) {
  const p = player.getMediaInformation()?.customData?.page;
  if (typeof p === "number" && p !== page && pages[p]) {
    log(`${src} → ${pages[p].label}`);
    render(p);
  }
}

// —— Toucher, glisser, clavier ——
let down = null;
addEventListener("pointerdown", (e) => (down = { x: e.clientX }));
addEventListener("pointerup", (e) => {
  const start = down;
  down = null;
  if (!start || e.target.closest("[data-notap]")) return;
  const dx = e.clientX - start.x;
  if (Math.abs(dx) > 60) return go(dx < 0 ? 1 : -1, "glisser");
  if (e.target.closest(".prev")) return go(-1, "bouton");
  if (e.target.closest(".next")) return go(1, "bouton");
  go(e.clientX < innerWidth / 3 ? -1 : 1, "toucher");
});
addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === " ") go(1, "clavier");
  if (e.key === "ArrowLeft") go(-1, "clavier");
});

const demo = () => fetch("demo.json").then((r) => r.json());

if (PREVIEW) {
  log("aperçu sans Cast : ← →, glisser ou toucher");
  demo().then((r) => show(r));
} else {
  context = cast.framework.CastReceiverContext.getInstance();
  player = context.getPlayerManager();
  player.setMediaElement($("#audio"));

  const E = cast.framework.events.EventType;
  player.addEventListener(E.PLAYER_LOAD_COMPLETE, () => syncFromPlayer("file"));
  player.addEventListener(E.MEDIA_STATUS, () => syncFromPlayer("statut"));
  player.addEventListener(E.ERROR, (e) => log(`erreur lecteur ${e.detailedErrorCode ?? ""}`));

  // Ce que l'Assistant (ou Gemini) envoie vraiment : c'est la question de l'essai.
  const T = cast.framework.messages.MessageType;
  for (const type of ["QUEUE_UPDATE", "QUEUE_NEXT", "QUEUE_PREV", "PLAY", "PAUSE", "STOP", "SEEK", "FOCUS_STATE", "USER_ACTION"]) {
    if (!T[type]) continue;
    player.setMessageInterceptor(T[type], (data) => {
      const extra = ["jump", "currentItemId", "state", "userAction"].filter((k) => data?.[k] != null).map((k) => ` ${k}=${data[k]}`).join("");
      log(`demande ${type}${extra}${data?.senderId ? ` de ${String(data.senderId).slice(0, 12)}` : ""}`);
      return data;
    });
  }

  const S = cast.framework.system.EventType;
  for (const k of ["READY", "SENDER_CONNECTED", "SENDER_DISCONNECTED", "VISIBILITY_CHANGED", "STANDBY_CHANGED", "SHUTDOWN", "ERROR"]) {
    if (S[k]) context.addEventListener(S[k], (e) => log(`système ${k}${e?.reason ? ` (${e.reason})` : ""}`));
  }

  context.addCustomMessageListener(NS, (e) => {
    const d = e.data ?? {};
    if (d.type !== "recipe" || !d.recipe) return log(`message inconnu ${JSON.stringify(d).slice(0, 60)}`);
    log(`recette reçue : ${d.recipe.title}`);
    show(d.recipe, d.page ?? 0);
    context.sendCustomMessage(NS, e.senderId, { type: "ok", pages: pages.length });
  });

  const C = cast.framework.messages.Command;
  context.start({
    touchScreenOptimizedApp: true,
    skipPlayersLoad: true,
    disableIdleTimeout: true,
    supportedCommands: C.ALL_BASIC_MEDIA | C.QUEUE_NEXT | C.QUEUE_PREV,
    customNamespaces: { [NS]: cast.framework.system.MessageType.JSON },
  });
  log("récepteur démarré");
  // Lancé sans recette (CaC Tool, ou script sans --recipe) : la démo au bout de 3 s.
  setTimeout(() => recipe || demo().then((r) => recipe || show(r)), 3000);
}
