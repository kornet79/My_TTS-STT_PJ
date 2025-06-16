let audioBlob = null;
let recentConversions = [];
const MAX_RECENT = 5;

// DOM 요소들
const elements = {
    textInput: document.getElementById('textInput'),
    charCount: document.getElementById('charCount'),
    convertBtn: document.getElementById('convertBtn'),
    btnText: document.getElementById('btnText'),
    audio: document.getElementById('audio'),
    audioPlayer: document.getElementById('audioPlayer'),
    downloadBtn: document.getElementById('downloadBtn'),
    mobilePlayer: document.getElementById('mobilePlayer'),
    mobilePlayBtn: document.getElementById('mobilePlayBtn'),
    mobileCloseBtn: document.getElementById('mobileCloseBtn'),
    mobilePlayerTime: document.getElementById('mobilePlayerTime'),
    mobilePlayerProgressBar: document.getElementById('mobilePlayerProgressBar'),
    recentConversions: document.getElementById('recentConversions'),
    conversionsList: document.getElementById('conversionsList')
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadRecentConversions();
    updateCharCount();
    
    // iOS audio 초기화
    if (isIOS()) {
        document.body.addEventListener('touchstart', initAudioContext, { once: true });
    }
});

// 문자 수 카운트
elements.textInput.addEventListener('input', updateCharCount);

function updateCharCount() {
    const length = elements.textInput.value.length;
    elements.charCount.textContent = length;
    
    if (length > 4096) {
        elements.charCount.style.color = '#f44336';
    } else {
        elements.charCount.style.color = '#666';
    }
}

// TTS 변환
async function convertToSpeech() {
    const text = elements.textInput.value.trim();
    const model = document.getElementById('model').value;
    const voice = document.getElementById('voice').value;
    
    if (!text) {
        showStatus('변환할 텍스트를 입력해주세요!', 'error');
        vibrate(50);
        return;
    }
    
    if (text.length > 4096) {
        showStatus('텍스트가 너무 깁니다. 4096자 이하로 입력해주세요.', 'error');
        vibrate(50);
        return;
    }

    elements.convertBtn.disabled = true;
    elements.btnText.innerHTML = '<span class="spinner"></span>변환 중...';
    showStatus('음성을 생성하고 있습니다...', 'loading');

    try {
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model: model,
                voice: voice
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '변환 실패');
        }

        audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        elements.audio.src = audioUrl;
        
        // 데스크톱에서는 일반 플레이어 표시
        if (!isMobile()) {
            elements.audioPlayer.style.display = 'block';
        }
        
        elements.downloadBtn.style.display = 'block';
        
        // 모바일에서는 하단 플레이어 표시
        if (isMobile()) {
            showMobilePlayer();
        }
        
        // 최근 변환 내역에 추가
        addToRecentConversions(text);
        
        showStatus('음성 변환이 완료되었습니다!', 'success');
        vibrate(30);
        
    } catch (error) {
        showStatus(`오류: ${error.message}`, 'error');
        vibrate([50, 30, 50]);
        console.error('Error:', error);
    } finally {
        elements.convertBtn.disabled = false;
        elements.btnText.textContent = '음성으로 변환';
    }
}

// 모바일 플레이어 제어
function showMobilePlayer() {
    elements.mobilePlayer.classList.add('show');
    elements.audio.addEventListener('timeupdate', updateMobilePlayerTime);
    elements.audio.addEventListener('ended', () => {
        elements.mobilePlayBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
        `;
    });
}

elements.mobilePlayBtn.addEventListener('click', () => {
    if (elements.audio.paused) {
        elements.audio.play();
        elements.mobilePlayBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
            </svg>
        `;
    } else {
        elements.audio.pause();
        elements.mobilePlayBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
        `;
    }
});

elements.mobileCloseBtn.addEventListener('click', () => {
    elements.audio.pause();
    elements.mobilePlayer.classList.remove('show');
});

function updateMobilePlayerTime() {
    const current = formatTime(elements.audio.currentTime);
    const duration = formatTime(elements.audio.duration);
    elements.mobilePlayerTime.textContent = `${current} / ${duration}`;
    
    const progress = (elements.audio.currentTime / elements.audio.duration) * 100;
    elements.mobilePlayerProgressBar.style.width = `${progress}%`;
}

// 다운로드
function downloadAudio() {
    if (!audioBlob) return;
    
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tts_${new Date().getTime()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('다운로드가 시작되었습니다!', 'success');
}

// 최근 변환 내역 관리
function addToRecentConversions(text) {
    const item = {
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        fullText: text,
        timestamp: new Date().toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    };
    
    recentConversions.unshift(item);
    if (recentConversions.length > MAX_RECENT) {
        recentConversions.pop();
    }
    
    saveRecentConversions();
    displayRecentConversions();
}

function loadRecentConversions() {
    const saved = localStorage.getItem('recentConversions');
    if (saved) {
        recentConversions = JSON.parse(saved);
        displayRecentConversions();
    }
}

function saveRecentConversions() {
    localStorage.setItem('recentConversions', JSON.stringify(recentConversions));
}

function displayRecentConversions() {
    if (recentConversions.length === 0) {
        elements.recentConversions.style.display = 'none';
        return;
    }
    
    elements.recentConversions.style.display = 'block';
    elements.conversionsList.innerHTML = recentConversions.map((item, index) => `
        <div class="conversion-item" onclick="loadRecentConversion(${index})">
            <strong>${item.timestamp}</strong> - ${item.text}
        </div>
    `).join('');
}

function loadRecentConversion(index) {
    const item = recentConversions[index];
    elements.textInput.value = item.fullText;
    updateCharCount();
    showStatus('이전 텍스트를 불러왔습니다.', 'success');
}

// 상태 메시지 표시
function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    if (type !== 'loading') {
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
}

// 유틸리티 함수들
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isMobile() {
    return window.innerWidth <= 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function vibrate(pattern) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

function initAudioContext() {
    // iOS에서 오디오 컨텍스트 초기화
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    audioContext.resume();
}

// 키보드 단축키
elements.textInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        convertToSpeech();
    }
});

// 버튼 클릭 이벤트
elements.convertBtn.addEventListener('click', convertToSpeech);
elements.downloadBtn.addEventListener('click', downloadAudio);

// PWA 설치 프롬프트
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

// 네트워크 상태 확인
window.addEventListener('online', () => {
    showStatus('인터넷 연결이 복구되었습니다.', 'success');
});

window.addEventListener('offline', () => {
    showStatus('인터넷 연결이 끊어졌습니다.', 'error');
});