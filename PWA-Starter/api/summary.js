// =========================================================
// Vercel Serverless Function: /api/summary
//
// Đây là proxy giấu API key trên server.
// Frontend gọi /api/summary, function này gọi Claude API thật,
// rồi stream kết quả ngược về frontend.
//
// API KEY được lưu trong Vercel Environment Variables,
// KHÔNG bao giờ lộ ra trình duyệt.
//
// Cách deploy: chỉ cần đặt env var CLAUDE_API_KEY trong Vercel.
// =========================================================

export const config = {
  runtime: 'edge',  // Dùng Edge Runtime để hỗ trợ streaming
};

export default async function handler(request) {
  // Chỉ chấp nhận POST
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Đọc API key từ env variable (đặt trong Vercel dashboard)
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'Server chưa cấu hình CLAUDE_API_KEY. ' +
               'Vào Vercel dashboard → Settings → Environment Variables để thêm.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Đọc body từ frontend
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Body không hợp lệ' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const bookName = String(body.bookName || '').trim();
  if (!bookName) {
    return new Response(
      JSON.stringify({ error: 'Vui lòng cung cấp bookName' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const prompt =
    `Hãy tóm tắt cuốn sách "${bookName}" bằng tiếng Việt trong khoảng 4-6 câu. ` +
    `Tập trung vào: chủ đề chính, đối tượng phù hợp, và bài học quan trọng nhất. ` +
    `Không mở đầu kiểu "Đây là tóm tắt..." — vào thẳng nội dung.`;

  // Gọi Claude API thật (server-to-server, không lộ key)
  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 600,
      stream:     true,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!claudeResponse.ok) {
    const errText = await claudeResponse.text();
    return new Response(
      JSON.stringify({ error: `Claude API trả về lỗi ${claudeResponse.status}`, detail: errText }),
      { status: claudeResponse.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Trả nguyên xi SSE stream từ Claude về frontend
  return new Response(claudeResponse.body, {
    status: 200,
    headers: {
      'Content-Type':     'text/event-stream',
      'Cache-Control':    'no-cache, no-transform',
      'Connection':       'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
