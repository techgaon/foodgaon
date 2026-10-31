// Turn any on-screen element (bill, weekly statement, report) into an A4 PDF.
// Rendering via html2canvas keeps Hindi (Devanagari) text exactly as shown on screen.
import { isNative } from './native.js';

export async function elementToPdf(el, fileName = 'FoodGaon.pdf', title = 'FoodGaon') {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  el.setAttribute('data-pdf-target', '1');
  // always render at A4-friendly width, even on a small phone screen
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 640,
    onclone: (d) => { const c = d.querySelector('[data-pdf-target]'); if (c) { c.style.width = '560px'; c.style.maxWidth = 'none'; } } });
  el.removeAttribute('data-pdf-target');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight();
  const m = 8; const w = pw - m * 2;
  const pxPerMm = canvas.width / w; const pageH = Math.floor((ph - m * 2) * pxPerMm);
  for (let y = 0, page = 0; y < canvas.height; y += pageH, page++) {
    const slice = document.createElement('canvas');
    slice.width = canvas.width; slice.height = Math.min(pageH, canvas.height - y);
    slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
    if (page) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, w, slice.height / pxPerMm);
  }
  pdf.setProperties({ title });
  if (!isNative) { pdf.save(fileName); return true; }
  const base64 = pdf.output('datauristring').split(',')[1];
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const r = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
  await Share.share({ title, text: title, url: r.uri, dialogTitle: 'Save or share PDF' });
  return true;
}

/** save / share any data URL (photo or PDF) — browser download, or the phone's share sheet in the app */
export async function saveDataUrl(dataUrl, fileName = 'FoodGaon-file') {
  const ext = /^data:application\/pdf/.test(dataUrl) ? '.pdf' : /^data:image\/png/.test(dataUrl) ? '.png' : '.jpg';
  const name = /\.[a-z0-9]{2,4}$/i.test(fileName) ? fileName : fileName.replace(/[^\w\-]+/g, '_').slice(0, 60) + ext;
  if (!isNative) {
    const blob = await (await fetch(dataUrl)).blob();
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 60000);
    return true;
  }
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  try { await Filesystem.writeFile({ path: 'FoodGaon/' + name, data: base64, directory: Directory.Documents, recursive: true }); } catch { /* keep going: share still works */ }
  const r = await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache });
  await Share.share({ title: name, url: r.uri, dialogTitle: 'Save or share' });
  return true;
}
/** open a data URL in a new tab (PDF) */
export async function openDataUrl(dataUrl, fileName) {
  if (isNative) return saveDataUrl(dataUrl, fileName);
  const u = URL.createObjectURL(await (await fetch(dataUrl)).blob());
  window.open(u, '_blank');
  return true;
}
