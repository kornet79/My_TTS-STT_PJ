// /api/tts.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, model, voice } = req.body;

  if (!text || text.length > 4096) {
    return res.status(400).json({ error: '텍스트가 유효하지 않습니다.' });
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'tts-1',
        input: text,
        voice: voice || 'alloy',
        response_format: 'mp3'
      })
    });

    if (!openaiRes.ok) {
      const error = await openaiRes.json();
      return res.status(openaiRes.status).json({ error: error.error?.message || 'TTS API 호출 실패' });
    }

    const audioBuffer = await openaiRes.arrayBuffer();

    res.setHeader('Content-Type', 'audio/mpeg');
    res.status(200).send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error('TTS 변환 실패:', err);
    res.status(500).json({ error: 'TTS 변환 중 오류 발생' });
  }
}
