// Languages: English (default, source text), हिंदी, अवधी
// UI is written in English; this module translates visible text into the chosen language.
import { DICT } from './dict.js';

export const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी' },
  { id: 'awa', label: 'अवधी' },
];
const KEY = 'pp_lang';
let lang = 'en';
try { lang = localStorage.getItem(KEY) || 'en'; } catch { /* ignore */ }
if (!LANGS.some((l) => l.id === lang)) lang = 'en';

export const getLang = () => lang;
export function setLang(l) { try { localStorage.setItem(KEY, l); } catch { /* ignore */ } location.reload(); }

const LAT = /[A-Za-z]/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const dictionaries = new Map();
let exact = null; let patterns = null;
function build(language = lang) {
  const col = language === 'awa' ? 2 : 1;
  exact = new Map(); patterns = [];
  for (const row of DICT) {
    const src = row[0]; const tgt = row[col] || row[1];
    if (!tgt) continue;
    if (src.includes('{}')) {
      const parts = src.split('{}');
      patterns.push({ re: new RegExp('^' + parts.map(esc).join('(.*?)') + '$', 's'), tgt, weight: parts.join('').length });
    } else exact.set(src.trim(), tgt);
  }
  patterns.sort((a, b) => b.weight - a.weight);
  dictionaries.set(language, { exact, patterns });
}
function fill(tgt, groups) {
  if (/\{\d\}/.test(tgt)) return tgt.replace(/\{(\d)\}/g, (_, n) => groups[+n] ?? '');
  let i = 0; return tgt.replace(/\{\}/g, () => groups[i++] ?? '');
}
export function tr(text, depth = 0, language = lang) {
  if (language === 'en' || !text || !LAT.test(text)) return text;
  if (!dictionaries.has(language)) build(language);
  const { exact, patterns } = dictionaries.get(language);
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const core = m[2];
  let out = exact.get(core);
  if (out == null && depth < 3) {
    for (const p of patterns) {
      const g = core.match(p.re);
      if (g) { out = fill(p.tgt, g.slice(1).map((x) => tr(x, depth + 1, language))); break; }
    }
  }
  return m[1] + (out ?? core) + m[3];
}
/** translate inside JS (toasts, confirm texts) */
export const t = (s) => tr(s);

const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
const seen = new WeakMap();
const skip = (el) => el && el.closest && el.closest('[data-notr], script, style, textarea, input');
function doText(n) {
  const v = n.nodeValue;
  if (seen.get(n) === v || !LAT.test(v)) return;
  if (skip(n.parentElement)) return;
  const language = n.parentElement?.closest('[data-ui-lang]')?.getAttribute('data-ui-lang') || lang;
  const x = tr(v, 0, language); seen.set(n, x); if (x !== v) n.nodeValue = x;
}
function doEl(el) {
  if (el.closest && el.closest('[data-notr]')) return;
  for (const a of ATTRS) { const v = el.getAttribute(a); if (v && LAT.test(v)) { const language = el.closest?.('[data-ui-lang]')?.getAttribute('data-ui-lang') || lang; const x = tr(v, 0, language); if (x !== v) el.setAttribute(a, x); } }
}
function walk(root) {
  if (root.nodeType === 3) { doText(root); return; }
  if (root.nodeType !== 1) return;
  doEl(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n; while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
}
export function startTranslator() {
  document.documentElement.lang = lang === 'en' ? 'en' : 'hi';
  walk(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doEl(m.target);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

/** Legacy helper: preserve selected language, including default English. */
let hiMap = null;
export function hi(src, ...vals) {
  if (lang === 'en') { let out = src; vals.forEach((v) => { out = out.replace('{}', v); }); return out; }
  const col = lang === 'awa' ? 2 : 1;
  if (!hiMap || hiMap.col !== col) { hiMap = new Map(); hiMap.col = col; for (const r of DICT) if (r[col] || r[1]) hiMap.set(r[0], r[col] || r[1]); }
  let out = hiMap.get(src) ?? src;
  vals.forEach((v) => { out = out.replace('{}', v); });
  return out;
}
