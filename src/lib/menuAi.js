// Read menu cards (photos and/or PDF) with Gemini (Firebase AI Logic, Gemini Developer API).
// Returns { dishes: [{ name, price, cat, photoKey, search, kcal, qty, desc, story, veg }], engine }
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import { app } from './fb.js';
import { compressImage } from './utils.js';
import { AI_MODELS, prepareAI } from './aiClient.js';

const MODELS = AI_MODELS;
export const CATS = ['sweets', 'lassi', 'chinese', 'fastfood', 'northindian', 'chaat', 'thali', 'southindian', 'icecream'];

const SCHEMA = Schema.object({
  properties: {
    dishes: Schema.array({
      items: Schema.object({
        properties: {
          name: Schema.string(), price: Schema.number(), category: Schema.enumString({ enum: CATS }),
          photoKey: Schema.string(), search: Schema.string(), kcal: Schema.integer(), serving: Schema.string(),
          desc: Schema.string(), hindiLine: Schema.string(), veg: Schema.boolean(), onMrp: Schema.boolean(),
        },
        optionalProperties: ['photoKey', 'kcal', 'serving', 'desc', 'hindiLine', 'search', 'onMrp'],
      }),
    }),
  },
});

export const isPdf = (f) => f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''));

const toB64 = (file) => new Promise((ok, bad) => {
  const fr = new FileReader();
  fr.onerror = () => bad(new Error('Could not read the file'));
  fr.onload = () => ok(String(fr.result).split(',')[1]);
  fr.readAsDataURL(file);
});

/* PDF → page images (for big PDFs and for the offline fallback) */
async function pdfLib() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(`${import.meta.env.BASE_URL}pdf.worker.min.js`, location.href).href;
  return pdfjs;
}
export async function pdfPages(file, maxPages = 8) {
  const pdfjs = await pdfLib();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out = [];
  for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
    const page = await doc.getPage(p);
    const vp0 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: Math.min(3, 2200 / Math.max(vp0.width, vp0.height)) });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise; // 'print' = no requestAnimationFrame (works in background/webview)
    out.push(c.toDataURL('image/jpeg', 0.85));
  }
  return out;
}
/* Digital PDF: exact text lines per page (no OCR needed) */
export async function pdfPageTexts(file, maxPages = 20) {
  const pdfjs = await pdfLib();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const rows = {};
    tc.items.forEach((it) => { if (!it.str?.trim()) return; const y = Math.round(it.transform[5] / 4); (rows[y] = rows[y] || []).push(it); });
    pages.push(Object.keys(rows).sort((x, y) => y - x).map((y) => rows[y].sort((m, n) => m.transform[4] - n.transform[4]).map((i) => i.str.trim()).join('   ')).join('\n'));
  }
  return pages;
}
export async function pdfText(file) { return (await pdfPageTexts(file)).join('\n'); }

/* Split the input into small "units" (one photo or one PDF page each) so even a 200-dish menu
   is read completely — one big request would hit the AI's answer-length limit. */
async function unitsOf(files, onStatus) {
  const units = [];
  for (const f of files) {
    if (isPdf(f)) {
      onStatus?.('Preparing PDF pages…');
      let pages = []; let texts = [];
      try { pages = await withTimeout(pdfPages(f, 20), 60000); } catch (e) { console.warn('pdf render', e); pages = []; }
      try { texts = await withTimeout(pdfPageTexts(f, 20), 30000); } catch { texts = []; }
      if (pages.length) pages.forEach((u, k) => units.push({ label: `page ${k + 1}`, hint: (texts[k] || '').slice(0, 12000), part: { inlineData: { mimeType: 'image/jpeg', data: u.split(',')[1] } } }));
      else units.push({ label: 'PDF', part: { inlineData: { mimeType: 'application/pdf', data: await toB64(f) } } });
    } else {
      const u = await compressImage(f, 2600, 2600000);
      units.push({ label: `photo ${units.length + 1}`, part: { inlineData: { mimeType: 'image/jpeg', data: u.split(',')[1] } } });
    }
  }
  return units;
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, bad) => setTimeout(() => bad(new Error('timeout')), ms))]);

/* Short human reason for the user (also helps support) */
export function aiReason(e) {
  const m = String(e?.message || e || '');
  if (/App.?Check|appCheck|recaptcha/i.test(m)) return 'App verification failed — reopen FoodGaon and try again';
  if (/timeout/i.test(m)) return 'AI took too long (slow internet?)';
  if (/\[429|quota|exhaust|RESOURCE_EXHAUSTED/i.test(m)) return 'AI daily free limit reached — try after some time';
  if (/\[40[13]|PERMISSION_DENIED|API key|referer|blocked/i.test(m)) return 'AI access blocked for this app (API key)';
  if (/\[404|not found/i.test(m)) return 'AI model not available';
  if (/\[400|INVALID_ARGUMENT/i.test(m)) return 'AI could not accept this file';
  if (/\[5\d\d/.test(m)) return 'AI server busy — try again';
  if (/JSON|Unexpected token/i.test(m)) return 'AI reply was incomplete';
  if (/Failed to fetch|NetworkError|network|offline/i.test(m)) return 'No internet / network blocked';
  return m.slice(0, 120) || 'AI error';
}

const clean = (d) => ({
  name: String(d.name).trim().slice(0, 60),
  price: Math.round(Number(String(d.price ?? '').replace(/[^\d.]/g, '')) || 0),
  cat: CATS.includes(d.category) ? d.category : '',
  photoKey: String(d.photoKey || ''),
  search: String(d.search || d.name || '').slice(0, 60),
  kcal: Math.round(Number(d.kcal) || 0),
  qty: String(d.serving || '').slice(0, 30),
  desc: String(d.desc || '').slice(0, 80),
  story: String(d.hindiLine || '').slice(0, 140),
  veg: d.veg !== false,
  onMrp: d.onMrp === true,
});

function promptFor(library) {
  const keys = library.map((d) => `${d.key} = ${d.name}`).join('\n');
  return `This image is ONE PAGE of the MENU CARD of an Indian vegetarian restaurant (Hindi and/or English, 1-3 columns, decorative fonts, maybe handwritten or a photo taken at an angle). The page may also be a cover page or notes page with no dishes — then return {"dishes":[]}.
TASK: List EVERY dish on this page exactly as printed with its correct price. Do not stop early — long pages can have 60+ dishes; include all of them, in every column.
RULES:
- A plain typed or handwritten list of dish names WITHOUT prices is also a valid menu. Include every dish even when no price is printed. Set price: 0 and onMrp: false for missing or unreadable prices; the owner will enter the price later. NEVER invent a price or mark a missing price as MRP.
- Read sparse lists anywhere on the page, including screenshots of a document with large blank margins. Romanized Hindi food names are valid dishes; normalize obvious spelling mistakes without replacing an unfamiliar regional dish with another dish.
- Read carefully row by row and column by column. The price belongs to the dish on the SAME row / nearest on the right. Never shift prices between rows.
- Read the full number (e.g. 120 not 12, 1,250 = 1250). Ignore "Rs", "₹", "/-".
- If the price is written as "On MRP", "MRP", "As per MRP" or "एमआरपी" (packaged items like water bottle, cold drink, curd cup) set onMrp: true and price: 0 — unless an exact number is printed, then put that number and onMrp: true.
- If a dish has several prices (Half/Full, Small/Medium/Large, 250g/500g/1kg, Plate/Piece) make ONE entry per price and add the size in brackets, e.g. "Paneer Butter Masala (Half)". A "-" means that size is not available: skip it.
- Prices like "10/Pc" or "60/2Pc": price is the number, put the pieces in serving and in the name, e.g. "Rasmalai (2 Pc)".
- If a section heading gives the size/price (e.g. "All Shakes ₹80"), apply it to each dish under it. A thali/combo is one dish; put its contents in desc.
- Do NOT invent dishes. Skip headings, phone numbers, address, GST/tax notes, "extra" lines without a dish.
- name: as a customer would read it, in English letters (transliterate Hindi: "पनीर बटर मसाला" → "Paneer Butter Masala"). Fix obvious spelling mistakes only (e.g. "Cof fee" → "Coffee").
- category: one of ${CATS.join(', ')}.
- photoKey: key of the SAME dish from this photo library, only if it is really the same dish (e.g. "Kadai Paneer" ≠ "Paneer Tikka"); else "":
${keys}
- search: 2-4 English words to find a real photo of this dish (e.g. "kadai paneer curry", "veg hakka noodles").
- kcal (rough, for the serving), serving (e.g. "1 plate", "2 pieces", "1 glass"), desc (≤8 English words).
- hindiLine: ONE short attractive Hindi line (≤12 words; feeling + hint, not a recipe), different for every dish, e.g. Jalebi: "राष्ट्रीय मिठाई, मीठे रस में डूबी — जो भर दे रिश्तों में मिठास।"
- veg: false only for egg/chicken/mutton/fish dishes.`;
}

/* Read one page/photo; tries the models in order, waits once on the free-tier rate limit */
async function readUnit(ai, prompt, unit) {
  const errs = [];
  for (const name of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = getGenerativeModel(ai, { model: name, generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0, maxOutputTokens: 65536 } }, { timeout: 170000 });
        const hint = unit.hint && unit.hint.replace(/\s/g, '').length > 40 ? `\n\nTEXT LAYER of this same page (extracted from the PDF, reading order may be mixed between columns). Use it to be sure you list EVERY dish and read every price correctly — every dish line below must appear in your answer (one entry per available size):\n${unit.hint}` : '';
        const r = await withTimeout(model.generateContent([prompt + hint, unit.part]), 180000);
        const txt = r.response.text().trim().replace(/^```(json)?/i, '').replace(/```$/, '');
        const json = JSON.parse(txt);
        return { dishes: (json.dishes || []).filter((d) => d && d.name && String(d.name).trim().length > 1).map(clean), engine: name };
      } catch (e) {
        console.warn('menu AI', unit.label, name, e); errs.push(e);
        const m = String(e?.message);
        if (/\[40[13]|API key|App Check/i.test(m)) throw e; // access problem: no point trying more
        if (/\[429|RESOURCE_EXHAUSTED|quota/i.test(m) && attempt === 0) { await new Promise((ok) => setTimeout(ok, 20000)); continue; }
        break; // next model
      }
    }
  }
  throw errs[errs.length - 1] || new Error('AI error');
}

/* rough number of priced entries printed on a page (from the PDF text layer) */
function expectedCount(hint) {
  if (!hint) return 0;
  return (hint.match(/(?:^|\s)(?:\d{2,4}(?:\/[-A-Za-z0-9]*)?|MRP|Rs\.?\s*\d{2,4}\/?-?)(?=\s|$)/gim) || []).length;
}
async function readUnitChecked(ai, prompt, unit) {
  const first = await readUnit(ai, prompt, unit);
  const want = expectedCount(unit.hint);
  if (want >= 8 && first.dishes.length < want * 0.85) {
    try {
      const again = await readUnit(ai, `${prompt}\n\nIMPORTANT: a previous reading of this page found only ${first.dishes.length} entries, but the page has about ${want} prices. Read the WHOLE page again, every section and every column, and list ALL dishes.`, unit);
      if (again.dishes.length > first.dishes.length) return again;
    } catch (e) { console.warn('recheck', e); }
  }
  return first;
}

export async function readMenuWithAI(files, library, onStatus) {
  try { await prepareAI(); }
  catch (error) { throw new Error(aiReason(error)); }
  const list = Array.isArray(files) ? files : [files];
  const units = await unitsOf(list, onStatus);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const prompt = promptFor(library);
  const results = new Array(units.length); const errs = []; let next = 0; let doneN = 0; let found = 0; let engine = '';
  onStatus?.(units.length > 1 ? `AI is reading ${units.length} pages…` : 'AI is reading dish names & prices…', 0);
  const worker = async () => {
    while (next < units.length) {
      const k = next++;
      try { const r = await readUnitChecked(ai, prompt, units[k]); results[k] = r.dishes; engine = engine || r.engine; found += r.dishes.length; }
      catch (e) { errs.push({ label: units[k].label, e }); if (/\[40[13]|API key|App Check/i.test(String(e?.message))) { next = units.length; } }
      doneN++;
      onStatus?.(units.length > 1 ? `Page ${doneN}/${units.length} read — ${found} dishes so far` : `${found} dishes found`, doneN / units.length);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  // merge pages in order, drop exact duplicates (same name + price)
  const seen = new Set(); const dishes = [];
  results.forEach((l) => (l || []).forEach((d) => { const key = d.name.toLowerCase().replace(/\s+/g, ' ') + '|' + d.price; if (!seen.has(key)) { seen.add(key); dishes.push(d); } }));
  if (!dishes.length) {
    const last = errs[errs.length - 1]?.e;
    const err = new Error(last ? aiReason(last) : 'AI found no dishes');
    err.raw = errs.map((x) => `${x.label}: ${String(x.e?.message || x.e)}`).join(' | ');
    throw err;
  }
  return { dishes, engine, failed: errs.map((x) => x.label), pages: units.length };
}
