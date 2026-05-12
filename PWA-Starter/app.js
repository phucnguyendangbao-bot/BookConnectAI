// =========================================================
// BookConnect AI — PWA App Logic (Vanilla JavaScript)
// File này quản lý: chuyển tab, render danh sách sách,
// nút quét AI, lưu API key, chế độ tối, nút cài app.
// =========================================================

// ----- DỮ LIỆU MẪU -----
const SAMPLE_BOOKS = [
  { title: "Đắc Nhân Tâm",              author: "Dale Carnegie", color: "#7C3AED", rating: 4.8,
    summary: "Nghệ thuật đối nhân xử thế kinh điển." },
  { title: "Tôi Tài Giỏi, Bạn Cũng Thế", author: "Adam Khoo",     color: "#2563EB", rating: 4.5,
    summary: "Phương pháp học hiệu quả dành cho mọi lứa tuổi." },
  { title: "Nhà Giả Kim",                author: "Paulo Coelho",  color: "#EA580C", rating: 4.7,
    summary: "Hành trình theo đuổi vận mệnh của một chàng chăn cừu." },
  { title: "Bí Mật Tư Duy Triệu Phú",   author: "T. Harv Eker",   color: "#16A34A", rating: 4.4,
    summary: "17 nguyên tắc tư duy của người giàu." }
];

const SAMPLE_LISTINGS = [
  { title: "Đắc Nhân Tâm",            author: "Dale Carnegie", price: "65.000đ",      type: "Bán",  distance: "1.2 km", color: "#7C3AED" },
  { title: "Nhà Giả Kim",             author: "Paulo Coelho",  price: "20.000đ/tuần", type: "Thuê", distance: "2.5 km", color: "#EA580C" },
  { title: "Tôi Tài Giỏi",            author: "Adam Khoo",     price: "Đổi sách",     type: "Đổi",  distance: "0.8 km", color: "#2563EB" },
  { title: "Bí Mật Tư Duy Triệu Phú", author: "T. Harv Eker",  price: "75.000đ",      type: "Bán",  distance: "3.1 km", color: "#16A34A" }
];

// ----- HELPERS -----
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2200);
}

// ----- RENDER: TAB HOME -----
function renderHome() {
  // Carousel gợi ý
  const suggested = SAMPLE_BOOKS.map(b => `
    <div class="book-card">
      <div class="book-cover" style="background:${b.color}">${escapeHtml(b.title)}</div>
      <div class="book-card-title">${escapeHtml(b.title)}</div>
      <div class="book-card-author">${escapeHtml(b.author)}</div>
    </div>
  `).join('');
  $('#suggested-list').innerHTML = suggested;

  // Đang đọc (2 cuốn đầu)
  const reading = SAMPLE_BOOKS.slice(0, 2).map(b => bookCardRow(b)).join('');
  $('#reading-list').innerHTML = reading;
}

function bookCardRow(b) {
  return `
    <div class="card">
      <div class="card-mini-cover" style="background:${b.color}"></div>
      <div class="card-info">
        <div class="card-title">${escapeHtml(b.title)}</div>
        <div class="card-author">${escapeHtml(b.author)}</div>
        <div class="card-rating">⭐ ${b.rating}</div>
      </div>
    </div>
  `;
}

// ----- RENDER: TAB LIBRARY -----
function renderLibrary() {
  $('#library-list').innerHTML = SAMPLE_BOOKS.map(b => `
    <div class="card">
      <div class="card-mini-cover" style="background:${b.color}"></div>
      <div class="card-info">
        <div class="card-title">${escapeHtml(b.title)}</div>
        <div class="card-author">${escapeHtml(b.author)}</div>
        <div class="card-summary">${escapeHtml(b.summary)}</div>
      </div>
    </div>
  `).join('');
}

// ----- RENDER: TAB MARKET -----
let currentFilter = 'all';
function renderMarket() {
  const filtered = currentFilter === 'all'
    ? SAMPLE_LISTINGS
    : SAMPLE_LISTINGS.filter(l => l.type === currentFilter);

  $('#listing-list').innerHTML = filtered.map(l => `
    <div class="card">
      <div class="card-mini-cover" style="background:${l.color}"></div>
      <div class="card-info">
        <div class="card-title">${escapeHtml(l.title)}</div>
        <div class="card-author">${escapeHtml(l.author)}</div>
        <div class="card-meta">
          <span class="badge badge-${l.type}">${l.type}</span>
          <span class="muted">📍 ${l.distance}</span>
        </div>
        <div class="price">${escapeHtml(l.price)}</div>
      </div>
    </div>
  `).join('');
}

// Helper chống XSS đơn giản
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =========================================================
// CHUYỂN TAB
// =========================================================
function switchTab(target) {
  $$('.tab').forEach(t => { t.hidden = (t.dataset.tab !== target); });
  $$('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.target === target);
  });
  // Cuộn về đầu
  $('#content').scrollTop = 0;
}

$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.target));
});

// =========================================================
// TAB SCAN — Animation + gọi AI
// =========================================================
const scanButton = $('#scan-button');
const scanFrame  = $('.camera-frame');
const summaryBox = $('#summary-box');
const summaryText = $('#summary-text');

scanButton.addEventListener('click', async () => {
  const bookName = $('#book-name-input').value.trim() || 'Đắc Nhân Tâm';

  scanButton.disabled = true;
  scanButton.textContent = '⏳ Đang quét...';
  scanFrame.classList.add('scanning');
  summaryBox.hidden = false;
  summaryText.textContent = '';

  try {
    // Gọi API thật (xem file api.js)
    await streamSummaryFromAI(bookName, (chunk) => {
      summaryText.textContent += chunk;
    });
  } catch (err) {
    summaryText.textContent = '⚠️ Lỗi: ' + err.message +
      '\n\nMẹo: Vào tab Cá nhân để lưu Claude API Key trước.';
  } finally {
    scanButton.disabled = false;
    scanButton.textContent = '✨ Bắt đầu quét AI';
    scanFrame.classList.remove('scanning');
  }
});

// =========================================================
// TAB MARKET — Filter chips
// =========================================================
$('#filter-bar').addEventListener('click', (e) => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  currentFilter = chip.dataset.filter;
  $$('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
  renderMarket();
});

// =========================================================
// TAB PROFILE — API Key + Dark mode
// =========================================================
$('#save-api-key').addEventListener('click', () => {
  const key = $('#api-key-input').value.trim();
  if (!key) { showToast('Vui lòng nhập API Key'); return; }
  localStorage.setItem('claude_api_key', key);
  showToast('✓ Đã lưu API Key');
});

// Đọc lại key đã lưu + tự kiểm tra xem có proxy /api/summary không
window.addEventListener('load', async () => {
  if (localStorage.getItem('claude_api_key')) {
    $('#api-key-input').placeholder = '••••••••••• (đã lưu)';
  }

  // Kiểm tra proxy bằng cách HEAD/OPTIONS (nhẹ)
  const statusEl = $('#ai-status');
  const localSection = $('#local-key-section');
  try {
    const probe = await fetch('/api/summary', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookName: '__probe__' })
    });
    if (probe.status === 404) throw new Error('no-proxy');
    // 200 hoặc 500 (key chưa set) đều có nghĩa là proxy tồn tại
    if (probe.status === 200) {
      statusEl.textContent = '✓ Đã kết nối server (key giấu)';
      statusEl.style.color = '#16A34A';
    } else if (probe.status === 500) {
      statusEl.textContent = '⚠ Server thiếu CLAUDE_API_KEY';
      statusEl.style.color = '#EA580C';
    } else {
      statusEl.textContent = '✓ Có proxy /api/summary';
      statusEl.style.color = '#16A34A';
    }
  } catch (err) {
    // Không có proxy → cho phép local key
    statusEl.textContent = '⚠ Đang chạy local (cần key trong trình duyệt)';
    statusEl.style.color = '#EA580C';
    localSection.style.display = '';
  }
});

const darkToggle = $('#dark-toggle');
darkToggle.checked = localStorage.getItem('darkMode') === 'true';
if (darkToggle.checked) document.body.classList.add('dark');
darkToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark', darkToggle.checked);
  localStorage.setItem('darkMode', darkToggle.checked);
});

// =========================================================
// PWA: Nút "Cài app vào máy"
// =========================================================
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  $('#install-btn').hidden = false;
});

$('#install-btn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') showToast('🎉 Đã cài app!');
  deferredInstallPrompt = null;
  $('#install-btn').hidden = true;
});

// =========================================================
// KHỞI CHẠY
// =========================================================
renderHome();
renderLibrary();
renderMarket();
