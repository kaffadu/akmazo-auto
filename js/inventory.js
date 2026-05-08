// ===== AKMAZO AUTO SOLUTIONS - INVENTORY SEARCH =====

const COPART_BASE = 'https://www.copart.com/search/';
const IAA_BASE    = 'https://www.iaai.com/Search';

// Popular makes for Ghanaian market
const MAKES = [
  { value: 'TOYOTA', label: 'Toyota' },
  { value: 'HONDA', label: 'Honda' },
  { value: 'HYUNDAI', label: 'Hyundai' },
  { value: 'KIA', label: 'Kia' },
  { value: 'NISSAN', label: 'Nissan' },
  { value: 'FORD', label: 'Ford' },
  { value: 'VOLKSWAGEN', label: 'Volkswagen' },
  { value: 'BMW', label: 'BMW' },
  { value: 'MERCEDES-BENZ', label: 'Mercedes-Benz' },
  { value: 'LEXUS', label: 'Lexus' },
  { value: 'MITSUBISHI', label: 'Mitsubishi' },
  { value: 'SUBARU', label: 'Subaru' },
  { value: 'CHEVROLET', label: 'Chevrolet' },
  { value: 'SUZUKI', label: 'Suzuki' },
];

const MODELS = {
  TOYOTA: ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Land Cruiser', 'Venza', 'Sienna', 'Tacoma', 'Prius', '4Runner'],
  HONDA: ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'HR-V', 'Passport', 'Ridgeline'],
  HYUNDAI: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Palisade', 'Kona'],
  KIA: ['Sorento', 'Sportage', 'Optima', 'Telluride', 'Soul', 'Carnival'],
  NISSAN: ['Altima', 'Maxima', 'Murano', 'Rogue', 'Pathfinder', 'Armada', 'Frontier'],
  FORD: ['F-150', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Mustang', 'Ranger'],
  BMW: ['3 Series', '5 Series', 'X3', 'X5', 'X6', 'X7', '7 Series'],
  'MERCEDES-BENZ': ['C-Class', 'E-Class', 'GLE', 'GLC', 'S-Class', 'GLS'],
  LEXUS: ['RX', 'ES', 'GX', 'LX', 'IS', 'NX'],
  VOLKSWAGEN: ['Jetta', 'Passat', 'Tiguan', 'Atlas', 'Golf'],
  MITSUBISHI: ['Outlander', 'Eclipse Cross', 'Galant', 'Lancer'],
  SUBARU: ['Outback', 'Forester', 'Crosstrek', 'Impreza', 'Legacy'],
  CHEVROLET: ['Silverado', 'Tahoe', 'Equinox', 'Traverse', 'Malibu', 'Suburban'],
  SUZUKI: ['Grand Vitara', 'Swift', 'SX4', 'Vitara'],
};

const YEARS = [];
for (let y = 2024; y >= 2005; y--) YEARS.push(y);

function buildSearchTerm(make, model, yearFrom) {
  const parts = [make];
  if (model) parts.push(model);
  if (yearFrom) parts.push(yearFrom);
  return parts.join(' ');
}

function buildCopartUrl(make, model, yearFrom) {
  const term = buildSearchTerm(make, model, yearFrom);
  return `${COPART_BASE}#?query=${encodeURIComponent(term)}`;
}

function buildIAAUrl(make, model, yearFrom) {
  const term = buildSearchTerm(make, model, yearFrom);
  return `${IAA_BASE}?SearchText=${encodeURIComponent(term)}&paging.startIndex=0&paging.rows=25`;
}

// Populate make select dropdown
function populateMakeSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  MAKES.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.label;
    sel.appendChild(opt);
  });
}

// Populate model select based on make
function populateModelSelect(make, selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">All Models</option>';
  (MODELS[make] || []).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  });
}

// Populate year selects
function populateYearSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  YEARS.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    sel.appendChild(opt);
  });
}

// Show a floating toast with the search term and a copy button
function showSearchToast(term, siteName) {
  document.getElementById('searchToast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'searchToast';
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <span style="font-size:13px;color:#8A92A8;">Opening ${siteName} — paste this in their search box if needed:</span>
      <span id="toastTerm" style="font-weight:700;color:#F5A623;font-size:14px;">${term}</span>
      <button onclick="navigator.clipboard.writeText('${term}').then(()=>{this.textContent='✓ Copied!';setTimeout(()=>this.textContent='📋 Copy',1500)})" style="background:rgba(245,166,35,0.15);border:1px solid rgba(245,166,35,0.3);color:#F5A623;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">📋 Copy</button>
      <button onclick="document.getElementById('searchToast').remove()" style="background:none;border:none;color:#8A92A8;cursor:pointer;font-size:18px;line-height:1;">✕</button>
    </div>`;
  Object.assign(toast.style, {
    position:'fixed', bottom:'90px', left:'50%', transform:'translateX(-50%)',
    background:'#1A2035', border:'1px solid rgba(245,166,35,0.25)',
    borderRadius:'14px', padding:'14px 20px', zIndex:'9999',
    boxShadow:'0 10px 40px rgba(0,0,0,0.5)', maxWidth:'90vw',
    animation:'fadeInUp 0.3s ease'
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 12000);
}

function handleInventorySearch(source) {
  const make = document.getElementById('searchMake')?.value;
  const model = document.getElementById('searchModel')?.value;
  const yearFrom = document.getElementById('searchYearFrom')?.value;

  if (!make) {
    alert('Please select a vehicle make to search.');
    return;
  }

  const term = buildSearchTerm(make, model, yearFrom);
  const url  = source === 'copart' ? buildCopartUrl(make, model, yearFrom) : buildIAAUrl(make, model, yearFrom);
  const site = source === 'copart' ? 'Copart' : 'IAA';

  window.open(url, '_blank', 'noopener,noreferrer');
  showSearchToast(term, site);
}

function quickSearch(make, source = 'copart') {
  const term = make;
  const url  = source === 'copart' ? buildCopartUrl(make) : buildIAAUrl(make);
  const site = source === 'copart' ? 'Copart' : 'IAA';
  window.open(url, '_blank', 'noopener,noreferrer');
  showSearchToast(term, site);
}

// Init search form
document.addEventListener('DOMContentLoaded', () => {
  populateMakeSelect('searchMake');
  populateYearSelect('searchYearFrom');

  document.getElementById('searchMake')?.addEventListener('change', e => {
    populateModelSelect(e.target.value, 'searchModel');
  });

  document.getElementById('searchCopart')?.addEventListener('click', () => handleInventorySearch('copart'));
  document.getElementById('searchIAA')?.addEventListener('click', () => handleInventorySearch('iaa'));
});
