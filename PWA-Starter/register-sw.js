// =========================================================
// Đăng ký Service Worker
//
// File này chạy ngay khi trang load, báo cho trình duyệt biết
// có service worker tên service-worker.js. Service worker
// chỉ hoạt động khi truy cập qua HTTPS hoặc localhost.
// =========================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then(reg => {
        console.log('✓ Service Worker đăng ký thành công:', reg.scope);
      })
      .catch(err => {
        console.warn('⚠ Service Worker thất bại:', err);
      });
  });
} else {
  console.warn('Trình duyệt không hỗ trợ Service Worker.');
}
