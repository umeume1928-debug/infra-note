"use strict";
/* インフラノート v2 — app.js
 * データ構成：初期用語（data.js）と、利用者のデータ（state）を分けて保存する。
 * state には自作用語・初期用語の編集内容・学習進捗・設定だけが入るため、
 * アプリ更新で初期用語が増えても学習記録はそのまま引き継がれる。
 */
const APP_VERSION = "2.1.0";
const KEY = "infraNote_v2", OLD_KEY = "infraNote_v1", DAY = 86400000;
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c.name]));
const V1CAT = { "ネットワーク": "net", "サーバー": "server", "セキュリティ": "sec", "基本用語": "basic", "その他": "other" };
const LEVELS = [
  { name: "未学習", color: "var(--lv0)" },
  { name: "学習中", color: "var(--lv1)" },
  { name: "定着中", color: "var(--lv2)" },
  { name: "習得", color: "var(--lv3)" }
];
const TYPE_NAMES = { def: "4択（用語→説明）", term: "4択（説明→用語）", tf: "○×問題", input: "記述（用語を入力）" };

/* ───────── ユーティリティ ───────── */
const $ = s => document.querySelector(s);
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (ts = Date.now()) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const norm = s => String(s || "").normalize("NFKC").toLowerCase().replace(/[\s・\-_()（）「」"'.。、,]/g, "");

const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  study: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  filter: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
  plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  chev: '<path d="M9 6l6 6-6 6"/>'
};
const icon = (n, size = 22) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

/* ───────── 保存データ ───────── */
function defaultState() {
  return {
    version: 2, userTerms: [], overrides: {}, hidden: [], progress: {}, favorites: [], missed: [], cases: [],
    stats: { answered: 0, correct: 0, daily: {}, drills: { port: { a: 0, c: 0 }, subnet: { a: 0, c: 0 } } },
    studyDays: [],
    settings: { theme: "auto", quizSize: 10, newPerDay: 10, types: { def: true, term: true, tf: true, input: true } },
    created: Date.now()
  };
}
function normalizeState(s) {
  const d = defaultState();
  const out = { ...d, ...s };
  out.stats = { ...d.stats, ...(s.stats || {}) };
  out.stats.drills = { ...d.stats.drills, ...((s.stats || {}).drills || {}) };
  out.settings = { ...d.settings, ...(s.settings || {}) };
  out.settings.types = { ...d.settings.types, ...((s.settings || {}).types || {}) };
  for (const k of ["userTerms", "hidden", "favorites", "missed", "studyDays", "cases"]) if (!Array.isArray(out[k])) out[k] = [];
  for (const k of ["overrides", "progress"]) if (!out[k] || typeof out[k] !== "object") out[k] = {};
  out.version = 2;
  return out;
}
/* v1（初代）のデータを v2 形式に変換 */
function migrateV1(old) {
  const s = defaultState();
  const builtinIds = new Set(TERMS.map(t => t.id));
  const v1Builtins = ["dns", "cache", "dns-route", "port"];
  const seenIds = new Set();
  for (const t of old.terms || []) {
    seenIds.add(t.id);
    const box = t.box || 0;
    if ((t.seen || 0) > 0) {
      s.progress[t.id] = {
        reps: box, ease: 2.5, interval: [0, 1, 3, 7, 14, 30][Math.min(box, 5)], due: t.due || 0,
        seen: t.seen || 0, correct: t.correct || 0, wrong: t.wrong || 0, lapses: 0, last: 0, first: ""
      };
    }
    if (!builtinIds.has(t.id)) {
      s.userTerms.push({
        id: t.id, term: t.term || "", cat: V1CAT[t.category] || "other", def: t.definition || "",
        ex: t.example || "", mem: t.memory || "", tags: [], alias: [], created: t.created || Date.now()
      });
    }
  }
  s.hidden = v1Builtins.filter(id => !seenIds.has(id) && (old.terms || []).length > 0);
  s.missed = (old.missed || []).filter(Boolean);
  s.stats.answered = old.totalAnswered || 0;
  s.stats.correct = old.totalCorrect || 0;
  s.studyDays = Array.isArray(old.studyDays) ? old.studyDays.slice() : [];
  return s;
}
function loadState() {
  try {
    const v2 = JSON.parse(localStorage.getItem(KEY));
    if (v2 && v2.version === 2) return normalizeState(v2);
  } catch (e) { /* 壊れていたら下へ */ }
  try {
    const v1 = JSON.parse(localStorage.getItem(OLD_KEY));
    if (v1 && Array.isArray(v1.terms)) {
      const s = migrateV1(v1);
      // v1 のデータは消さずに残しておく（念のため）
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { }
      return s;
    }
  } catch (e) { }
  return defaultState();
}
let state = loadState();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast("保存に失敗しました。空き容量を確認してください"); }
}

/* ───────── 用語 ───────── */
function allTerms() {
  const hidden = new Set(state.hidden);
  const builtins = TERMS.filter(t => !hidden.has(t.id)).map(t => {
    const o = state.overrides[t.id];
    return { ...t, ...(o || {}), builtin: true, edited: !!o };
  });
  const users = state.userTerms.map(t => ({ ...t, builtin: false }));
  return [...users, ...builtins];
}
function getTerm(id) { return allTerms().find(t => t.id === id); }
function P(id) {
  return state.progress[id] || { reps: 0, ease: 2.5, interval: 0, due: 0, seen: 0, correct: 0, wrong: 0, lapses: 0, last: 0, first: "" };
}
function level(id) {
  const p = P(id);
  if (!p.seen) return 0;
  if (p.interval >= 21) return 3;
  if (p.interval >= 7) return 2;
  return 1;
}
function answerKeys(t) {
  const keys = new Set([t.term]);
  String(t.term).split(/[（）()・／\/]/).map(s => s.trim()).filter(Boolean).forEach(s => keys.add(s));
  (t.alias || []).forEach(a => a && keys.add(a));
  return [...keys];
}
function maskDef(t) {
  let d = t.def;
  answerKeys(t).filter(k => k.length >= 2).sort((a, b) => b.length - a.length).forEach(k => {
    d = d.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "〇〇");
  });
  return d;
}

/* ───────── 間隔反復（SM-2をシンプルにしたもの） ───────── */
// g: 0=もう一度 1=難しい 2=普通 3=簡単
function grade(id, g) {
  const p = { ...P(id) };
  const now = Date.now();
  const early = p.seen > 0 && p.due > now; // 予定より早い復習
  p.seen++; p.last = now;
  if (!p.first) p.first = localDay();
  if (g === 0) {
    p.wrong++; p.lapses++; p.reps = 0; p.interval = 0; p.ease = Math.max(1.3, p.ease - 0.2); p.due = now;
    if (!state.missed.includes(id)) state.missed.push(id);
  } else {
    p.correct++;
    state.missed = state.missed.filter(x => x !== id);
    if (!early || g === 3) {
      let iv;
      if (p.reps === 0) iv = [0, 1, 1, 3][g];
      else if (p.reps === 1) iv = [0, 2, 3, 6][g];
      else iv = Math.round(p.interval * [0, 1.2, p.ease, p.ease * 1.3][g]);
      iv = Math.min(365, Math.max(iv, g >= 2 ? p.interval + 1 : 1));
      if (g === 1) p.ease = Math.max(1.3, p.ease - 0.15);
      if (g === 3) p.ease = Math.min(3.0, p.ease + 0.15);
      p.reps++; p.interval = iv; p.due = startOfDay() + iv * DAY;
    }
  }
  state.progress[id] = p;
}
function recordAnswer(ok, drill) {
  const d = localDay();
  state.stats.answered++;
  if (ok) state.stats.correct++;
  const day = state.stats.daily[d] || { a: 0, c: 0 };
  day.a++; if (ok) day.c++;
  state.stats.daily[d] = day;
  if (drill) { const x = state.stats.drills[drill]; x.a++; if (ok) x.c++; }
  if (!state.studyDays.includes(d)) state.studyDays.push(d);
  save();
}
function streakInfo() {
  const days = new Set(state.studyDays);
  let cur = 0, t = new Date();
  if (!days.has(localDay(t))) t.setDate(t.getDate() - 1);
  while (days.has(localDay(t))) { cur++; t.setDate(t.getDate() - 1); }
  let best = 0, run = 0, prev = null;
  [...days].sort().forEach(ds => {
    const ts = new Date(ds + "T00:00:00").getTime();
    run = prev !== null && Math.round((ts - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = ts;
  });
  return { cur, best: Math.max(best, cur), today: days.has(localDay()) };
}
function dueTerms(terms = allTerms()) {
  const now = Date.now();
  return terms.filter(t => P(t.id).seen > 0 && P(t.id).due <= now).sort((a, b) => P(a.id).due - P(b.id).due);
}
function newTermsToday(terms = allTerms()) {
  const today = localDay();
  const introduced = Object.values(state.progress).filter(p => p.first === today).length;
  const left = Math.max(0, state.settings.newPerDay - introduced);
  return terms.filter(t => !P(t.id).seen).slice(0, left);
}

/* ───────── 問題の生成 ───────── */
function distractors(term, pool, field, n = 3) {
  const others = pool.filter(x => x.id !== term.id && x[field] && norm(x[field]) !== norm(term[field]));
  const same = shuffle(others.filter(x => x.cat === term.cat));
  const diff = shuffle(others.filter(x => x.cat !== term.cat));
  const out = [], seen = new Set([norm(term[field])]);
  for (const x of [...same, ...diff]) {
    if (out.length >= n) break;
    if (seen.has(norm(x[field]))) continue;
    seen.add(norm(x[field])); out.push(x);
  }
  return out;
}
function mcFrom(prompt, correct, wrongs, extra = {}) {
  const choices = shuffle([correct, ...wrongs]);
  return { kind: "mc", prompt, choices, answer: choices.indexOf(correct), ...extra };
}
function termQuestion(term, pool, forceType) {
  const types = Object.keys(state.settings.types).filter(k => state.settings.types[k]);
  const enabled = types.length ? types : ["def"];
  const hand = (term.qs || []);
  if (!forceType && hand.length && Math.random() < 0.45) {
    const q = pick(hand);
    if (q.tf !== undefined) return { kind: "tf", prompt: "次の文は正しい？", sub: q.q, answer: !!q.tf, why: q.why, termId: term.id, type: "hand" };
    const correct = q.opts[q.a];
    return { ...mcFrom(q.q, correct, q.opts.filter((_, i) => i !== q.a)), why: q.why, termId: term.id, type: "hand" };
  }
  const type = forceType || pick(enabled);
  const base = { termId: term.id, type };
  if (type === "term") {
    const w = distractors(term, pool, "term");
    if (w.length >= 3) return { ...mcFrom("次の説明にあてはまる用語は？", term.term, w.map(x => x.term)), sub: maskDef(term), why: `正解は「${term.term}」。${term.mem || ""}`, ...base };
  }
  if (type === "tf") {
    const truth = Math.random() < 0.5;
    const other = distractors(term, pool, "def", 1)[0];
    if (truth || !other) return { kind: "tf", prompt: "次の説明は正しい？", sub: `「${term.term}」とは、${term.def}`, answer: true, why: `正しい説明です。${term.mem || ""}`, ...base };
    return { kind: "tf", prompt: "次の説明は正しい？", sub: `「${term.term}」とは、${other.def}`, answer: false, why: `これは「${other.term}」の説明。「${term.term}」は：${term.def}`, ...base };
  }
  if (type === "input") {
    return { kind: "input", prompt: "次の説明にあてはまる用語を入力しよう", sub: maskDef(term), accept: answerKeys(term), display: term.term, hint: `${CAT[term.cat] || "その他"} ・ ${[...answerKeys(term)[1] || term.term][0]}…`, why: term.mem || "", ...base };
  }
  const w = distractors(term, pool, "def");
  if (w.length < 3) return { kind: "tf", prompt: "次の説明は正しい？", sub: `「${term.term}」とは、${term.def}`, answer: true, why: "", ...base };
  return { ...mcFrom(`「${term.term}」の説明として正しいものは？`, term.def, w.map(x => x.def)), why: term.mem ? `覚え方：${term.mem}` : "", ...base };
}
function portQuestion() {
  const p = pick(PORTS);
  const others = shuffle(PORTS.filter(x => x.port !== p.port && x.name.split("（")[0] !== p.name.split("（")[0]));
  const why = `${p.name} は ${p.proto} ${p.port}番。`;
  const r = Math.random();
  if (r < 0.4) return { ...mcFrom(`${p.name} が使うポート番号は？`, String(p.port), others.slice(0, 3).map(x => String(x.port))), why, drill: "port" };
  if (r < 0.75) return { ...mcFrom(`ポート ${p.port} 番を使うのは？`, p.name, others.slice(0, 3).map(x => x.name)), why, drill: "port" };
  return { kind: "input", prompt: `${p.name} のポート番号を入力しよう`, accept: [String(p.port)], display: String(p.port), numeric: true, why, drill: "port" };
}
const ipStr = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
const maskOf = p => p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0;
function subnetQuestion() {
  const base = pick([[10, randInt(0, 255)], [172, randInt(16, 31)], [192, 168]]);
  const ip = (((base[0] << 24) | (base[1] << 16) | (randInt(0, 255) << 8) | randInt(1, 254)) >>> 0);
  const p = Math.random() < 0.7 ? randInt(24, 30) : randInt(17, 23);
  const mask = maskOf(p), net = (ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0, size = 2 ** (32 - p);
  const oi = Math.floor(p / 8), block = 2 ** (8 - (p % 8)), val = (ip >>> (24 - oi * 8)) & 255;
  const lo = Math.floor(val / block) * block, hi = lo + block - 1;
  const steps = `/${p} は第${oi + 1}オクテットで区切ると、ブロックサイズは ${block}。${val} は ${lo}〜${hi} の範囲 → ネットワークアドレス ${ipStr(net)}、ブロードキャストアドレス ${ipStr(bc)}。`;
  const uniq = (correct, cands) => { const s = new Set([correct]); const out = []; for (const c of cands) { if (out.length >= 3) break; if (!s.has(c)) { s.add(c); out.push(c); } } return out; };
  const q = `${ipStr(ip)}/${p}`;
  const t = randInt(0, 4);
  if (t === 0) return { ...mcFrom(`${q} のネットワークアドレスは？`, ipStr(net), uniq(ipStr(net), [ipStr(bc), ipStr((net + size) >>> 0), ipStr((ip & maskOf(Math.max(8, p - 2))) >>> 0), ipStr((net - size) >>> 0), ipStr((ip & 0xFFFFFF00) >>> 0), ipStr(ip)])), why: steps, drill: "subnet" };
  if (t === 1) return { ...mcFrom(`${q} のブロードキャストアドレスは？`, ipStr(bc), uniq(ipStr(bc), [ipStr(net), ipStr((bc + 1) >>> 0), ipStr((bc - size) >>> 0), ipStr((ip | 255) >>> 0), ipStr((bc - 1) >>> 0)])), why: steps, drill: "subnet" };
  if (t === 2) { const h = 32 - p; return { ...mcFrom(`/${p} のネットワークで、機器に割り当てられるアドレスの数は？`, String(2 ** h - 2), uniq(String(2 ** h - 2), [String(2 ** h), String(2 ** h - 1), String(2 ** (h + 1) - 2), String(2 ** (h - 1) - 2)])), why: `ホスト部は 32−${p}＝${h}ビット。2^${h}＝${2 ** h} から、ネットワークアドレスとブロードキャストアドレスの2つを引いて ${2 ** h - 2}。`, drill: "subnet" }; }
  if (t === 3) return { ...mcFrom(`/${p} をサブネットマスクで表すと？`, ipStr(mask), uniq(ipStr(mask), [ipStr(maskOf(p - 1)), ipStr(maskOf(p + 1)), ipStr(maskOf(p - 2)), ipStr(maskOf(Math.min(32, p + 2)))])), why: `/${p} は先頭から${p}ビットが1。第${oi + 1}オクテットは ${(mask >>> (24 - oi * 8)) & 255}（${p % 8 || 8}ビット分の1）。`, drill: "subnet" };
  const inside = (net + randInt(1, size - 2)) >>> 0;
  const outs = [(bc + randInt(1, Math.min(size, 50))) >>> 0, (net - randInt(1, Math.min(size, 50))) >>> 0, (net + size * randInt(2, 3) + randInt(1, Math.max(1, size - 2))) >>> 0];
  return { ...mcFrom(`${q} と同じネットワークに属するIPアドレスは？`, ipStr(inside), uniq(ipStr(inside), outs.map(ipStr))), why: steps + ` 範囲内（${ipStr(net + 1)}〜${ipStr(bc - 1)}）にあるのが正解。`, drill: "subnet" };
}

/* ───────── 画面の状態 ───────── */
const ui = {
  tab: "home", detail: null, edit: null,
  termFilter: "all", termSort: "cat", search: "",
  pickCats: new Set(), pickTags: new Set(), pickFav: false, pickOpen: false,
  session: null, caseView: null, caseEdit: null
};

function startSession(opts) {
  const { title, kind = "quiz", sources } = opts;
  if (!sources.length) { toast("出題できる用語がありません"); return; }
  ui.session = { title, kind, items: sources.map(s => ({ src: s })), i: 0, correct: 0, done: false, answered: false, revealed: false, retry: opts.retry };
  ui.tab = "study"; ui.detail = null; ui.edit = null; ui.caseView = null; ui.caseEdit = null;
  render(); window.scrollTo(0, 0);
}
function termSources(terms, n = state.settings.quizSize) {
  return shuffle(terms.slice()).slice(0, n).map(t => ({ t: "term", id: t.id }));
}
function startToday() {
  const terms = allTerms();
  const list = [...dueTerms(terms), ...newTermsToday(terms)];
  if (!list.length) { toast("今日の分は完了！ランダム練習で続けよう"); return startSession({ title: "全範囲ランダム", sources: termSources(terms) }); }
  // 今日の分は全部出す（多すぎる場合は設定の3倍まで）
  startSession({ title: "今日の学習", sources: list.slice(0, state.settings.quizSize * 3).map(t => ({ t: "term", id: t.id })) });
}
function pickedTerms() {
  return allTerms().filter(t =>
    (!ui.pickCats.size || ui.pickCats.has(t.cat)) &&
    (!ui.pickTags.size || (t.tags || []).some(g => ui.pickTags.has(g))) &&
    (!ui.pickFav || state.favorites.includes(t.id)));
}
function currentItem() {
  const s = ui.session, it = s.items[s.i];
  if (!it.q) {
    const pool = allTerms();
    if (it.src.t === "port") it.q = portQuestion();
    else if (it.src.t === "subnet") it.q = subnetQuestion();
    else {
      const term = pool.find(t => t.id === it.src.id);
      it.q = term ? termQuestion(term, pool, it.src.type) : portQuestion();
      it.term = term;
    }
  }
  return it;
}
function submitAnswer(value) {
  const s = ui.session; if (!s || s.answered) return;
  const it = currentItem(), q = it.q;
  let ok;
  if (q.kind === "mc") ok = value === q.answer;
  else if (q.kind === "tf") ok = value === q.answer;
  else ok = q.accept.some(a => norm(a) === norm(value));
  it.user = value; it.ok = ok; s.answered = true;
  if (ok) s.correct++;
  if (q.termId) grade(q.termId, ok ? 2 : 0);
  recordAnswer(ok, q.drill);
  render();
}
function overrideCorrect() {
  const s = ui.session, it = s.items[s.i];
  if (!it || it.ok) return;
  it.ok = true; s.correct++;
  state.stats.correct++;
  const d = state.stats.daily[localDay()]; if (d) d.c++;
  if (it.q.drill) state.stats.drills[it.q.drill].c++;
  if (it.q.termId) {
    // 「もう一度」の記録を取り消して「普通」で採点し直す
    const p = P(it.q.termId); p.wrong = Math.max(0, p.wrong - 1); p.lapses = Math.max(0, p.lapses - 1); p.seen = Math.max(0, p.seen - 1);
    state.progress[it.q.termId] = p; grade(it.q.termId, 2);
  }
  save(); render();
}
function nextItem() {
  const s = ui.session;
  s.i++; s.answered = false; s.revealed = false;
  if (s.i >= s.items.length) s.done = true;
  render(); window.scrollTo(0, 0);
}
function rateFlash(g) {
  const s = ui.session, it = s.items[s.i];
  grade(it.src.id, g);
  it.ok = g > 0; if (it.ok) s.correct++;
  recordAnswer(it.ok);
  nextItem();
}

/* ───────── 描画 ───────── */
function render() {
  applyTheme();
  document.querySelectorAll("nav.tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === ui.tab));
  renderHeader();
  const app = $("#app");
  if (ui.edit) app.innerHTML = editView();
  else if (ui.detail) app.innerHTML = detailView();
  else if (ui.caseEdit) app.innerHTML = caseEditView();
  else if (ui.caseView) app.innerHTML = caseView();
  else app.innerHTML = ({ home: homeView, terms: termsView, study: studyView, cases: casesView, stats: statsView, settings: settingsView }[ui.tab])();
  const inp = $("#answerInput"); if (inp && !ui.session.answered) inp.focus({ preventScroll: true });
}
function renderHeader() {
  const h = $("#head");
  if (ui.edit || ui.detail || ui.caseEdit || ui.caseView) {
    const title = ui.edit ? (ui.edit === "new" ? "用語を追加" : "用語を編集") : ui.detail ? "用語の詳細" : ui.caseEdit ? (ui.caseEdit === "new" ? "新しい案件" : "案件を編集") : "案件の解説";
    h.innerHTML = `<button class="back" data-act="back" aria-label="戻る">‹ 戻る</button><div class="small muted">${title}</div><span style="width:60px"></span>`;
  } else if (ui.tab === "study" && ui.session && !ui.session.done) {
    h.innerHTML = `<button class="back" data-act="quit" aria-label="中断">✕ 中断</button><div class="small muted">${esc(ui.session.title)}</div><span style="width:60px"></span>`;
  } else {
    const st = streakInfo();
    h.innerHTML = `<div class="brand">インフラ<span>ノート</span></div><div class="row"><span class="streak" title="連続学習日数">🔥 ${st.cur}日</span><button class="iconbtn ${ui.tab === "settings" ? "on" : ""}" data-act="tab" data-tab="settings" aria-label="設定">${icon("gear", 20)}</button></div>`;
  }
}
function levelBar(terms) {
  const counts = [0, 0, 0, 0]; terms.forEach(t => counts[level(t.id)]++);
  const total = terms.length || 1;
  return `<div class="levelbar">${counts.map((c, i) => c ? `<i style="width:${c / total * 100}%;background:${LEVELS[i].color}" title="${LEVELS[i].name} ${c}"></i>` : "").join("")}</div>
  <div class="legend">${counts.map((c, i) => `<span><b style="background:${LEVELS[i].color}"></b>${LEVELS[i].name} ${c}</span>`).join("")}</div>`;
}
function termRow(t) {
  const lv = level(t.id), miss = state.missed.includes(t.id), fav = state.favorites.includes(t.id);
  return `<button class="termrow" data-act="open" data-id="${esc(t.id)}">
    <span class="dot" style="background:${LEVELS[lv].color}" title="${LEVELS[lv].name}"></span>
    <span class="grow"><span class="name">${fav ? "★ " : ""}${esc(t.term)}</span><span class="def">${esc(t.def)}</span></span>
    ${miss ? '<span class="tag ng">苦手</span>' : ""}${!t.builtin ? '<span class="tag">自作</span>' : ""}
    <span class="chev">${icon("chev", 18)}</span></button>`;
}

function homeView() {
  const terms = allTerms(), due = dueTerms(terms).length, fresh = newTermsToday(terms).length;
  const st = streakInfo(), today = state.stats.daily[localDay()] || { a: 0, c: 0 };
  const h = new Date().getHours();
  const greet = h < 5 ? "夜遅くまでおつかれさま" : h < 11 ? "おはようございます" : h < 18 ? "こんにちは" : "こんばんは";
  const daily = terms.length ? terms[(Math.floor(startOfDay() / DAY) * 7919) % terms.length] : null;
  const weak = state.missed.map(id => terms.find(t => t.id === id)).filter(Boolean).slice(0, 3);
  const total = due + fresh;
  return `
  <h1>${greet}</h1><p class="muted small">${new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}${st.today ? " ・ 今日の学習記録あり ✓" : ""}</p>
  <div class="hero">
    <span class="pill">今日の学習</span>
    ${total ? `<h2>復習 ${due}件 ＋ 新しい用語 ${fresh}件</h2><p class="muted small">思い出す練習で、記憶を長持ちさせよう。</p>
      <button class="btn full mt" data-act="today">${icon("bolt", 18)} 今日の学習を始める</button>`
      : `<h2>今日の分は完了！🎉</h2><p class="muted small">次の復習は明日以降。余裕があればドリルで腕試し。</p>
      <button class="btn secondary full mt" data-act="random">${icon("shuffle", 18)} ランダムに練習する</button>`}
  </div>
  <div class="stats">
    <div class="stat"><strong>${st.cur}</strong><span>連続学習日数</span></div>
    <div class="stat"><strong>${today.a}</strong><span>今日の解答数</span></div>
    <div class="stat"><strong>${pct(state.stats.correct, state.stats.answered)}%</strong><span>これまでの正解率</span></div>
  </div>
  <div class="row" style="gap:8px">
    <button class="btn ghost sm grow" data-act="drill-port">${icon("plug", 16)} ポート</button>
    <button class="btn ghost sm grow" data-act="drill-subnet">${icon("grid", 16)} サブネット</button>
    <button class="btn ghost sm grow" data-act="flash-today">${icon("cards", 16)} カード</button>
  </div>
  ${daily ? `<div class="card"><div class="row between"><span class="pill">今日の一語</span><span class="tag">${esc(CAT[daily.cat] || "その他")}</span></div>
    <div class="term">${esc(daily.term)}</div><p>${esc(daily.def)}</p>
    <button class="btn secondary sm mt" data-act="open" data-id="${esc(daily.id)}">くわしく見る</button></div>` : ""}
  <div class="card"><div class="row between"><h2>習得の進み具合</h2><span class="small muted">全${terms.length}語</span></div>${levelBar(terms)}</div>
  ${weak.length ? `<div class="sectiontitle"><h2>苦手な用語</h2><button class="btn ghost sm" data-act="weak">まとめて復習</button></div>
    <div class="card" style="padding:4px 14px">${weak.map(termRow).join("")}</div>` : ""}
  <button class="btn ghost full mt" data-act="new-term">＋ 用語をメモする</button>`;
}

function filteredTerms() {
  const q = norm(ui.search);
  let list = allTerms().filter(t =>
    (ui.termFilter === "all" || (ui.termFilter === "fav" ? state.favorites.includes(t.id) : ui.termFilter === "mine" ? !t.builtin : ui.termFilter === "weak" ? state.missed.includes(t.id) : t.cat === ui.termFilter)) &&
    (!q || norm([t.term, t.def, t.ex, t.mem, (t.alias || []).join(" ")].join(" ")).includes(q)));
  const catOrder = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]));
  if (ui.termSort === "cat") list.sort((a, b) => (catOrder[a.cat] ?? 99) - (catOrder[b.cat] ?? 99));
  if (ui.termSort === "weak") list.sort((a, b) => (P(b.id).wrong - P(b.id).correct * .5) - (P(a.id).wrong - P(a.id).correct * .5));
  if (ui.termSort === "name") list.sort((a, b) => a.term.localeCompare(b.term, "ja"));
  if (ui.termSort === "level") list.sort((a, b) => level(a.id) - level(b.id));
  return list;
}
function termListHTML() {
  const list = filteredTerms();
  if (!list.length) return `<div class="empty"><strong>見つかりませんでした</strong>キーワードやフィルターを変えてみよう。</div>`;
  if (ui.termSort !== "cat" || ui.search) return `<div class="card" style="padding:4px 14px">${list.map(termRow).join("")}</div>`;
  const groups = {};
  list.forEach(t => (groups[t.cat] = groups[t.cat] || []).push(t));
  return Object.keys(groups).map(c => `<div class="section-label">${esc(CAT[c] || "その他")}（${groups[c].length}）</div><div class="card" style="padding:4px 14px;margin-top:4px">${groups[c].map(termRow).join("")}</div>`).join("");
}
function termsView() {
  const terms = allTerms();
  const cnt = id => terms.filter(t => t.cat === id).length;
  const chip = (id, label) => `<button class="chip ${ui.termFilter === id ? "on" : ""}" data-act="tfilter" data-id="${id}">${label}</button>`;
  return `<div class="row between"><div><h1>用語</h1><p class="muted small">${terms.length}語 ・ タップで詳細</p></div><button class="btn" data-act="new-term">＋ 追加</button></div>
  <input class="search" id="termSearch" type="search" placeholder="用語・説明を検索…" value="${esc(ui.search)}" autocomplete="off">
  <div class="chips">${chip("all", "すべて")}${chip("fav", "★ お気に入り")}${chip("weak", "苦手")}${chip("mine", "自作")}
    ${CATEGORIES.filter(c => cnt(c.id)).map(c => chip(c.id, `${c.name} ${cnt(c.id)}`)).join("")}</div>
  <div class="row between"><span class="small muted" id="termCount">${filteredTerms().length}件</span>
    <select class="field" id="termSort" style="width:auto;padding:6px 10px;font-size:14px">
      ${[["cat", "分野順"], ["level", "習得度が低い順"], ["weak", "苦手な順"], ["name", "名前順"]].map(([v, l]) => `<option value="${v}" ${ui.termSort === v ? "selected" : ""}>${l}</option>`).join("")}
    </select></div>
  <div id="termList">${termListHTML()}</div>`;
}

function detailView() {
  const t = getTerm(ui.detail);
  if (!t) { ui.detail = null; return termsView(); }
  const p = P(t.id), lv = level(t.id), fav = state.favorites.includes(t.id);
  const rel = (t.rel || []).map(getTerm).filter(Boolean);
  const nextDue = p.seen ? (p.due <= Date.now() ? "今日" : new Date(p.due).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })) : "未学習";
  return `<div class="card">
    <div class="row wrap"><span class="pill">${esc(CAT[t.cat] || "その他")}</span>${(t.tags || []).map(g => `<span class="tag">${esc(TAGS[g] || g)}</span>`).join("")}${!t.builtin ? '<span class="tag">自作</span>' : ""}${t.edited ? '<span class="tag">編集済み</span>' : ""}</div>
    <div class="term">${esc(t.term)}</div>
    <p style="font-size:15.5px">${esc(t.def)}</p>
    ${t.ex ? `<div class="section-label">具体例</div><p>${esc(t.ex)}</p>` : ""}
    ${t.mem ? `<div class="memo">💡 ${esc(t.mem)}</div>` : ""}
    ${t.diagram && DIAGRAMS[t.diagram] ? `<div class="diagram">${DIAGRAMS[t.diagram]}</div>` : ""}
  </div>
  <div class="row" style="gap:8px">
    <button class="btn grow" data-act="quiz-term" data-id="${esc(t.id)}">${icon("study", 18)} この用語をクイズ</button>
    <button class="btn ${fav ? "" : "ghost"}" data-act="fav" data-id="${esc(t.id)}" aria-label="お気に入り">${fav ? "★" : "☆"}</button>
  </div>
  <div class="card"><h3>学習の記録</h3>
    <div class="row between small"><span>習得度</span><span><span class="dot" style="display:inline-block;background:${LEVELS[lv].color}"></span> ${LEVELS[lv].name}</span></div>
    <div class="row between small mt"><span>正解 / 不正解</span><span>${p.correct} / ${p.wrong}</span></div>
    <div class="row between small mt"><span>次の復習</span><span>${nextDue}${p.seen ? `（間隔 ${p.interval}日）` : ""}</span></div>
  </div>
  ${rel.length ? `<div class="sectiontitle"><h2>関連する用語</h2></div><div class="card" style="padding:4px 14px">${rel.map(termRow).join("")}</div>` : ""}
  <div class="row mt" style="gap:8px"><button class="btn ghost grow" data-act="edit" data-id="${esc(t.id)}">編集</button><button class="btn danger grow" data-act="delete" data-id="${esc(t.id)}">${t.builtin ? "非表示にする" : "削除"}</button></div>`;
}

function editView() {
  const isNew = ui.edit === "new";
  const t = isNew ? { term: "", cat: ui.termFilter in CAT ? ui.termFilter : "net", def: "", ex: "", mem: "", tags: [], alias: [] } : getTerm(ui.edit);
  if (!t) { ui.edit = null; return termsView(); }
  return `<h1>${isNew ? "用語を追加" : "用語を編集"}</h1><p class="muted small">短く、自分の言葉で書くのがおすすめ。追加した用語は自動でクイズに出題されます。</p>
  <form id="termForm">
    <label class="f" for="f-term">用語（必須）</label><input class="field" id="f-term" name="term" required value="${esc(t.term)}" placeholder="例：DNS">
    <label class="f" for="f-cat">分野</label><select class="field" id="f-cat" name="cat">${CATEGORIES.map(c => `<option value="${c.id}" ${t.cat === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select>
    <label class="f" for="f-def">説明（必須）</label><textarea class="field" id="f-def" name="def" required placeholder="自分の言葉で説明">${esc(t.def)}</textarea>
    <label class="f" for="f-ex">具体例</label><textarea class="field" id="f-ex" name="ex" placeholder="日常のたとえ・利用例">${esc(t.ex || "")}</textarea>
    <label class="f" for="f-mem">覚えるためのひとこと</label><input class="field" id="f-mem" name="mem" value="${esc(t.mem || "")}" placeholder="例：IP＝住所、ポート＝窓口">
    <label class="f" for="f-alias">別名・略称（記述問題で正解にする言葉。カンマ区切り）</label><input class="field" id="f-alias" name="alias" value="${esc((t.alias || []).join(", "))}" placeholder="例：Domain Name System, 名前解決">
    <label class="f">関連する資格</label><div>${Object.entries(TAGS).map(([k, v]) => `<label class="check"><input type="checkbox" name="tags" value="${k}" ${(t.tags || []).includes(k) ? "checked" : ""}>${v}</label>`).join("")}</div>
    <div class="formactions"><button type="button" class="btn ghost" data-act="back">キャンセル</button><button class="btn" type="submit">保存する</button></div>
    ${t.builtin && t.edited ? `<button type="button" class="btn danger full mt" data-act="revert" data-id="${esc(t.id)}">初期の内容に戻す</button>` : ""}
  </form>`;
}

function studyView() {
  if (ui.session) return sessionView();
  const terms = allTerms(), due = dueTerms(terms).length, fresh = newTermsToday(terms).length;
  const picked = pickedTerms();
  const mode = (act, ic, title, desc, count) => `<button class="mode" data-act="${act}"><span class="ic">${icon(ic)}</span><span class="grow"><b>${title}</b><span>${desc}</span></span>${count !== undefined ? `<span class="count">${count}</span>` : ""}</button>`;
  const cnt = id => terms.filter(t => t.cat === id).length;
  return `<h1>学習</h1><p class="muted small">答えを見ずに思い出すことが、記憶の定着につながる。</p>
  ${mode("today", "bolt", "今日の学習", "復習のタイミングが来た用語＋新しい用語", due + fresh)}
  ${mode("weak", "target", "苦手を克服", "最後に間違えた用語だけを出題", state.missed.length)}
  ${mode("pick", "filter", "分野・資格を選んで出題", "範囲を絞ってクイズやカードで練習")}
  ${ui.pickOpen ? `<div class="card">
    <h3>分野</h3><div class="chips wrapall">${CATEGORIES.filter(c => cnt(c.id)).map(c => `<button class="chip ${ui.pickCats.has(c.id) ? "on" : ""}" data-act="pcat" data-id="${c.id}">${c.name}</button>`).join("")}</div>
    <h3 class="mt">資格</h3><div class="chips wrapall">${Object.entries(TAGS).map(([k, v]) => `<button class="chip ${ui.pickTags.has(k) ? "on" : ""}" data-act="ptag" data-id="${k}">${v}</button>`).join("")}<button class="chip ${ui.pickFav ? "on" : ""}" data-act="pfav">★ お気に入り</button></div>
    <p class="small muted">対象：${picked.length}語（何も選ばなければ全範囲）</p>
    <div class="row" style="gap:8px"><button class="btn grow" data-act="pick-quiz" ${picked.length ? "" : "disabled"}>クイズ</button><button class="btn secondary grow" data-act="pick-flash" ${picked.length ? "" : "disabled"}>フラッシュカード</button></div>
  </div>` : ""}
  ${mode("flash-today", "cards", "フラッシュカード", "表で用語、裏で説明。自分で4段階評価")}
  ${mode("drill-port", "plug", "ポート番号ドリル", `よく使う${PORTS.length}種類のポート番号`)}
  ${mode("drill-subnet", "grid", "サブネット計算ドリル", "ネットワークアドレス・ホスト数などを毎回ランダム出題")}
  ${mode("random", "shuffle", "全範囲ランダム", `全${terms.length}語からランダムに${state.settings.quizSize}問`)}
  <p class="small muted">出題形式や問題数は「設定」で変更できます。</p>`;
}
function sessionView() {
  const s = ui.session;
  if (s.done) {
    const wrong = s.items.filter(it => it.ok === false);
    const rate = pct(s.correct, s.items.length);
    return `<div class="card" style="text-align:center">
      <div style="font-size:44px">${rate >= 80 ? "🎉" : rate >= 50 ? "👍" : "💪"}</div>
      <h1>${rate >= 80 ? "すばらしい！" : rate >= 50 ? "いい調子！" : "おつかれさま！"}</h1>
      <p class="muted">${s.items.length}問中 <strong class="ok-t">${s.correct}問</strong> 正解（${rate}%）</p>
      <div class="progress mt"><i style="width:${rate}%"></i></div></div>
      ${wrong.length ? `<div class="sectiontitle"><h2>間違えた問題</h2></div><div class="card" style="padding:4px 14px">${wrong.map(it => it.term ? termRow(it.term) : `<div class="termrow"><span class="grow"><span class="name">${esc(it.q.prompt)}</span><span class="def">正解：${esc(it.q.kind === "mc" ? it.q.choices[it.q.answer] : it.q.display)}</span></span></div>`).join("")}</div>
        <button class="btn full" data-act="retry">間違えた問題をもう一度</button>` : ""}
      <button class="btn ${wrong.length ? "secondary" : ""} full mt" data-act="again">同じ範囲でもう一度</button>
      <button class="btn ghost full mt" data-act="end">学習メニューへ戻る</button>`;
  }
  const head = `<div class="qhead"><span class="pill">${s.i + 1} / ${s.items.length}</span><span class="small muted">正解 ${s.correct}</span></div>
    <div class="progress" style="margin:10px 0"><i style="width:${s.i / s.items.length * 100}%"></i></div>`;
  if (s.kind === "flash") {
    const t = getTerm(s.items[s.i].src.id);
    if (!t) return `<div class="card">${head}<p class="muted">この用語は削除されました。</p><button class="btn full" data-act="next">次へ</button></div>`;
    return `<div class="card">${head}
      <div class="flash" data-act="reveal">
        <span class="small muted">${esc(CAT[t.cat] || "")}</span>
        <div class="front">${esc(t.term)}</div>
        ${s.revealed ? `<p style="text-align:left;margin-top:14px">${esc(t.def)}</p>${t.mem ? `<div class="memo" style="text-align:left">💡 ${esc(t.mem)}</div>` : ""}` : `<p class="muted small mt">意味を思い出してからタップ</p>`}
      </div>
      ${s.revealed ? `<p class="small muted" style="text-align:center">どのくらい思い出せた？</p><div class="rate">
        <button class="r-again" data-act="rate" data-g="0">もう一度<small>忘れた</small></button>
        <button class="r-hard" data-act="rate" data-g="1">難しい<small>なんとか</small></button>
        <button class="r-good" data-act="rate" data-g="2">普通<small>思い出せた</small></button>
        <button class="r-easy" data-act="rate" data-g="3">簡単<small>即答</small></button></div>`
        : `<button class="btn full mt" data-act="reveal">答えを見る</button>`}
    </div>`;
  }
  const it = currentItem(), q = it.q, a = s.answered;
  let body = "";
  if (q.kind === "mc") {
    body = q.choices.map((c, i) => {
      let cls = "";
      if (a) { if (i === q.answer) cls = "correct"; else if (i === it.user) cls = "wrong"; }
      return `<button class="choice ${cls}" data-act="answer" data-v="${i}" ${a ? "disabled" : ""}><span class="k">${"ABCD"[i]}</span><span>${esc(c)}</span></button>`;
    }).join("");
  } else if (q.kind === "tf") {
    const cls = v => a ? (v === q.answer ? "correct" : v === it.user ? "wrong" : "") : "";
    body = `<div class="tfrow"><button class="choice ${cls(true)}" data-act="answer" data-v="true" ${a ? "disabled" : ""} aria-label="正しい">○</button><button class="choice ${cls(false)}" data-act="answer" data-v="false" ${a ? "disabled" : ""} aria-label="正しくない">×</button></div>`;
  } else {
    body = `<form id="answerForm" class="mt"><input class="field" id="answerInput" ${q.numeric ? 'inputmode="numeric"' : ""} autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="答えを入力" value="${a ? esc(it.user) : ""}" ${a ? "disabled" : ""}>
      ${a ? "" : `<div class="row mt" style="gap:8px"><button class="btn grow" type="submit">答え合わせ</button><button class="btn ghost" type="button" data-act="giveup">わからない</button></div>${q.hint ? `<p class="small muted">ヒント：${esc(q.hint)}</p>` : ""}`}</form>`;
  }
  let fb = "";
  if (a) {
    const correctText = q.kind === "input" ? `<br>正解：<strong>${esc(q.display)}</strong>` : "";
    fb = `<div class="feedback ${it.ok ? "ok" : "ng"}"><strong class="${it.ok ? "ok-t" : "ng-t"}">${it.ok ? "正解！" : "不正解"}</strong>${correctText}${q.why ? `<br>${esc(q.why)}` : ""}</div>
      ${!it.ok && q.kind === "input" && it.user ? `<button class="btn ghost sm" data-act="override">表記ゆれなので正解にする</button>` : ""}
      ${it.term ? `<button class="btn ghost sm" data-act="open" data-id="${esc(it.term.id)}" style="margin-left:4px">用語を見る</button>` : ""}
      <button class="btn full mt" data-act="next">${s.i + 1 >= s.items.length ? "結果を見る" : "次の問題へ →"}</button>`;
  }
  return `<div class="card">${head}
    <div class="qtext">${esc(q.prompt)}</div>${q.sub ? `<div class="qsub">${esc(q.sub)}</div>` : ""}
    ${body}${fb}</div>`;
}

function chart14() {
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const data = days.map(d => state.stats.daily[localDay(d)] || { a: 0, c: 0 });
  const max = Math.max(5, ...data.map(x => x.a));
  const W = 340, H = 150, bw = 16, gap = (W - 20 - bw * 14) / 13, base = 120;
  const bars = data.map((x, i) => {
    const xPos = 10 + i * (bw + gap), hA = x.a / max * 100, hC = x.c / max * 100;
    return `<rect class="bar dim" x="${xPos}" y="${base - hA}" width="${bw}" height="${hA}" rx="3"><title>${localDay(days[i])}：${x.a}問中${x.c}問正解</title></rect>` +
      (x.c ? `<rect class="bar" x="${xPos}" y="${base - hC}" width="${bw}" height="${hC}" rx="3"/>` : "") +
      ((i % 2 === 1 || i === 13) ? `<text x="${xPos + bw / 2}" y="${base + 16}" text-anchor="middle">${days[i].getDate()}</text>` : "");
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="直近14日の解答数"><line class="axis" x1="6" x2="${W - 6}" y1="${base + .5}" y2="${base + .5}"/>${bars}<text x="${W - 6}" y="12" text-anchor="end">最大 ${max}問</text></svg>
  <div class="legend"><span><b style="background:var(--accent)"></b>正解</span><span><b style="background:var(--lv1)"></b>不正解</span></div>`;
}
function statsView() {
  const terms = allTerms(), st = streakInfo(), s = state.stats;
  const cats = CATEGORIES.map(c => {
    const ts = terms.filter(t => t.cat === c.id);
    if (!ts.length) return "";
    const learned = ts.filter(t => level(t.id) >= 2).length;
    const cor = ts.reduce((n, t) => n + P(t.id).correct, 0), wr = ts.reduce((n, t) => n + P(t.id).wrong, 0);
    return `<div class="hbar"><div class="lbl"><span>${c.name}</span><span>定着 ${learned}/${ts.length}・正解率 ${cor + wr ? pct(cor, cor + wr) + "%" : "—"}</span></div><div class="progress"><i style="width:${pct(learned, ts.length)}%"></i></div></div>`;
  }).join("");
  const weak = terms.filter(t => P(t.id).wrong > 0).sort((a, b) => (P(b.id).wrong - P(b.id).correct * .5) - (P(a.id).wrong - P(a.id).correct * .5)).slice(0, 5);
  const d = s.drills;
  return `<h1>進捗</h1><p class="muted small">完璧を目指すより、何度も思い出す。</p>
  <div class="stats four">
    <div class="stat"><strong>${s.answered}</strong><span>総解答数</span></div>
    <div class="stat"><strong>${pct(s.correct, s.answered)}%</strong><span>正解率</span></div>
    <div class="stat"><strong>${st.cur}日</strong><span>連続学習</span></div>
    <div class="stat"><strong>${st.best}日</strong><span>最長連続</span></div>
  </div>
  <div class="card"><h2>直近14日の学習量</h2>${chart14()}</div>
  <div class="card"><h2>習得度</h2>${levelBar(terms)}<p class="small muted">「定着中」は復習間隔が7日以上、「習得」は21日以上になった用語です。</p></div>
  <div class="card"><h2>分野ごとの定着度</h2>${cats}</div>
  <div class="card"><h2>ドリルの成績</h2>
    <div class="row between small"><span>ポート番号</span><span>${d.port.a}問・正解率 ${d.port.a ? pct(d.port.c, d.port.a) + "%" : "—"}</span></div>
    <div class="row between small mt"><span>サブネット計算</span><span>${d.subnet.a}問・正解率 ${d.subnet.a ? pct(d.subnet.c, d.subnet.a) + "%" : "—"}</span></div></div>
  ${weak.length ? `<div class="sectiontitle"><h2>間違えやすい用語</h2></div><div class="card" style="padding:4px 14px">${weak.map(termRow).join("")}</div>` : ""}`;
}

function settingsView() {
  const s = state.settings;
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${s[key] === v ? "on" : ""}" data-act="set" data-key="${key}" data-v="${v}">${l}</button>`).join("")}</div>`;
  return `<h1>設定</h1>
  <div class="card">
    <div class="setting"><span>テーマ</span>${seg("theme", [["auto", "自動"], ["light", "ライト"], ["dark", "ダーク"]])}</div>
    <div class="setting"><span>1回の問題数</span>${seg("quizSize", [[5, "5"], [10, "10"], [20, "20"]])}</div>
    <div class="setting"><span>1日に覚える新しい用語</span>${seg("newPerDay", [[5, "5"], [10, "10"], [20, "20"], [30, "30"]])}</div>
  </div>
  <div class="card"><h2>出題形式</h2><p class="small muted">用語クイズで使う形式を選べます（手書きの問題は常に出題されます）。</p>
    ${Object.entries(TYPE_NAMES).map(([k, v]) => `<label class="check" style="display:flex"><input type="checkbox" data-act="type" data-key="${k}" ${s.types[k] ? "checked" : ""}>${v}</label>`).join("")}
  </div>
  <div class="card"><h2>データの管理</h2>
    <p class="small muted">メモや進捗はこの端末のブラウザ内に保存されます。Safariのデータを消すと失われる場合があるため、定期的にバックアップしてください。</p>
    <div class="stack"><button class="btn secondary full" data-act="export">バックアップを書き出す</button>
    <button class="btn ghost full" data-act="import">バックアップを読み込む</button>
    <input type="file" id="importFile" accept="application/json,.json" class="hide">
    ${state.hidden.length ? `<button class="btn ghost full" data-act="unhide">非表示にした初期用語を元に戻す（${state.hidden.length}件）</button>` : ""}
    <button class="btn danger full" data-act="reset-progress">学習の記録だけリセット</button>
    <button class="btn danger full" data-act="reset-all">すべて初期状態に戻す</button></div>
  </div>
  <p class="small muted" style="text-align:center">インフラノート v${APP_VERSION} ・ 初期用語 ${TERMS.length}語 ・ 自作 ${state.userTerms.length}語 ・ 案件 ${state.cases.length}件</p>`;
}

/* ───────── テーマ ───────── */
function applyTheme() {
  const t = state.settings.theme, root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-theme"); else root.dataset.theme = t;
  const dark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? "#14211c" : "#ffffff";
}

/* ───────── トースト ───────── */
let toastTimer;
function toast(msg, action) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button id="toastBtn">${esc(action.label)}</button>` : ""}`;
  el.classList.remove("hide");
  if (action) $("#toastBtn").onclick = () => { el.classList.add("hide"); action.fn(); };
  clearTimeout(toastTimer);
  if (!action) toastTimer = setTimeout(() => el.classList.add("hide"), 2400);
}

/* ───────── 操作 ───────── */
function goTab(t) { ui.tab = t; ui.detail = null; ui.edit = null; ui.caseView = null; ui.caseEdit = null; render(); window.scrollTo(0, 0); }
const actions = {
  tab: el => goTab(el.dataset.tab),
  back: () => {
    if (ui.edit) { const id = ui.edit; ui.edit = null; if (id !== "new" && getTerm(id)) ui.detail = id; }
    else if (ui.detail) ui.detail = null;
    else if (ui.caseEdit) ui.caseEdit = null;
    else ui.caseView = null;
    render();
  },
  open: el => { ui.detail = el.dataset.id; ui.edit = null; render(); window.scrollTo(0, 0); },
  today: () => startToday(),
  random: () => startSession({ title: "全範囲ランダム", sources: termSources(allTerms()) }),
  weak: () => {
    const ts = state.missed.map(getTerm).filter(Boolean);
    if (!ts.length) return toast("苦手な用語はありません。いい調子！");
    startSession({ title: "苦手を克服", sources: termSources(ts, ts.length) });
  },
  pick: () => { ui.pickOpen = !ui.pickOpen; render(); },
  pcat: el => { const id = el.dataset.id; ui.pickCats.has(id) ? ui.pickCats.delete(id) : ui.pickCats.add(id); render(); },
  ptag: el => { const id = el.dataset.id; ui.pickTags.has(id) ? ui.pickTags.delete(id) : ui.pickTags.add(id); render(); },
  pfav: () => { ui.pickFav = !ui.pickFav; render(); },
  "pick-quiz": () => startSession({ title: "選んだ範囲のクイズ", sources: termSources(pickedTerms()) }),
  "pick-flash": () => startSession({ title: "フラッシュカード", kind: "flash", sources: termSources(pickedTerms(), 20) }),
  "flash-today": () => {
    const terms = allTerms();
    const list = [...dueTerms(terms), ...newTermsToday(terms)];
    startSession({ title: "フラッシュカード", kind: "flash", sources: (list.length ? list.slice(0, 30) : shuffle(terms.slice()).slice(0, 20)).map(t => ({ t: "term", id: t.id })) });
  },
  "drill-port": () => startSession({ title: "ポート番号ドリル", sources: Array.from({ length: state.settings.quizSize }, () => ({ t: "port" })) }),
  "drill-subnet": () => startSession({ title: "サブネット計算ドリル", sources: Array.from({ length: state.settings.quizSize }, () => ({ t: "subnet" })) }),
  "quiz-term": el => {
    const types = shuffle(["def", "term", "tf", "input"]).slice(0, 3);
    startSession({ title: "この用語をクイズ", sources: types.map(type => ({ t: "term", id: el.dataset.id, type })) });
  },
  answer: el => { const v = el.dataset.v; submitAnswer(v === "true" ? true : v === "false" ? false : Number(v)); },
  giveup: () => submitAnswer(""),
  override: () => overrideCorrect(),
  next: () => nextItem(),
  reveal: () => { if (!ui.session.revealed) { ui.session.revealed = true; render(); } },
  rate: el => rateFlash(Number(el.dataset.g)),
  quit: () => { if (ui.session.i === 0 && !ui.session.answered || confirm("学習を中断しますか？（ここまでの記録は保存されます）")) { ui.session = null; render(); } },
  end: () => { ui.session = null; render(); window.scrollTo(0, 0); },
  retry: () => {
    const s = ui.session, wrong = s.items.filter(it => it.ok === false);
    startSession({ title: "間違えた問題の復習", kind: s.kind, sources: wrong.map(it => ({ ...it.src })) });
  },
  again: () => {
    const s = ui.session;
    startSession({ title: s.title, kind: s.kind, sources: s.items.map(it => ({ ...it.src })).sort(() => Math.random() - .5) });
  },
  tfilter: el => { ui.termFilter = el.dataset.id; render(); },
  "new-term": () => { ui.edit = "new"; ui.detail = null; if (ui.tab !== "terms") ui.tab = "terms"; render(); window.scrollTo(0, 0); },
  edit: el => { ui.edit = el.dataset.id; render(); window.scrollTo(0, 0); },
  fav: el => {
    const id = el.dataset.id;
    state.favorites = state.favorites.includes(id) ? state.favorites.filter(x => x !== id) : [...state.favorites, id];
    save(); render();
  },
  delete: el => {
    const t = getTerm(el.dataset.id); if (!t) return;
    if (t.builtin) {
      if (!confirm(`「${t.term}」を非表示にしますか？（設定から元に戻せます）`)) return;
      state.hidden.push(t.id);
    } else {
      if (!confirm(`「${t.term}」を削除しますか？`)) return;
      state.userTerms = state.userTerms.filter(x => x.id !== t.id);
      delete state.progress[t.id];
    }
    state.missed = state.missed.filter(x => x !== t.id);
    state.favorites = state.favorites.filter(x => x !== t.id);
    save(); ui.detail = null; render(); toast(t.builtin ? "非表示にしました" : "削除しました");
  },
  revert: el => { delete state.overrides[el.dataset.id]; save(); ui.edit = null; ui.detail = el.dataset.id; render(); toast("初期の内容に戻しました"); },
  set: el => {
    const k = el.dataset.key, v = el.dataset.v;
    state.settings[k] = k === "theme" ? v : Number(v);
    save(); render();
  },
  export: () => {
    const data = { app: "infra-note", exported: new Date().toISOString(), ...state };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `infra-note-backup-${localDay()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("バックアップを書き出しました");
  },
  import: () => $("#importFile").click(),
  unhide: () => { const n = state.hidden.length; state.hidden = []; save(); render(); toast(`${n}件の用語を元に戻しました`); },
  "reset-progress": () => {
    if (!confirm("学習の記録（進捗・正解数・学習日）をリセットしますか？用語はそのまま残ります。")) return;
    const d = defaultState();
    Object.assign(state, { progress: {}, missed: [], stats: d.stats, studyDays: [] });
    save(); render(); toast("学習の記録をリセットしました");
  },
  "reset-all": () => {
    if (!confirm("自作の用語・案件・編集内容・進捗・設定をすべて初期状態に戻しますか？この操作は取り消せません。")) return;
    state = defaultState(); save(); ui.session = null; goTab("home"); toast("初期状態に戻しました");
  }
};

Object.assign(actions, CASE_ACTIONS);
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el || el.tagName === "INPUT") return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.act === "type") {
    state.settings.types[el.dataset.key] = el.checked;
    if (!Object.values(state.settings.types).some(Boolean)) { state.settings.types[el.dataset.key] = true; el.checked = true; toast("1つ以上選んでください"); }
    save();
  }
  if (el.id === "termSort") { ui.termSort = el.value; $("#termList").innerHTML = termListHTML(); }
  if (el.id === "importFile") importBackup(el.files[0]);
});
document.addEventListener("input", e => {
  if (e.target.id === "termSearch") {
    ui.search = e.target.value;
    $("#termList").innerHTML = termListHTML();
    $("#termCount").textContent = `${filteredTerms().length}件`;
  }
});
document.addEventListener("submit", e => {
  e.preventDefault();
  if (e.target.id === "answerForm") submitAnswer($("#answerInput").value.trim());
  if (e.target.id === "termForm") saveTermForm(new FormData(e.target));
  if (e.target.id === "caseForm") saveCaseForm(new FormData(e.target));
});
function saveTermForm(f) {
  const t = {
    term: String(f.get("term")).trim(), cat: f.get("cat"), def: String(f.get("def")).trim(),
    ex: String(f.get("ex")).trim(), mem: String(f.get("mem")).trim(), tags: f.getAll("tags"),
    alias: String(f.get("alias")).split(/[,，、]/).map(s => s.trim()).filter(Boolean)
  };
  if (!t.term || !t.def) return toast("用語と説明は必須です");
  let id = ui.edit;
  if (id === "new") {
    id = "term-" + Date.now();
    state.userTerms.unshift({ id, ...t, created: Date.now() });
  } else {
    const u = state.userTerms.find(x => x.id === id);
    if (u) Object.assign(u, t);
    else state.overrides[id] = t;
  }
  save(); ui.edit = null; ui.detail = id; ui.search = ""; render(); window.scrollTo(0, 0); toast("用語を保存しました");
}
async function importBackup(file) {
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    let next;
    if (d.version === 2 && d.progress) next = normalizeState(d);
    else if (Array.isArray(d.terms)) next = migrateV1(d);
    else throw new Error("format");
    delete next.app; delete next.exported;
    if (!confirm("今のデータをバックアップの内容で置き換えますか？")) return;
    state = next; save(); ui.session = null; goTab("home"); toast("バックアップを読み込みました");
  } catch (err) { alert("バックアップファイルを読み込めませんでした"); }
  finally { const el = $("#importFile"); if (el) el.value = ""; }
}

/* ───────── 起動 ───────── */
document.querySelectorAll("nav.tabs button").forEach(b => { b.innerHTML = icon(b.dataset.icon) + b.textContent; b.dataset.act = "tab"; });
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);
render();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").then(reg => {
    const prompt = w => toast("新しいバージョンがあります", { label: "更新する", fn: () => w.postMessage("skipWaiting") });
    if (reg.waiting && navigator.serviceWorker.controller) prompt(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) prompt(w); });
    });
  }).catch(() => { });
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
}
