==============================================================
   PWA-Starter — BookConnect AI dạng Progressive Web App
==============================================================

CẤU TRÚC:
  index.html              - Trang chính (5 tab giao diện)
  styles.css              - Styles
  app.js                  - Logic chuyển tab, render, dark mode
  api.js                  - Gọi proxy /api/summary (fallback localStorage)
  api/summary.js          - Vercel Serverless Function (giấu API key)
  manifest.webmanifest    - Khai báo PWA (tên, icon, theme)
  service-worker.js       - Cache offline + cho phép cài app
  register-sw.js          - Đăng ký service worker
  vercel.json             - Config Vercel (headers cho SW & manifest)
  .gitignore              - Bỏ qua node_modules, .env
  .env.example            - Mẫu biến môi trường (CLAUDE_API_KEY)
  icons/                  - Icon đa kích thước

==============================================================
   CHẠY THỬ LOCAL (3 cách)
==============================================================

  CÁCH 1 — Python:
    cd "đường dẫn tới PWA-Starter"
    python3 -m http.server 8080
    Mở http://localhost:8080
    Lưu ý: chạy kiểu này KHÔNG có /api/summary, app sẽ
    fallback dùng key trong localStorage (tab Cá nhân).

  CÁCH 2 — Vercel CLI (có proxy /api/summary thật):
    npm i -g vercel
    cd "đường dẫn tới PWA-Starter"
    cp .env.example .env        (rồi sửa key thật)
    vercel dev
    Mở http://localhost:3000

  CÁCH 3 — VS Code Live Server:
    Cài extension "Live Server"
    Chuột phải index.html → Open with Live Server
    (Tương tự Python, không có /api/summary)

  ⚠ KHÔNG được click 2 lần vào index.html (file://) — Service
    Worker chỉ hoạt động qua http:// hoặc https://

==============================================================
   DEPLOY LÊN VERCEL (KHUYÊN DÙNG)
==============================================================

  TÓM TẮT 4 BƯỚC:

  1. Push folder này lên GitHub (repo public hoặc private)

  2. Vào vercel.com → Add New → Project → Import repo

  3. Trong Settings → Environment Variables, thêm:
       CLAUDE_API_KEY = sk-ant-api03-xxxxxxxxx...

  4. Bấm Deploy. Trong ~30 giây bạn có URL:
       https://your-app.vercel.app

  Sau đó vào tab "Quét AI" → nhập tên sách → Bắt đầu quét.
  Frontend gọi /api/summary → server giấu key → trả stream.

  ⚠ KEY KHÔNG BAO GIỜ XUẤT HIỆN TRONG BROWSER.

  Chi tiết từng bước có hình minh hoạ + cách custom domain:
  xem file HUONG-DAN-DEPLOY-VERCEL.docx ở thư mục cha.

==============================================================
   CÀI VÀO ĐIỆN THOẠI / PC
==============================================================

  iPhone:    Safari → Share → Add to Home Screen
  Android:   Chrome → "Install app"
  Windows:   Chrome/Edge → icon Install trên thanh URL
  Mac:       Safari 17+ → File → Add to Dock

==============================================================
   BẢO MẬT API KEY
==============================================================

  - Production (Vercel):  key ở Environment Variables  ✓ AN TOÀN
  - Local Python/Live:    key ở localStorage browser    ⚠ chỉ test
  - File .env:            CHƯA BAO GIỜ commit lên Git
                          (.gitignore đã chặn sẵn)
