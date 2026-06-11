// ════════════════════════════════════════════════════════════
//  CMS – לומדי תורתך לשמה
//  ניהול תוכן מ-Google Sheets לכל עמודי האתר
// ════════════════════════════════════════════════════════════

const CMS_URLS = {
  home:      'https://docs.google.com/spreadsheets/d/e/2PACX-1vSq6ayNrRh04Wk81o4qi-7zsZ_Akqce3SrFuOp9zZoNCUUZXEgLmMtKJpd2f7xxwpCIZPeTCQ9Hkyov/pub?gid=650612472&single=true&output=csv',
  about:     'https://docs.google.com/spreadsheets/d/e/2PACX-1vSq6ayNrRh04Wk81o4qi-7zsZ_Akqce3SrFuOp9zZoNCUUZXEgLmMtKJpd2f7xxwpCIZPeTCQ9Hkyov/pub?gid=1699189193&single=true&output=csv',
  kollel:    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSq6ayNrRh04Wk81o4qi-7zsZ_Akqce3SrFuOp9zZoNCUUZXEgLmMtKJpd2f7xxwpCIZPeTCQ9Hkyov/pub?gid=1128347747&single=true&output=csv',
  donations: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSq6ayNrRh04Wk81o4qi-7zsZ_Akqce3SrFuOp9zZoNCUUZXEgLmMtKJpd2f7xxwpCIZPeTCQ9Hkyov/pub?gid=731756167&single=true&output=csv',
  contact:   'https://docs.google.com/spreadsheets/d/e/2PACX-1vSq6ayNrRh04Wk81o4qi-7zsZ_Akqce3SrFuOp9zZoNCUUZXEgLmMtKJpd2f7xxwpCIZPeTCQ9Hkyov/pub?gid=2115660862&single=true&output=csv',
  images:    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSq6ayNrRh04Wk81o4qi-7zsZ_Akqce3SrFuOp9zZoNCUUZXEgLmMtKJpd2f7xxwpCIZPeTCQ9Hkyov/pub?gid=338742022&single=true&output=csv',
  shiurim:   'https://docs.google.com/spreadsheets/d/e/2PACX-1vSq6ayNrRh04Wk81o4qi-7zsZ_Akqce3SrFuOp9zZoNCUUZXEgLmMtKJpd2f7xxwpCIZPeTCQ9Hkyov/pub?gid=0&single=true&output=csv',
};

// ── עמוד נוכחי לפי filename ─────────────────────────────────
function detectPage() {
  const p = location.pathname.split('/').pop().replace('.html','');
  if (!p || p === 'index') return 'home';
  return p;
}

// ── פרסור CSV ───────────────────────────────────────────────
function parseCsvLine(line) {
  const res = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1]==='"'){cur+='"';i++;} else inQ=!inQ; }
    else if (ch===',' && !inQ) { res.push(cur.trim()); cur=''; }
    else cur += ch;
  }
  res.push(cur.trim());
  return res;
}

async function fetchCsv(url) {
  try {
    const r = await fetch(url + '&t=' + Date.now());
    if (!r.ok) return [];
    const text = await r.text();
    return text.trim().split(/\r?\n/).slice(1).map(l => parseCsvLine(l));
  } catch { return []; }
}

// ── המרת קישור Drive לתמונה ישירה ──────────────────────────
function driveToImg(url) {
  const m = (url||'').match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://images.weserv.nl/?url=drive.google.com/uc%3Fexport%3Dview%26id%3D${m[1]}&w=900&q=85`;
  return url;
}

// ══════════════════════════════════════════════════════════════
//  1. טקסטים דינמיים – data-cms
// ══════════════════════════════════════════════════════════════
async function loadTexts(page) {
  const url = CMS_URLS[page];
  if (!url) return;
  const rows = await fetchCsv(url);
  if (!rows.length) return;
  const map = {};
  rows.forEach(([key, value]) => { if (key) map[key] = value || ''; });
  document.querySelectorAll('[data-cms]').forEach(el => {
    const key = el.getAttribute('data-cms');
    if (map[key] !== undefined) el.innerHTML = map[key];
  });
}

// ══════════════════════════════════════════════════════════════
//  2. גלריה דינמית (עמוד gallery.html)
// ══════════════════════════════════════════════════════════════
async function loadGallery() {
  const grid = document.getElementById('galleryDynGrid');
  if (!grid) return;

  const rows = await fetchCsv(CMS_URLS.images);
  const galleryRows = rows
    .filter(r => (r[0]||'').trim().toLowerCase() === 'gallery' && (r[1]||'').trim())
    .sort((a,b) => parseInt(a[3]||99) - parseInt(b[3]||99));

  if (!galleryRows.length) {
    grid.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">אין תמונות להצגה</p>';
    return;
  }

  const items = galleryRows.map(r => ({ url: driveToImg(r[1].trim()), alt: (r[2]||'').trim() }));
  let lightboxIdx = 0;

  grid.innerHTML = '';
  items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.alt;
    img.loading = 'lazy';
    img.style.cursor = 'pointer';
    img.onerror = function(){ this.closest('.gallery-item').style.display='none'; };
    img.addEventListener('click', () => openGalleryLightbox(i));
    div.appendChild(img);
    grid.appendChild(div);
  });

  function openGalleryLightbox(idx) {
    lightboxIdx = idx;
    document.getElementById('lightboxImg').src = items[idx].url;
    document.getElementById('lightbox').classList.add('open');
  }
  window._galleryNav = function(dir) {
    lightboxIdx = (lightboxIdx + dir + items.length) % items.length;
    document.getElementById('lightboxImg').src = items[lightboxIdx].url;
  };
}

// ══════════════════════════════════════════════════════════════
//  3. תמונת הרב בעמוד הכולל
// ══════════════════════════════════════════════════════════════
async function loadKollelRavPhoto() {
  const img = document.getElementById('ravPhoto');
  if (!img) return;
  const rows = await fetchCsv(CMS_URLS.images);
  const row = rows.find(r => (r[0]||'').trim().toLowerCase() === 'kollel-rav' && (r[1]||'').trim());
  if (row) {
    img.src = driveToImg(row[1].trim());
    if (row[2]) img.alt = row[2].trim();
    img.style.display = 'block';
  }
}

// ══════════════════════════════════════════════════════════════
//  מייצא URL שיעורים לשימוש ב-shiurim.html
// ══════════════════════════════════════════════════════════════
window.CMS_SHIURIM_URL = CMS_URLS.shiurim;

// ══════════════════════════════════════════════════════════════
//  הפעלה ראשית
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const page = detectPage();

  if (!['gallery','shiurim'].includes(page)) {
    loadTexts(page);
  }

  if (page === 'gallery') loadGallery();
  if (page === 'kollel')  loadKollelRavPhoto();
});
