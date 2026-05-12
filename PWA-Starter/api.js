// =========================================================
// BookConnect AI — Tích hợp Claude API (qua proxy /api/summary)
//
// File này KHÔNG còn chứa API key. Khi deploy lên Vercel,
// frontend chỉ gọi /api/summary, function trên server giấu key
// và gọi Claude API thật, rồi trả stream về.
//
// CHẾ ĐỘ HOẠT ĐỘNG:
//   1. Production (Vercel)  → gọi /api/summary  (an toàn)
//   2. Local dev không proxy → fallback gọi trực tiếp Claude API
//      với key trong localStorage (chỉ test cá nhân)
// =========================================================

const PROXY_URL       = '/api/summary';
const CLAUDE_API_URL  = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL    = 'claude-sonnet-4-6';
const MAX_TOKENS      = 600;

/**
 * Stream tóm tắt sách bằng Claude API.
 * Thử proxy trước, nếu không có (chạy local http.server) thì fallback
 * sang gọi trực tiếp với key trong localStorage.
 *
 * @param {string} bookName - Tên sách cần tóm tắt
 * @param {(chunk: string) => void} onChunk - Callback nhận từng đoạn text
 */
async function streamSummaryFromAI(bookName, onChunk) {
  // ---------- 1. THỬ PROXY TRƯỚC ----------
  let useProxy = true;
  let response;

  try {
    response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookName })
    });

    // 404 = proxy không tồn tại (chạy local không có Vercel)
    if (response.status === 404) {
      useProxy = false;
    }
  } catch (err) {
    // Network error trên proxy → thử fallback
    useProxy = false;
  }

  // ---------- 2. FALLBACK: GỌI TRỰC TIẾP (local dev) ----------
  if (!useProxy) {
    const apiKey = localStorage.getItem('claude_api_key');
    if (!apiKey) {
      throw new Error(
        'Chưa có proxy /api/summary và chưa lưu Claude API Key. ' +
        'Nếu deploy Vercel: setup biến môi trường CLAUDE_API_KEY. ' +
        'Nếu chạy local: vào tab Cá nhân để lưu key.'
      );
    }

    const prompt = buildPrompt(bookName);
    response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'x-api-key':          apiKey,
        'anthropic-version':  '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        stream:     true,
        messages: [{ role: 'user', content: prompt }]
      })
    });
  }

  // ---------- 3. XỬ LÝ RESPONSE ----------
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API trả về lỗi ${response.status}: ${errText}`);
  }

  // Đọc Server-Sent Events stream
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE chia message bằng "\n\n"
    const parts = buffer.split('\n\n');
    buffer = parts.pop(); // Phần cuối có thể chưa hoàn chỉnh

    for (const part of parts) {
      if (!part.trim()) continue;

      const dataLine = part.split('\n').find(l => l.startsWith('data: '));
      if (!dataLine) continue;

      try {
        const payload = JSON.parse(dataLine.slice(6));
        if (payload.type === 'content_block_delta' &&
            payload.delta?.type === 'text_delta') {
          onChunk(payload.delta.text);
        }
      } catch (err) {
        // Bỏ qua dòng không parse được
      }
    }
  }
}

function buildPrompt(bookName) {
  return `Hãy tóm tắt cuốn sách "${bookName}" bằng tiếng Việt trong khoảng 4-6 câu. ` +
         `Tập trung vào: chủ đề chính, đối tượng phù hợp, và bài học quan trọng nhất. ` +
         `Không mở đầu kiểu "Đây là tóm tắt..." — vào thẳng nội dung.`;
}

// Export ra window cho app.js dùng
window.streamSummaryFromAI = streamSummaryFromAI;
