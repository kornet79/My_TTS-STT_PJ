// api/tts.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, model, voice } = req.body;

  if (!text || text.length > 4096) {
    return res.status(400).json({ error: '텍스트가 유효하지 않습니다.' });
  }

  try {
    // 예시용 응답 - 여기에 TTS 서비스 연동 구현 (예: ElevenLabs, OpenAI 등)
    // 실제로는 fetch나 API 호출 사용
    const dummyAudio = Buffer.from('DummyAudioData');

    res.setHeader('Content-Type', 'audio/mpeg');
    res.status(200).send(dummyAudio);
  } catch (err) {
    console.error('TTS 변환 실패:', err);
    res.status(500).json({ error: 'TTS 변환 중 오류 발생' });
  }
}
