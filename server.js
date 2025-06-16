require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API 엔드포인트
app.post('/api/tts', async (req, res) => {
    try {
        const { text, model, voice } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: '텍스트를 입력해주세요.' });
        }

        const response = await axios.post(
            'https://api.openai.com/v1/audio/speech',
            {
                model: model || 'tts-1',
                input: text,
                voice: voice || 'alloy',
                response_format: 'mp3'
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            }
        );

        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(response.data));

    } catch (error) {
        console.error('TTS Error:', error.response?.data || error.message);
        
        if (error.response) {
            res.status(error.response.status).json({ 
                error: error.response.data?.error?.message || 'TTS 변환 실패' 
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// 기본 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 건강 체크 엔드포인트
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', apiKeySet: !!process.env.OPENAI_API_KEY });
});

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  경고: OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.');
    }
});