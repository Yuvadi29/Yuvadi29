#!/usr/bin/env node
/**
 * ADITYA.OS — self-hosted animated GitHub profile generator.
 * Zero dependencies (Node 18+). Writes animated SVGs into ./assets.
 *
 *   GITHUB_TOKEN=xxx GH_USER=yuvadi29 node scripts/generate.mjs   # live data
 *   node scripts/generate.mjs --demo                                # offline preview
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ───────────────────────────── CONFIG (edit me) ─────────────────────────────
const CONFIG = {
  user: process.env.GH_USER || "yuvadi29",
  displayName: "ADITYA TRIVEDI",
  location: "Bengaluru, IN",
  tagline: "Educator | Developer | Author | 15k+ Tech Community",
  modules: ["educator", "developer", "author"],
  community: "15k+ developers",
  contactLine: "ssh visitor@adityatrivedi.in",
  // Repos shown in the process table. Leave empty to use your pinned repos.
  featured: ["PromptOS", "Second-Brain", "Github-Actions-Series", "Redis"],
  orbit: ["JS", "TS", "CSS", "React", "Node"],
};

const C = {
  bg: "#07090f", bg2: "#0d1220", line: "#1b2335", dim: "#5b6b8c", text: "#c9d6f2",
  green: "#39ff88", cyan: "#22d3ee", pink: "#ff3df2", amber: "#ffb020", red: "#ff5f57",
};
const FONT = `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace`;
const W = 1200;
const CW = 0.602; // monospace char width / font-size

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets");

// ───────────────────────────── helpers ─────────────────────────────
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const trunc = (s = "", n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : n.toLocaleString("en-US"));
const niceCeil = (v) => { const p = 10 ** Math.floor(Math.log10(Math.max(v, 1))); return Math.ceil(v / p) * p; };
function wrap(text, max) {
  const words = String(text || "").split(/\s+/); const lines = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) lines.push(cur); return lines;
}

const baseStyle = (extra = "") => `<style>
  text{font-family:${FONT};fill:${C.text}}
  .dim{fill:${C.dim}} .g{fill:${C.green}} .c{fill:${C.cyan}} .p{fill:${C.pink}} .a{fill:${C.amber}}
  .b{font-weight:700}
  .in{opacity:0;animation:in .45s ease-out forwards}
  .slide{opacity:0;animation:slide .6s cubic-bezier(.2,.8,.2,1) forwards}
  .blink{animation:blink 1s steps(1) infinite}
  @keyframes in{to{opacity:1}}
  .out{animation:out .1s forwards}@keyframes out{to{opacity:0}}
  @keyframes slide{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}
  @keyframes blink{50%{opacity:0}}
  @media (prefers-reduced-motion: reduce){*{animation:none!important;opacity:1!important}}
  ${extra}
</style>`;

/** Terminal window chrome + CRT scanlines. */
function frame(h, title, body, extraStyle = "", defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(title)}">
${baseStyle(`.sweep{animation:sweep 6s linear infinite}@keyframes sweep{from{transform:translateY(-120px)}to{transform:translateY(${h + 120}px)}}${extraStyle}`)}
<defs>
  <linearGradient id="bgG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.bg2}"/><stop offset="1" stop-color="${C.bg}"/></linearGradient>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" opacity=".035"/></pattern>
  <linearGradient id="sweepG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.green}" stop-opacity="0"/><stop offset=".5" stop-color="${C.green}" stop-opacity=".07"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></linearGradient>
  <filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="win"><rect x="1" y="1" width="${W - 2}" height="${h - 2}" rx="14"/></clipPath>
  ${defs}
</defs>
<g clip-path="url(#win)">
  <rect width="${W}" height="${h}" fill="url(#bgG)"/>
  <rect width="${W}" height="38" fill="#0a0f1a"/><rect y="38" width="${W}" height="1" fill="${C.line}"/>
  <circle cx="24" cy="19" r="6" fill="${C.red}"/><circle cx="44" cy="19" r="6" fill="${C.amber}"/><circle cx="64" cy="19" r="6" fill="${C.green}"/>
  <text x="${W / 2}" y="24" text-anchor="middle" font-size="13" class="dim">${esc(title)}</text>
  ${body}
  <rect width="${W}" height="${h}" fill="url(#scan)" pointer-events="none"/>
  <rect class="sweep" width="${W}" height="120" fill="url(#sweepG)"/>
</g>
<rect x="1" y="1" width="${W - 2}" height="${h - 2}" rx="14" fill="none" stroke="${C.line}" stroke-width="2"/>
</svg>`;
}

/** SMIL typing reveal: returns {clipDef, cursor} for text starting at x,y. */
function typing(id, x, y, text, size, begin, dur) {
  const cw = size * CW; const n = text.length; const vals = []; const keys = [];
  for (let i = 0; i <= n; i++) { vals.push((i * cw).toFixed(1)); keys.push((i / n).toFixed(4)); }
  const xs = vals.map((v) => (x + +v).toFixed(1));
  const clipDef = `<clipPath id="${id}"><rect x="${x}" y="${y - size}" height="${size * 1.4}" width="0"><animate attributeName="width" values="${vals.join(";")}" keyTimes="${keys.join(";")}" calcMode="discrete" begin="${begin}s" dur="${dur}s" fill="freeze"/></rect></clipPath>`;
  const cursor = `<rect x="${x}" y="${y - size * 0.85}" width="${cw * 0.9}" height="${size * 1.05}" fill="${C.green}" class="blink"><animate attributeName="x" values="${xs.join(";")}" keyTimes="${keys.join(";")}" calcMode="discrete" begin="${begin}s" dur="${dur}s" fill="freeze"/></rect>`;
  return { clipDef, cursor };
}

// ───────────────────────────── data ─────────────────────────────
async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json", "User-Agent": "aditya-os" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function liveData(login) {
  const repoFields = `name description stargazerCount isFork pushedAt primaryLanguage{name color} languages(first:10,orderBy:{field:SIZE,direction:DESC}){edges{size node{name color}}}`;
  const head = await gql(`query($login:String!){user(login:$login){
    name bio location avatarUrl(size:240) followers{totalCount}
    pinnedItems(first:6,types:REPOSITORY){nodes{... on Repository{${repoFields}}}}
    contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}
  }}`, { login });
  const u = head.user;
  let repos = []; let after = null; let total = 0;
  do {
    const d = await gql(`query($login:String!,$after:String){user(login:$login){repositories(first:100,after:$after,ownerAffiliations:OWNER,privacy:PUBLIC){totalCount pageInfo{hasNextPage endCursor} nodes{${repoFields}}}}}`, { login, after });
    const r = d.user.repositories; total = r.totalCount; repos.push(...r.nodes);
    after = r.pageInfo.hasNextPage ? r.pageInfo.endCursor : null;
  } while (after);

  let avatar = null;
  try {
    const img = await fetch(u.avatarUrl);
    avatar = `data:${img.headers.get("content-type") || "image/png"};base64,${Buffer.from(await img.arrayBuffer()).toString("base64")}`;
  } catch {}

  return {
    repoCount: total, followers: u.followers.totalCount, avatar,
    stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
    repos, pinned: u.pinnedItems.nodes,
    days: u.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays).map((d) => ({ date: d.date, count: d.contributionCount })),
  };
}

function demoData() {
  // Seeded from the current README (106 repos / 40 stars / 645 contributions / 79 followers).
  let seed = 29; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const days = []; const end = new Date("2026-11-11T00:00:00Z"); const start = new Date(end); start.setUTCDate(start.getUTCDate() - 370);
  while (start.getUTCDay() !== 0) start.setUTCDate(start.getUTCDate() + 1);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const wave = 0.5 + 0.5 * Math.sin(days.length / 23);
    const c = rnd() < 0.42 * wave + 0.12 ? Math.floor(rnd() ** 2 * 14 * wave) + 1 : 0;
    days.push({ date: d.toISOString().slice(0, 10), count: c });
  }
  for (let i = 1; i <= 4; i++) days[days.length - i].count ||= 2;
  const L = (name, color, size) => ({ size, node: { name, color } });
  const mk = (name, description, stars, lang, color, langs) => ({ name, description, stargazerCount: stars, primaryLanguage: { name: lang, color }, languages: { edges: langs } });
  const repos = [
    mk("PromptOS", "PromptOS is a centralized prompt intelligence system that understands, evolves, and adapts across domains. Acting as a Prompt Operating System.", 18, "TypeScript", "#3178c6", [L("TypeScript", "#3178c6", 520000), L("CSS", "#563d7c", 40000)]),
    mk("Github-Actions-Series", "This is a deep dive series on understanding Github Actions", 0, "JavaScript", "#f1e05a", [L("JavaScript", "#f1e05a", 90000)]),
    mk("Redis", "This is an end-to-end understanding of what is Redis, how it works and it's implementation.", 0, "HTML", "#e34c26", [L("HTML", "#e34c26", 60000), L("JavaScript", "#f1e05a", 30000)]),
    mk("Second-Brain", "This is a project which is my personal vault to chat with my knowledge base.", 0, "TypeScript", "#3178c6", [L("TypeScript", "#3178c6", 210000)]),
    mk("misc", "", 22, "JavaScript", "#f1e05a", [L("JavaScript", "#f1e05a", 1400000), L("CSS", "#563d7c", 380000), L("SCSS", "#c6538c", 160000), L("Java", "#b07219", 120000), L("HTML", "#e34c26", 260000), L("C++", "#f34b7d", 70000), L("CMake", "#DA3434", 12000), L("TypeScript", "#3178c6", 300000)]),
  ];
  return { repoCount: 106, followers: 79, stars: 40, avatar: null, repos, pinned: repos.slice(0, 4), days };
}

function derive(d) {
  const days = d.days.slice(-371);
  const year = days.slice(-365);
  const total = year.reduce((s, x) => s + x.count, 0);
  const active = year.filter((x) => x.count > 0).length;
  let cur = 0; for (let i = days.length - 1; i >= 0; i--) { if (days[i].count > 0) cur++; else if (i === days.length - 1) continue; else break; }
  let best = 0, run = 0; for (const x of days) { run = x.count ? run + 1 : 0; best = Math.max(best, run); }
  const peak = year.reduce((m, x) => (x.count > m.count ? x : m), { count: 0, date: "" });
  const weeks = []; for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const langMap = new Map();
  for (const r of d.repos) for (const e of r.languages?.edges || []) {
    const k = e.node.name; const cur = langMap.get(k) || { name: k, color: e.node.color || C.dim, size: 0 }; cur.size += e.size; langMap.set(k, cur);
  }
  const langs = [...langMap.values()].sort((a, b) => b.size - a.size).slice(0, 8);
  const lsum = langs.reduce((s, l) => s + l.size, 0) || 1; langs.forEach((l) => (l.pct = (l.size / lsum) * 100));
  const byName = new Map(d.repos.map((r) => [r.name.toLowerCase(), r]));
  let featured = CONFIG.featured.map((n) => byName.get(n.toLowerCase())).filter(Boolean);
  if (!featured.length) featured = d.pinned.length ? d.pinned : [...d.repos].sort((a, b) => b.stargazerCount - a.stargazerCount);
  return { ...d, days, weeks, total, active, cur, best, peak, langs, featured: featured.slice(0, 4) };
}

// ───────────────────────────── sections ─────────────────────────────
function hero(D) {
  const h = 470; const yr = new Date().getFullYear();
  const boot = [
    [`Booting ADITYA.OS v${yr}.${D.total} ...`, "c"],
    [`Mounted /home/aditya  (${CONFIG.location})`, ""],
    [`Loaded modules: ${CONFIG.modules.join(" · ")}`, ""],
    [`Linked community: ${CONFIG.community} online`, ""],
    [`Indexed ${D.repoCount} repos · ${D.stars} stars · ${fmt(D.total)} commits/yr`, ""],
    [`Current streak: ${D.cur} day${D.cur === 1 ? "" : "s"} — all systems nominal`, "g"],
  ];
  let body = "";
  const glyphs = "アイウエオカキクケコサシスセソ01{}<>=/$#*+ナニヌネノ";
  let sd = 7; const rr = () => ((sd = (sd * 48271) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const x = 20 + i * 46 + rr() * 20; const len = 8 + Math.floor(rr() * 10); const dur = (5 + rr() * 7).toFixed(1); const dl = (-rr() * 10).toFixed(1);
    let col = ""; for (let k = 0; k < len; k++) col += `<tspan x="${x.toFixed(0)}" dy="18" ${k === len - 1 ? `fill="#d6ffe6" style="fill:#d6ffe6"` : ""}>${esc(glyphs[Math.floor(rr() * glyphs.length)])}</tspan>`;
    body += `<text class="rain" font-size="14" style="fill:${C.green};animation-duration:${dur}s;animation-delay:${dl}s" y="0">${col}</text>`;
  }
  boot.forEach(([t, cls], i) => {
    const y = 78 + i * 24; const dl = (0.25 + i * 0.32).toFixed(2);
    body += `<text x="40" y="${y}" font-size="15" class="in" style="animation-delay:${dl}s"><tspan class="dim">[</tspan><tspan class="g b">  OK  </tspan><tspan class="dim">]</tspan> <tspan class="${cls}">${esc(t)}</tspan></text>`;
  });
  // glitch name
  const nameY = 300, nameSize = 68; const nd = 2.3;
  body += `<g class="in" style="animation-delay:${nd}s">
    <text x="40" y="${nameY}" font-size="${nameSize}" class="b glA" fill="${C.cyan}" style="fill:${C.cyan}">${esc(CONFIG.displayName)}</text>
    <text x="40" y="${nameY}" font-size="${nameSize}" class="b glB" style="fill:${C.pink}">${esc(CONFIG.displayName)}</text>
    <text x="40" y="${nameY}" font-size="${nameSize}" class="b flick" filter="url(#glow)" style="fill:#eafff3">${esc(CONFIG.displayName)}</text>
  </g>`;
  // whoami + typed tagline
  const py = 352; const tx = 40 + 2 * 16 * CW;
  body += `<text x="40" y="${py}" font-size="16" class="in" style="animation-delay:${nd + 0.4}s"><tspan class="p b">❯</tspan> <tspan class="dim">whoami --verbose</tspan></text>`;
  const t = typing("typeTag", tx, py + 32, CONFIG.tagline, 18, nd + 0.9, CONFIG.tagline.length * 0.045);
  body += `<g clip-path="url(#typeTag)"><text x="${tx}" y="${py + 32}" font-size="18" class="g" textLength="${(CONFIG.tagline.length * 18 * CW).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(CONFIG.tagline)}</text></g>`;
  body += `<g class="in" style="animation-delay:${nd + 0.9}s">${t.cursor}</g>`;
  body += `<text x="40" y="${h - 22}" font-size="12" class="dim in" style="animation-delay:${nd + 1.2}s">uptime ${D.active} active days · load ${(D.total / 365).toFixed(2)} commits/day · pid 80524895 · tty /dev/github</text>`;

  // avatar + orbit
  const cx = 1000, cy = 235, r = 92;
  const av = D.avatar
    ? `<image href="${D.avatar}" xlink:href="${D.avatar}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#avClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#101a2c"/><text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="58" class="b g">AT</text>`;
  const orbitItems = CONFIG.orbit.map((label, i) => {
    const a = (i / CONFIG.orbit.length) * Math.PI * 2; const R = 150; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; const w = label.length * 12 * CW + 16;
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g><animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="40s" repeatCount="indefinite"/><rect x="${-w / 2}" y="-11" width="${w}" height="22" rx="11" fill="${C.bg}" stroke="${C.cyan}" stroke-opacity=".6"/><text text-anchor="middle" y="4" font-size="12" class="c">${label}</text></g></g>`;
  }).join("");
  body += `<g class="in" style="animation-delay:.6s">
    <circle cx="${cx}" cy="${cy}" r="${r + 14}" fill="none" stroke="${C.green}" stroke-width="2" stroke-dasharray="4 10" opacity=".8"><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="18s" repeatCount="indefinite"/></circle>
    <circle cx="${cx}" cy="${cy}" r="${r + 28}" fill="none" stroke="${C.pink}" stroke-width="1" stroke-dasharray="60 30 4 30" opacity=".7"><animateTransform attributeName="transform" type="rotate" from="360 ${cx} ${cy}" to="0 ${cx} ${cy}" dur="26s" repeatCount="indefinite"/></circle>
    <circle cx="${cx}" cy="${cy}" r="150" fill="none" stroke="${C.line}" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="${C.green}" stroke-width="3" class="pulse" filter="url(#glow)"/>
    ${av}
    <g><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="40s" repeatCount="indefinite"/>${orbitItems}</g>
    <rect x="${cx - 52}" y="${cy + r + 70}" width="104" height="22" rx="11" fill="${C.green}" fill-opacity=".12" stroke="${C.green}" stroke-opacity=".5"/>
    <circle cx="${cx - 36}" cy="${cy + r + 81}" r="4" fill="${C.green}" class="blink"/>
    <text x="${cx + 6}" y="${cy + r + 85}" text-anchor="middle" font-size="12" class="g">ONLINE</text>
  </g>`;
  const extra = `
    .glA{opacity:0;animation:glA 3.2s steps(1) infinite 2.6s}.glB{opacity:0;animation:glB 3.2s steps(1) infinite 2.6s}
    @keyframes glA{0%,86%,100%{opacity:0;transform:none}87%{opacity:.85;transform:translate(-5px,2px)}90%{transform:translate(4px,-1px)}93%{transform:translate(-2px,0)}96%{opacity:0}}
    @keyframes glB{0%,86%,100%{opacity:0;transform:none}88%{opacity:.85;transform:translate(5px,-2px)}91%{transform:translate(-3px,2px)}94%{transform:translate(2px,0)}96%{opacity:0}}
    .flick{animation:flick 3.2s steps(1) infinite 2.6s}@keyframes flick{0%,86%,100%{transform:none}88%{transform:translate(1px,0) skewX(-6deg)}92%{transform:translate(-1px,0)}}
    .rain{opacity:.09;animation:rain linear infinite}@keyframes rain{from{transform:translateY(-${18 * 18}px)}to{transform:translateY(${h}px)}}
    .pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ease-in-out infinite}@keyframes pulse{50%{opacity:.35;transform:scale(1.04)}}`;
  return frame(h, "aditya@trivedi: ~ — zsh — boot", body, extra, `<clipPath id="avClip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>${t.clipDef}`);
}

function stats(D) {
  const h = 330; let body = `<text x="40" y="74" font-size="15"><tspan class="p b">❯</tspan> <tspan class="dim">htop --user</tspan> <tspan class="c">${esc(CONFIG.user)}</tspan></text>`;
  const meters = [
    ["REPO", D.repoCount, C.green], ["STAR", D.stars, C.amber],
    ["CMTS", D.total, C.cyan], ["FOLW", D.followers, C.pink],
  ];
  const tx = 110, tw = 420;
  meters.forEach(([lab, v, col], i) => {
    const y = 120 + i * 46; const ratio = Math.min(1, v / niceCeil(v * 1.35)); const fw = (tw * ratio).toFixed(1); const dl = 0.3 + i * 0.2;
    body += `<text x="40" y="${y + 5}" font-size="15" class="b" style="fill:${col}">${lab}</text>
      <text x="${tx - 12}" y="${y + 5}" font-size="16" class="dim">[</text><text x="${tx + tw + 4}" y="${y + 5}" font-size="16" class="dim">]</text>
      <rect x="${tx}" y="${y - 9}" width="${tw}" height="18" fill="${C.line}" opacity=".45"/>
      <rect x="${tx}" y="${y - 9}" width="0" height="18" fill="${col}" opacity=".9"><animate attributeName="width" from="0" to="${fw}" begin="${dl}s" dur="1.4s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".2 .8 .2 1"/></rect>
      <rect x="${tx}" y="${y - 9}" width="${tw}" height="18" fill="url(#ticks)"/>
      <text x="${tx + tw + 26}" y="${y + 6}" font-size="18" class="b in" style="animation-delay:${dl + 0.8}s">${fmt(v)}</text>`;
  });
  body += `<text x="40" y="${h - 26}" font-size="13" class="in" style="animation-delay:1.8s"><tspan class="dim">Tasks: </tspan><tspan class="g">${D.repoCount}</tspan><tspan class="dim"> total, </tspan><tspan class="c">${D.featured.length}</tspan><tspan class="dim"> running · Load: </tspan><tspan class="a">${(D.total / 365).toFixed(2)}</tspan><tspan class="dim"> · Uptime: </tspan><tspan class="p">${D.active} days</tspan></text>`;
  // sparkline: last 16 weeks
  const wk = D.weeks.slice(-16).map((w) => w.reduce((s, x) => s + x.count, 0));
  const sx = 700, sy = 100, sw = 450, sh = 120; const mx = Math.max(...wk, 1);
  const pts = wk.map((v, i) => [sx + (i / (wk.length - 1)) * sw, sy + sh - (v / mx) * sh]);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const len = 1400;
  body += `<text x="${sx}" y="${sy - 14}" font-size="13" class="dim">load avg · weekly commits · last 16w</text>`;
  for (let i = 0; i <= 3; i++) body += `<line x1="${sx}" x2="${sx + sw}" y1="${sy + (sh / 3) * i}" y2="${sy + (sh / 3) * i}" stroke="${C.line}" stroke-dasharray="2 6"/>`;
  body += `<path d="${path}L${sx + sw},${sy + sh}L${sx},${sy + sh}Z" fill="url(#area)" class="in" style="animation-delay:1.6s"/>
    <path d="${path}" fill="none" stroke="${C.green}" stroke-width="2.5" filter="url(#glow)" stroke-dasharray="${len}" stroke-dashoffset="${len}"><animate attributeName="stroke-dashoffset" from="${len}" to="0" begin=".4s" dur="2s" fill="freeze"/></path>
    <g class="in" style="animation-delay:2.4s"><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="5" fill="${C.green}" class="blink"/></g>`;
  // tiles
  const tiles = [["streak", `${D.cur}d`, C.green], ["longest", `${D.best}d`, C.cyan], ["active", `${D.active}d`, C.amber], ["peak day", `${D.peak.count}`, C.pink]];
  tiles.forEach(([k, v, col], i) => {
    const x = sx + i * 116, y = 250;
    body += `<g class="slide" style="animation-delay:${1 + i * 0.15}s"><rect x="${x}" y="${y}" width="104" height="56" rx="8" fill="${C.bg}" stroke="${col}" stroke-opacity=".35"/>
      <text x="${x + 12}" y="${y + 22}" font-size="11" class="dim">${k}</text><text x="${x + 12}" y="${y + 45}" font-size="20" class="b" style="fill:${col}">${v}</text></g>`;
  });
  return frame(h, "htop — aditya.os", body, "", `
    <pattern id="ticks" width="7" height="18" patternUnits="userSpaceOnUse"><rect x="5" width="2" height="18" fill="${C.bg}"/></pattern>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.green}" stop-opacity=".35"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></linearGradient>`);
}

function heatmap(D) {
  const cell = 15, gap = 4, step = cell + gap; const gx = Math.round((W - D.weeks.length * step) / 2 + 14), gy = 104;
  const h = gy + 7 * step + 64;
  const counts = D.days.map((d) => d.count).filter(Boolean).sort((a, b) => a - b);
  const q = (p) => counts[Math.floor(p * (counts.length - 1))] || 1;
  const th = [q(0.25), q(0.5), q(0.8)];
  const lvl = (c) => (!c ? 0 : c <= th[0] ? 1 : c <= th[1] ? 2 : c <= th[2] ? 3 : 4);
  const cols = ["#111a2b", "#0f4d34", "#13894f", "#22c56f", C.green];
  let body = `<text x="40" y="74" font-size="15"><tspan class="p b">❯</tspan> <tspan class="dim">tail -f</tspan> <tspan class="c">/var/log/commits</tspan></text>`;
  let lastM = -1;
  D.weeks.forEach((w, wi) => {
    const m = new Date(w[0].date + "T00:00:00Z").getUTCMonth();
    if (m !== lastM && wi < D.weeks.length - 2) { body += `<text x="${gx + wi * step}" y="${gy - 10}" font-size="11" class="dim">${"JanFebMarAprMayJunJulAugSepOctNovDec".slice(m * 3, m * 3 + 3)}</text>`; lastM = m; }
    w.forEach((d, di) => {
      const L = lvl(d.count); const dl = (wi * 0.025 + di * 0.04).toFixed(2);
      const cls = L === 4 ? "cell hot" : "cell";
      body += `<rect class="${cls}" x="${gx + wi * step}" y="${gy + di * step}" width="${cell}" height="${cell}" rx="3" fill="${cols[L]}" style="animation-delay:${dl}s${L === 4 ? `,${(2 + (wi % 7) * 0.4).toFixed(1)}s` : ""}"><title>${d.date}: ${d.count}</title></rect>`;
    });
  });
  ["Mon", "Wed", "Fri"].forEach((t, i) => (body += `<text x="${gx - 12}" y="${gy + (1 + i * 2) * step + 12}" text-anchor="end" font-size="11" class="dim">${t}</text>`));
  // radar sweep column
  body += `<rect class="radar" x="${gx - 6}" y="${gy - 4}" width="10" height="${7 * step + 4}" fill="${C.green}" opacity=".18" filter="url(#glow)"/>`;
  const fy = gy + 7 * step + 34;
  body += `<text x="${gx}" y="${fy}" font-size="14" class="in" style="animation-delay:1.6s"><tspan class="g b">${fmt(D.total)}</tspan><tspan class="dim"> contributions in the last year  ·  </tspan><tspan class="c b">${D.cur}</tspan><tspan class="dim"> day streak  ·  </tspan><tspan class="a b">${D.active}</tspan><tspan class="dim"> active days  ·  best run </tspan><tspan class="p b">${D.best}</tspan><tspan class="dim"> days</tspan></text>`;
  body += `<g class="in" style="animation-delay:1.6s" font-size="11"><text x="${W - 196}" y="${fy}" class="dim">less</text>${cols.map((c, i) => `<rect x="${W - 160 + i * 18}" y="${fy - 11}" width="13" height="13" rx="3" fill="${c}"/>`).join("")}<text x="${W - 64}" y="${fy}" class="dim">more</text></g>`;
  const gridW = D.weeks.length * step;
  return frame(h, "journalctl — contribution log", body, `
    .cell{opacity:0;animation:pop .5s ease-out forwards;transform-box:fill-box;transform-origin:center}
    .hot{animation:pop .5s ease-out forwards,hot 2.8s ease-in-out infinite}
    @keyframes pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
    @keyframes hot{0%,100%{fill:${C.green}}50%{fill:#b8ffd6}}
    .radar{animation:radar 7s linear infinite 1.5s;opacity:0}
    @keyframes radar{0%{transform:translateX(0);opacity:.2}95%{opacity:.2}100%{transform:translateX(${gridW}px);opacity:0}}`);
}

function projects(D) {
  const rows = D.featured; const rh = 78; const top = 128; const h = top + rows.length * rh + 40;
  let body = `<text x="40" y="74" font-size="15"><tspan class="p b">❯</tspan> <tspan class="dim">ps aux --sort=-impact | grep</tspan> <tspan class="c">shipped</tspan></text>`;
  body += `<rect x="30" y="${top - 34}" width="${W - 60}" height="24" fill="${C.green}" opacity=".9"/>`;
  const cols = [["PID", 44], ["STAT", 130], ["★", 210], ["LANG", 280], ["COMMAND", 430]];
  cols.forEach(([t, x]) => (body += `<text x="${x}" y="${top - 17}" font-size="13" class="b" style="fill:${C.bg}">${t}</text>`));
  rows.forEach((r, i) => {
    const y = top + i * rh + 14; const dl = (0.4 + i * 0.25).toFixed(2); const lang = r.primaryLanguage || { name: "—", color: C.dim };
    const desc = wrap(r.description || "No description — the code speaks for itself.", 88).slice(0, 2);
    if (desc.length === 2 && (r.description || "").length > desc.join(" ").length) desc[1] = trunc(desc[1], 87) + (desc[1].endsWith("…") ? "" : "…");
    body += `<g class="slide" style="animation-delay:${dl}s">
      ${i % 2 ? `<rect x="30" y="${y - 20}" width="${W - 60}" height="${rh - 4}" fill="#fff" opacity=".02"/>` : ""}
      <text x="44" y="${y}" font-size="15" class="dim">${String(1000 + i * 337).padStart(4, "0")}</text>
      <circle cx="136" cy="${y - 5}" r="5" fill="${C.green}" class="blink" style="animation-delay:${i * 0.3}s"/><text x="148" y="${y}" font-size="15" class="g">R</text>
      <text x="210" y="${y}" font-size="15" class="a b">${r.stargazerCount}</text>
      <circle cx="286" cy="${y - 5}" r="6" fill="${lang.color || C.dim}"/><text x="298" y="${y}" font-size="14">${esc(trunc(lang.name, 12))}</text>
      <text x="430" y="${y}" font-size="17" class="b c">./${esc(r.name)}</text>
      ${desc.map((l, k) => `<text x="430" y="${y + 22 + k * 19}" font-size="13" class="dim">${esc(l)}</text>`).join("")}
    </g>`;
  });
  body += `<text x="40" y="${h - 18}" font-size="13" class="in" style="animation-delay:${0.6 + rows.length * 0.25}s"><tspan class="dim">${rows.length} of </tspan><tspan class="g">${D.repoCount}</tspan><tspan class="dim"> processes shown · built, shipped, shared</tspan></text>`;
  return frame(h, "ps — running projects", body);
}

function stack(D) {
  const L = D.langs; const top = 112; const rh = 34; const h = top + L.length * rh + 66;
  let body = `<text x="40" y="74" font-size="15"><tspan class="p b">❯</tspan> <tspan class="dim">pkg install</tspan> <tspan class="c">--from-repos</tspan> <tspan class="dim">--sort=bytes</tspan></text>`;
  const bx = 330, bw = 640;
  L.forEach((l, i) => {
    const y = top + i * rh; const dl = 0.3 + i * 0.28; const fw = Math.max(6, (bw * l.pct) / L[0].pct);
    body += `<g class="in" style="animation-delay:${dl}s">
      <text x="40" y="${y + 5}" font-size="15"><tspan class="g">➜</tspan> <tspan class="dim">installing</tspan></text>
      <circle cx="160" cy="${y}" r="6" fill="${l.color}"/><text x="174" y="${y + 5}" font-size="15" class="b">${esc(l.name.toLowerCase())}</text>
      <rect x="${bx}" y="${y - 8}" width="${bw}" height="16" rx="3" fill="${C.line}" opacity=".5"/>
      <rect x="${bx}" y="${y - 8}" width="0" height="16" rx="3" fill="${l.color}"><animate attributeName="width" from="0" to="${fw.toFixed(1)}" begin="${dl}s" dur="1.1s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".3 .9 .3 1"/></rect>
      <rect x="${bx}" y="${y - 8}" width="${bw}" height="16" fill="url(#stripe)" opacity=".25"/>
      <text x="${bx + bw + 20}" y="${y + 5}" font-size="15" class="b">${l.pct.toFixed(1)}%</text>
      <text x="${W - 40}" y="${y + 5}" text-anchor="end" font-size="15" class="g in" style="animation-delay:${dl + 1}s">✔</text>
    </g>`;
  });
  const dl = 0.5 + L.length * 0.28;
  body += `<text x="40" y="${h - 26}" font-size="15" class="in" style="animation-delay:${dl}s"><tspan class="g b">✔ ${L.length} packages installed</tspan><tspan class="dim"> — chosen for the work, not the trend.</tspan></text>`;
  return frame(h, "pkg — the tools behind the signal", body, "", `<pattern id="stripe" width="12" height="16" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)"><rect width="5" height="16" fill="#000"/><animateTransform attributeName="patternTransform" type="translate" from="0 0" to="24 0" dur="1s" repeatCount="indefinite" additive="sum"/></pattern>`);
}

function contact() {
  const h = 250; const cmd = CONFIG.contactLine; const t = typing("typeSsh", 40 + 2 * 18 * CW, 82, cmd, 18, 0.5, cmd.length * 0.05);
  const d0 = 0.5 + cmd.length * 0.05 + 0.3;
  let body = `<text x="40" y="82" font-size="18" class="p b">❯</text><g clip-path="url(#typeSsh)"><text x="${40 + 2 * 18 * CW}" y="82" font-size="18" textLength="${(cmd.length * 18 * CW).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(cmd)}</text></g>`;
  const lines = [[`Resolving adityatrivedi.in ... ${CONFIG.location}`, "dim"], ["Handshake: curiosity ⇄ craft ⇄ shipping  [ok]", "dim"], ["Connection established.", "g"]];
  lines.forEach(([l, c], i) => (body += `<text x="40" y="${118 + i * 24}" font-size="15" class="${c} in" style="animation-delay:${(d0 + i * 0.5).toFixed(2)}s">${esc(l)}</text>`));
  const d1 = d0 + 1.8;
  body += `<text x="40" y="${h - 22}" font-size="26" class="b in" style="animation-delay:${d1}s">Make something worth <tspan class="g" filter="url(#glow)">noticing</tspan>.<tspan class="g blink"> █</tspan></text>`;
  body += `<g class="out" style="animation-delay:${d0.toFixed(2)}s">${t.cursor}</g>`;
  return frame(h, "ssh — say hello", body, "", t.clipDef);
}

// ───────────────────────────── main ─────────────────────────────
const demo = process.argv.includes("--demo") || !process.env.GITHUB_TOKEN;
if (demo) console.log("ℹ  No GITHUB_TOKEN (or --demo): rendering with seed data.");
const D = derive(demo ? demoData() : await liveData(CONFIG.user));
await mkdir(OUT, { recursive: true });
const files = { "hero.svg": hero(D), "stats.svg": stats(D), "heatmap.svg": heatmap(D), "projects.svg": projects(D), "stack.svg": stack(D), "contact.svg": contact() };
for (const [f, svg] of Object.entries(files)) { await writeFile(join(OUT, f), svg); console.log(`✔ assets/${f}  ${(svg.length / 1024).toFixed(1)} KB`); }
