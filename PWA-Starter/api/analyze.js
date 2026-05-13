// api/analyze.js — Vercel Serverless Function
// Nhận ảnh (base64) + prompt từ client, gọi Claude API (Vision)
// và trả về văn bản nhận xét.
//
// Yêu cầu: trong Vercel Project Settings -> Environment Variables
// thêm biến CLAUDE_API_KEY = sk-ant-...
// (Dùng cùng tên biến với /api/summary để không phải khai báo 2 lần.)
//
// Endpoint: POST /api/analyze
// Body JSON:
//   {
//     "image":    "<chuỗi base64, KHÔNG kèm prefix data:image/...;base64,>",
//     "mime":     "image/jpeg" | "image/png" | "image/webp" | "image/gif",
//     "prompt":   "câu hỏi gửi cho AI",
//     "bookName": "(tuỳ chọn) tên sách user gõ"
//   }
// Trả về JSON: { "text": "..." }

module.exports = async function handler(req, res) {
  // CORS đơn giản (nếu bạn gọi từ domain khác)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ưu tiên CLAUDE_API_KEY (đồng bộ với /api/summary), dự phòng ANTHROPIC_API_KEY
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Chưa cấu hình CLAUDE_API_KEY trên Vercel Environment Variables.'
      });
    }

    // Vercel tự parse JSON nếu Content-Type đúng. Phòng trường hợp body là string:
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let { image, mime, prompt, bookName } = body;

    if (!image) {
      return res.status(400).json({ error: 'Thiếu trường "image" (base64).' });
    }

    // Nếu client lỡ gửi cả prefix "data:image/...;base64,..." thì cắt bỏ
    const m = String(image).match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (m) {
      mime  = mime  || m[1];
      image = m[2];
    }
    if (!mime) mime = 'image/jpeg';

    // Chỉ chấp nhận các định dạng Claude hỗ trợ
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(mime)) {
      return res.status(400).json({
        error: `Định dạng ảnh không hỗ trợ: ${mime}. Chỉ chấp nhận ${allowed.join(', ')}.`
      });
    }

    const finalPrompt = (prompt && String(prompt).trim()) || (
      bookName
        ? `Đây là ảnh sách "${bookName}". Hãy nhận xét ngắn gọn (3-5 câu) bằng tiếng Việt về bìa/thiết kế, chất lượng ảnh, thông tin đọc được và gợi ý độc giả phù hợp.`
        : `Đây là ảnh một cuốn sách. Hãy nhận xét ngắn gọn (3-5 câu) bằng tiếng Việt: tên sách (nếu đọc được), bìa/thiết kế, chất lượng ảnh, gợi ý độc giả phù hợp.`
    );

    // Gọi Claude Messages API (Vision)
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mime,
                  data: image
                }
              },
              {
                type: 'text',
                text: finalPrompt
              }
            ]
          }
        ]
      })
    });

    const raw = await anthropicRes.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }

    if (!anthropicRes.ok) {
      console.error('[analyze] Anthropic error:', anthropicRes.status, data);
      return res.status(anthropicRes.status).json({
        error: (data && data.error && data.error.message) || 'Anthropic API lỗi',
        details: data
      });
    }

    // Ghép text từ các block trả về
    const text =
      Array.isArray(data.content)
        ? data.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim()
        : '';

    return res.status(200).json({ text, raw: data });
  } catch (err) {
    console.error('[analyze] exception:', err);
    return res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
};
