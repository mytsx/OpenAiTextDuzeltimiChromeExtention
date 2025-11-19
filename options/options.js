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
        if (currentPrompt) {
            document.getElementById('system-prompt').value = currentPrompt;
        } else {
            // Varsayılan promptu background script'ten al
            chrome.runtime.sendMessage({ action: 'getDefaultPrompt' }, (response) => {
                if (response && response.prompt) {
                    document.getElementById('system-prompt').value = response.prompt;
                }
            });
        }
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
    const customPrompt = document.getElementById('system-prompt').value.trim();

    // Boş prompt - varsayılana dön
    if (!customPrompt) {
        chrome.storage.local.remove([STORAGE_KEYS.CUSTOM_PROMPT], () => {
            if (chrome.runtime.lastError) {
                showStatus('Hata: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showStatus('Prompt temizlendi. Varsayılan prompt kullanılacak.', 'success');
            }
        });
        return;
    }

    // Varsayılan prompt ile karşılaştır - aynıysa kaydetme (fork prevention)
    chrome.runtime.sendMessage({ action: 'getDefaultPrompt' }, (response) => {
        if (response && response.prompt) {
            const defaultPrompt = response.prompt.trim();

            if (customPrompt === defaultPrompt) {
                // Varsayılandan farklı değil, key'i sil
                chrome.storage.local.remove([STORAGE_KEYS.CUSTOM_PROMPT], () => {
                    if (chrome.runtime.lastError) {
                        showStatus('Hata: ' + chrome.runtime.lastError.message, 'error');
                    } else {
                        showStatus('Varsayılan prompt kullanılıyor. Gelecekteki güncellemeler otomatik uygulanacak.', 'success');
                    }
                });
            } else {
                // Gerçekten özelleştirilmiş, kaydet
                // Prompt boyutu büyük olabileceği için local storage kullanıyoruz (Sync limiti 8KB)
                chrome.storage.local.set({
                    [STORAGE_KEYS.CUSTOM_PROMPT]: customPrompt
                }, () => {
                    if (chrome.runtime.lastError) {
                        showStatus('Hata: ' + chrome.runtime.lastError.message, 'error');
                    } else {
                        showStatus('Özelleştirilmiş prompt kaydedildi.', 'success');
                    }
                });
            }
        }
    });
}

function resetPromptToDefault() {
    if (confirm('Varsayılan prompta dönmek istediğinize emin misiniz?')) {
        // Varsayılan promptu background script'ten al
        chrome.runtime.sendMessage({ action: 'getDefaultPrompt' }, (response) => {
            if (response && response.prompt) {
                document.getElementById('system-prompt').value = response.prompt;
                // Kullanıcıya kaydetmesi gerektiğini hatırlat
                showStatus('Varsayılan prompt yüklendi. Kalıcı olması için "Promptu Kaydet" butonuna basın.', 'info');
            }
        });
    }
}

function testConnection() {
    showStatus('Test ediliyor...', 'info');

    // Test, background script'in storage'dan okuduğu promptu kullanır
    // Kaydedilmemiş değişiklikler test edilmez

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
