const STORAGE_KEYS = {
    OPENAI_KEY: 'openai_api_key',
    CUSTOM_PROMPT: 'custom_system_prompt'
};

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save-api-btn').addEventListener('click', saveApiKey);
document.getElementById('save-prompt-btn').addEventListener('click', savePrompt);
document.getElementById('test-btn').addEventListener('click', testConnection);
document.getElementById('reset-prompt-btn').addEventListener('click', resetPromptToDefault);

function loadSettings() {
    // Tüm ayarları local storage'dan oku
    chrome.storage.local.get([STORAGE_KEYS.OPENAI_KEY, STORAGE_KEYS.CUSTOM_PROMPT], (result) => {
        document.getElementById('openai-key').value = result[STORAGE_KEYS.OPENAI_KEY] || '';
        
        // Prompt yükle
        const currentPrompt = result[STORAGE_KEYS.CUSTOM_PROMPT];
        document.getElementById('system-prompt').value = currentPrompt || OpenAIProvider.DEFAULT_SYSTEM_PROMPT;
    });
}

function saveApiKey() {
    const apiKey = document.getElementById('openai-key').value;
    
    chrome.storage.local.set({ [STORAGE_KEYS.OPENAI_KEY]: apiKey }, () => {
        if (chrome.runtime.lastError) {
            showStatus('Hata: ' + chrome.runtime.lastError.message, 'error');
        } else {
            showStatus('API Anahtarı başarıyla kaydedildi.', 'success');
        }
    });
}

function savePrompt() {
    const customPrompt = document.getElementById('system-prompt').value;

    // Prompt boyutu büyük olabileceği için local storage kullanıyoruz (Sync limiti 8KB)
    chrome.storage.local.set({ 
        [STORAGE_KEYS.CUSTOM_PROMPT]: customPrompt
    }, () => {
        if (chrome.runtime.lastError) {
            showStatus('Hata: ' + chrome.runtime.lastError.message, 'error');
        } else {
            showStatus('Prompt başarıyla kaydedildi.', 'success');
        }
    });
}

function resetPromptToDefault() {
    if (confirm('Varsayılan prompta dönmek istediğinize emin misiniz?')) {
        document.getElementById('system-prompt').value = OpenAIProvider.DEFAULT_SYSTEM_PROMPT;
        // Kullanıcıya kaydetmesi gerektiğini hatırlat
        showStatus('Varsayılan prompt yüklendi. Kalıcı olması için "Promptu Kaydet" butonuna basın.', 'info');
    }
}

function testConnection() {
    showStatus('Test ediliyor...', 'info');
    
    // Test için o anki promptu kullan (kaydedilmemiş olsa bile)
    // Ancak background script sadece kaydedilmiş promptu kullanır.
    // Bu yüzden test mesajında promptu göndermiyoruz, background script storage'dan okuyacak.
    
    chrome.runtime.sendMessage(
        { action: 'correctText', text: 'Bu bir test metnidir.' },
        response => {
            // chrome.runtime.lastError kontrolü
            if (chrome.runtime.lastError) {
                showStatus('Hata: ' + chrome.runtime.lastError.message, 'error');
                return;
            }

            // response undefined kontrolü
            if (!response) {
                showStatus('Hata: Background script\'ten yanıt alınamadı', 'error');
                return;
            }

            // response.error kontrolü
            if (response.error) {
                showStatus('Hata: ' + response.error, 'error');
                return;
            }

            // response.correctedText kontrolü
            if (!response.correctedText) {
                showStatus('Hata: Düzeltilmiş metin alınamadı', 'error');
                return;
            }

            // Başarılı
            const preview = response.correctedText.length > 50
                ? response.correctedText.substring(0, 50) + '...'
                : response.correctedText;
            showStatus('Bağlantı başarılı! Sonuç: ' + preview, 'success');
        }
    );
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';

    setTimeout(() => {
        status.style.display = 'none';
    }, 5000);
}
