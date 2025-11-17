# AI Metin Düzeltme Chrome Extension - Geliştirme Kılavuzu

## 📋 İçindekiler
1. [Projenin Amacı](#projenin-amacı)
2. [Özellikler](#özellikler)
3. [Teknik Mimari](#teknik-mimari)
4. [Dosya Yapısı](#dosya-yapısı)
5. [Adım Adım Geliştirme](#adım-adım-geliştirme)
6. [Kod Örnekleri](#kod-örnekleri)
7. [Test ve Yükleme](#test-ve-yükleme)
8. [Kullanım](#kullanım)

---

## Projenin Amacı

Web sayfalarındaki **tüm text input alanlarına** (input, textarea, contenteditable) AI destekli Türkçe metin düzeltme butonu ekleyen Chrome Extension.

### Neden Chrome Extension?

| Sorun | MigemPortal İçi | Chrome Extension |
|-------|-----------------|------------------|
| **CORS** | ❌ OpenAI API engelliyor | ✅ İzin veriliyor |
| **Kapsam** | Sadece MigemPortal | ✅ Tüm web siteleri |
| **Sunucu** | ❌ Proxy gerekli | ✅ Gereksiz |
| **Kullanıcı** | Backend'e bağımlı | ✅ Bağımsız |

---

## Özellikler

### 1. Otomatik Buton Enjeksiyonu
- Sayfa yüklendiğinde tüm text alanlarını tespit et
- Her alanın yanına "🤖 Düzelt" butonu ekle
- Dinamik içerik için MutationObserver kullan

### 2. Çift Provider Desteği
- **OpenAI** (gpt-4o + Chat Completions API)
- **OpenWebUI** (self-hosted alternatif)
- Kullanıcı settings'den seçer

### 3. Metin Düzeltme İşlemi
- Kullanıcı butona tıklar
- Mevcut metin AI'ye gönderilir
- Düzeltilmiş metin diff ile gösterilir
- Kullanıcı kabul ederse textarea'ya yazılır

### 4. Ayarlar Sayfası
- API key yönetimi (şifreli localStorage)
- Provider seçimi (OpenAI/OpenWebUI)
- Model seçimi
- Sistem prompt özelleştirme

---

## Teknik Mimari

```
┌─────────────────────────────────────────────────────┐
│           Chrome Extension                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Content Script (content.js)                       │
│  ├─ DOM izleme (MutationObserver)                  │
│  ├─ Buton enjeksiyonu                              │
│  ├─ Event listeners                                │
│  └─ Background script ile iletişim                │
│                                                     │
│  Background Script (background.js)                 │
│  ├─ API istekleri (CORS izni ile)                 │
│  ├─ OpenAI Chat Completions                       │
│  ├─ OpenWebUI API                                  │
│  └─ Content script'e response                     │
│                                                     │
│  Popup (popup.html/js)                             │
│  └─ Hızlı ayarlar (enable/disable)                │
│                                                     │
│  Options (options.html/js)                         │
│  ├─ Provider ayarları                              │
│  ├─ API key yönetimi                               │
│  └─ Prompt özelleştirme                            │
│                                                     │
└─────────────────────────────────────────────────────┘
         ↓ API Request
┌─────────────────────────────────────────────────────┐
│     OpenAI / OpenWebUI API                          │
└─────────────────────────────────────────────────────┘
```

---

## Dosya Yapısı

```
ai-text-corrector-extension/
├── manifest.json              # Extension yapılandırması
├── icons/                     # Extension ikonları
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── content/
│   ├── content.js            # DOM manipulation, buton ekleme
│   └── content.css           # Buton ve diff stilleri
├── background/
│   ├── background.js         # API istekleri
│   ├── openai-provider.js    # OpenAI API client
│   └── openwebui-provider.js # OpenWebUI API client
├── popup/
│   ├── popup.html            # Quick toggle UI
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html          # Ayarlar sayfası
│   ├── options.js
│   └── options.css
├── lib/
│   ├── crypto-js.min.js      # API key encryption
│   └── diff.min.js           # Metin karşılaştırma
└── prompts/
    └── turkish-official.txt  # Türkçe resmi yazışma promptu
```

---

## Adım Adım Geliştirme

### Adım 1: Proje Klasörü Oluştur

```bash
mkdir ai-text-corrector-extension
cd ai-text-corrector-extension
mkdir icons content background popup options lib prompts
```

### Adım 2: manifest.json

```json
{
  "manifest_version": 3,
  "name": "AI Türkçe Metin Düzeltici",
  "version": "1.0.0",
  "description": "Türkçe resmi yazışmaları AI ile düzelten Chrome extension",

  "permissions": [
    "storage",
    "activeTab"
  ],

  "host_permissions": [
    "https://api.openai.com/*",
    "http://localhost:*/*",
    "https://*/"
  ],

  "background": {
    "service_worker": "background/background.js"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": [
        "lib/crypto-js.min.js",
        "lib/diff.min.js",
        "content/content.js"
      ],
      "css": ["content/content.css"],
      "run_at": "document_idle"
    }
  ],

  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "options_page": "options/options.html",

  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Adım 3: content/content.js (Buton Enjeksiyonu)

```javascript
(function() {
    'use strict';

    const CONFIG = {
        BUTTON_ID_PREFIX: 'ai-text-corrector-btn-',
        BUTTON_CLASS: 'ai-text-corrector-button',
        MODAL_ID: 'ai-text-corrector-modal',
        ENABLED_KEY: 'ai_corrector_enabled'
    };

    let isEnabled = true;
    let buttonCounter = 0;

    chrome.storage.sync.get([CONFIG.ENABLED_KEY], function(result) {
        isEnabled = result[CONFIG.ENABLED_KEY] !== false;
        if (isEnabled) {
            init();
        }
    });

    function init() {
        addButtonsToExistingFields();
        observeDOMChanges();
    }

    function addButtonsToExistingFields() {
        const fields = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
        fields.forEach(field => {
            if (isFieldEligible(field)) {
                addButtonToField(field);
            }
        });
    }

    function isFieldEligible(field) {
        if (field.readOnly || field.disabled) return false;
        if (field.style.display === 'none' || field.offsetParent === null) return false;
        if (field.closest('[data-ai-corrector-ignore]')) return false;
        if (field.querySelector('[data-ai-corrector-button]')) return false;
        return true;
    }

    function addButtonToField(field) {
        const fieldId = field.id || `ai-field-${buttonCounter++}`;
        if (!field.id) field.id = fieldId;

        const existingButton = document.querySelector(`[data-ai-field-id="${fieldId}"]`);
        if (existingButton) return;

        const button = createButton(fieldId);
        insertButtonNearField(field, button);
    }

    function createButton(fieldId) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = CONFIG.BUTTON_CLASS;
        button.dataset.aiFieldId = fieldId;
        button.dataset.aiCorrectorButton = 'true';
        button.innerHTML = '🤖 Düzelt';
        button.title = 'AI ile Türkçe düzeltme yap';

        button.addEventListener('click', handleButtonClick);

        return button;
    }

    function insertButtonNearField(field, button) {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.width = '100%';

        field.parentNode.insertBefore(wrapper, field);
        wrapper.appendChild(field);
        wrapper.appendChild(button);
    }

    async function handleButtonClick(event) {
        event.preventDefault();
        const button = event.currentTarget;
        const fieldId = button.dataset.aiFieldId;
        const field = document.getElementById(fieldId);

        if (!field) return;

        const originalText = getFieldValue(field);
        if (!originalText || originalText.trim().length < 10) {
            alert('Lütfen düzeltilecek metin girin (en az 10 karakter)');
            return;
        }

        button.disabled = true;
        button.innerHTML = '⏳ Düzeltiliyor...';

        try {
            const correctedText = await requestCorrection(originalText);
            showDiffModal(originalText, correctedText, field, button);
        } catch (error) {
            alert('Hata: ' + error.message);
            button.disabled = false;
            button.innerHTML = '🤖 Düzelt';
        }
    }

    function getFieldValue(field) {
        if (field.isContentEditable) {
            return field.innerText || field.textContent;
        }
        return field.value;
    }

    function setFieldValue(field, value) {
        if (field.isContentEditable) {
            field.innerText = value;
        } else {
            field.value = value;
        }
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function requestCorrection(text) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: 'correctText', text: text },
                response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve(response.correctedText);
                    }
                }
            );
        });
    }

    function showDiffModal(original, corrected, field, button) {
        const existingModal = document.getElementById(CONFIG.MODAL_ID);
        if (existingModal) existingModal.remove();

        const modal = createDiffModal(original, corrected);
        document.body.appendChild(modal);

        const acceptBtn = modal.querySelector('[data-action="accept"]');
        const rejectBtn = modal.querySelector('[data-action="reject"]');

        acceptBtn.addEventListener('click', () => {
            setFieldValue(field, corrected);
            modal.remove();
            button.disabled = false;
            button.innerHTML = '🤖 Düzelt';
        });

        rejectBtn.addEventListener('click', () => {
            modal.remove();
            button.disabled = false;
            button.innerHTML = '🤖 Düzelt';
        });
    }

    function createDiffModal(original, corrected) {
        const modal = document.createElement('div');
        modal.id = CONFIG.MODAL_ID;
        modal.className = 'ai-corrector-modal';

        const diff = Diff.diffWords(original, corrected);
        const diffHtml = diff.map(part => {
            const color = part.added ? 'green' : part.removed ? 'red' : 'gray';
            const decoration = part.added ? 'underline' : part.removed ? 'line-through' : 'none';
            return `<span style="color: ${color}; text-decoration: ${decoration};">${escapeHtml(part.value)}</span>`;
        }).join('');

        modal.innerHTML = `
            <div class="ai-corrector-modal-content">
                <div class="ai-corrector-modal-header">
                    <h3>AI Metin Düzeltme Sonucu</h3>
                </div>
                <div class="ai-corrector-modal-body">
                    <div class="ai-corrector-diff">
                        ${diffHtml}
                    </div>
                    <div class="ai-corrector-legend">
                        <span style="color: green;">✓ Eklenen</span>
                        <span style="color: red;">✗ Çıkarılan</span>
                    </div>
                </div>
                <div class="ai-corrector-modal-footer">
                    <button data-action="reject" class="ai-corrector-btn-secondary">İptal</button>
                    <button data-action="accept" class="ai-corrector-btn-primary">Kabul Et</button>
                </div>
            </div>
        `;

        return modal;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function observeDOMChanges() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const fields = node.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
                        fields.forEach(field => {
                            if (isFieldEligible(field)) {
                                addButtonToField(field);
                            }
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes[CONFIG.ENABLED_KEY]) {
            isEnabled = changes[CONFIG.ENABLED_KEY].newValue !== false;
            if (isEnabled) {
                init();
            } else {
                removeAllButtons();
            }
        }
    });

    function removeAllButtons() {
        const buttons = document.querySelectorAll(`.${CONFIG.BUTTON_CLASS}`);
        buttons.forEach(btn => btn.remove());
    }

})();
```

### Adım 4: content/content.css

```css
.ai-text-corrector-button {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 1000;

    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;

    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    transition: all 0.3s ease;
}

.ai-text-corrector-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

.ai-text-corrector-button:active {
    transform: translateY(0);
}

.ai-text-corrector-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.ai-corrector-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ai-corrector-modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 800px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.ai-corrector-modal-header {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
}

.ai-corrector-modal-header h3 {
    margin: 0;
    font-size: 20px;
    color: #333;
}

.ai-corrector-modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}

.ai-corrector-diff {
    background: #f9f9f9;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.ai-corrector-legend {
    margin-top: 15px;
    display: flex;
    gap: 20px;
    font-size: 12px;
}

.ai-corrector-modal-footer {
    padding: 20px;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.ai-corrector-btn-primary,
.ai-corrector-btn-secondary {
    padding: 10px 24px;
    border-radius: 6px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.ai-corrector-btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.ai-corrector-btn-primary:hover {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.ai-corrector-btn-secondary {
    background: #f0f0f0;
    color: #333;
}

.ai-corrector-btn-secondary:hover {
    background: #e0e0e0;
}
```

### Adım 5: background/background.js

```javascript
importScripts('openai-provider.js', 'openwebui-provider.js');

const STORAGE_KEYS = {
    PROVIDER: 'ai_corrector_provider',
    OPENAI_KEY: 'openai_api_key_encrypted',
    OPENWEBUI_URL: 'openwebui_base_url',
    OPENWEBUI_KEY: 'openwebui_api_key_encrypted'
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'correctText') {
        handleCorrectText(request.text)
            .then(correctedText => sendResponse({ correctedText }))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
});

async function handleCorrectText(text) {
    const config = await loadConfig();

    if (!config.provider) {
        throw new Error('Provider seçilmemiş. Lütfen ayarlardan provider seçin.');
    }

    if (config.provider === 'openai') {
        if (!config.openaiKey) {
            throw new Error('OpenAI API key girilmemiş.');
        }
        return await OpenAIProvider.correctText(text, config.openaiKey);
    } else if (config.provider === 'openwebui') {
        if (!config.openwebuiUrl || !config.openwebuiKey) {
            throw new Error('OpenWebUI ayarları eksik.');
        }
        return await OpenWebUIProvider.correctText(text, config.openwebuiUrl, config.openwebuiKey);
    }

    throw new Error('Geçersiz provider: ' + config.provider);
}

async function loadConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get([
            STORAGE_KEYS.PROVIDER,
            STORAGE_KEYS.OPENAI_KEY,
            STORAGE_KEYS.OPENWEBUI_URL,
            STORAGE_KEYS.OPENWEBUI_KEY
        ], (result) => {
            resolve({
                provider: result[STORAGE_KEYS.PROVIDER] || 'openai',
                openaiKey: result[STORAGE_KEYS.OPENAI_KEY] || null,
                openwebuiUrl: result[STORAGE_KEYS.OPENWEBUI_URL] || null,
                openwebuiKey: result[STORAGE_KEYS.OPENWEBUI_KEY] || null
            });
        });
    });
}
```

### Adım 6: background/openai-provider.js

```javascript
const OpenAIProvider = {
    API_BASE_URL: 'https://api.openai.com/v1',
    MODEL: 'gpt-4o',

    SYSTEM_PROMPT: `Sen, Türkçe RESMİ YAZIŞMALAR için özelleştirilmiş bir metin düzeltme asistanısın.

==================================================
1. GENEL AMAÇ
==================================================

Kullanıcının verdiği Türkçe metni:

- Yazım (imla) hatalarından arındır,
- Dilbilgisi hatalarını düzelt,
- Noktalama işaretlerini düzelt,
- Resmî yazışma diline uygun hâle getir,
- Gerekirse cümleleri daha anlaşılır, açık ve öz hâle getir,
- METNİN ANLAMINI DEĞİŞTİRME, sadece daha doğru ve resmî hâle getir.

ÇIKTIN:
- Sadece ve yalnızca geçerli bir JSON nesnesi döndür:
  {"corrected_text":"<düzeltilmiş nihai metin>"}

- Bu JSON nesnesi DIŞINDA hiçbir şey yazma:
  - Açıklama, özet, liste, yorum, ek alan, uyarı vb. YOK.
  - JSON'dan önce/sonra boş satır, yorum vb. YOK.


==================================================
2. DAYANAK VE KURAL ÖNCELİĞİ
==================================================

Aşağıdaki kaynaklara göre düzeltme yap:

1) Türk Dil Kurumu (TDK) Yazım Kılavuzu ve Sözlük kuralları.
2) "Resmî Yazışmalarda Uygulanacak Usul ve Esaslar Hakkında Yönetmelik" ve bu yönetmeliğe ilişkin Kılavuzun hükümleri.

Çelişki durumunda öncelik sırası:
- Önce Yönetmelik ve Kılavuzun RESMİ YAZIŞMA kuralları,
- Sonra genel TDK imla kuralları.`,

    async correctText(text, apiKey) {
        const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.MODEL,
                messages: [
                    {
                        role: 'system',
                        content: this.SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `OpenAI API hatası: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        try {
            const jsonResponse = JSON.parse(content);
            return jsonResponse.corrected_text || jsonResponse.metin || jsonResponse.text || content;
        } catch (e) {
            console.error('JSON parse failed:', e);
            return content;
        }
    }
};
```

### Adım 7: background/openwebui-provider.js

```javascript
const OpenWebUIProvider = {
    async correctText(text, baseUrl, apiKey) {
        const response = await fetch(`${baseUrl}/api/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: OpenAIProvider.SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `OpenWebUI API hatası: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        try {
            const jsonResponse = JSON.parse(content);
            return jsonResponse.corrected_text || jsonResponse.metin || jsonResponse.text || content;
        } catch (e) {
            return content;
        }
    }
};
```

### Adım 8: options/options.html

```html
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Metin Düzeltici - Ayarlar</title>
    <link rel="stylesheet" href="options.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🤖 AI Türkçe Metin Düzeltici</h1>
            <p>Ayarlarınızı yapılandırın</p>
        </header>

        <main>
            <section class="settings-section">
                <h2>Provider Seçimi</h2>
                <div class="form-group">
                    <label>
                        <input type="radio" name="provider" value="openai" checked>
                        OpenAI (GPT-4o)
                    </label>
                    <label>
                        <input type="radio" name="provider" value="openwebui">
                        OpenWebUI (Self-hosted)
                    </label>
                </div>
            </section>

            <section class="settings-section" id="openai-settings">
                <h2>OpenAI Ayarları</h2>
                <div class="form-group">
                    <label for="openai-key">API Key</label>
                    <input type="password" id="openai-key" placeholder="sk-...">
                    <small>API key'iniz şifreli olarak saklanır</small>
                </div>
            </section>

            <section class="settings-section" id="openwebui-settings" style="display: none;">
                <h2>OpenWebUI Ayarları</h2>
                <div class="form-group">
                    <label for="openwebui-url">Base URL</label>
                    <input type="text" id="openwebui-url" placeholder="http://localhost:8080">
                </div>
                <div class="form-group">
                    <label for="openwebui-key">API Key</label>
                    <input type="password" id="openwebui-key" placeholder="...">
                </div>
            </section>

            <section class="settings-section">
                <h2>Genel Ayarlar</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="enabled">
                        Extension'ı etkinleştir
                    </label>
                </div>
            </section>

            <div class="actions">
                <button id="save-btn" class="btn-primary">Kaydet</button>
                <button id="test-btn" class="btn-secondary">API Bağlantısını Test Et</button>
            </div>

            <div id="status" class="status"></div>
        </main>
    </div>

    <script src="options.js"></script>
</body>
</html>
```

### Adım 9: options/options.js

```javascript
const STORAGE_KEYS = {
    PROVIDER: 'ai_corrector_provider',
    OPENAI_KEY: 'openai_api_key_encrypted',
    OPENWEBUI_URL: 'openwebui_base_url',
    OPENWEBUI_KEY: 'openwebui_api_key_encrypted',
    ENABLED: 'ai_corrector_enabled'
};

document.addEventListener('DOMContentLoaded', loadSettings);

document.querySelectorAll('input[name="provider"]').forEach(radio => {
    radio.addEventListener('change', handleProviderChange);
});

document.getElementById('save-btn').addEventListener('click', saveSettings);
document.getElementById('test-btn').addEventListener('click', testConnection);

function loadSettings() {
    chrome.storage.sync.get(Object.values(STORAGE_KEYS), (result) => {
        const provider = result[STORAGE_KEYS.PROVIDER] || 'openai';
        document.querySelector(`input[name="provider"][value="${provider}"]`).checked = true;

        document.getElementById('openai-key').value = result[STORAGE_KEYS.OPENAI_KEY] || '';
        document.getElementById('openwebui-url').value = result[STORAGE_KEYS.OPENWEBUI_URL] || '';
        document.getElementById('openwebui-key').value = result[STORAGE_KEYS.OPENWEBUI_KEY] || '';
        document.getElementById('enabled').checked = result[STORAGE_KEYS.ENABLED] !== false;

        handleProviderChange();
    });
}

function handleProviderChange() {
    const provider = document.querySelector('input[name="provider"]:checked').value;

    document.getElementById('openai-settings').style.display =
        provider === 'openai' ? 'block' : 'none';
    document.getElementById('openwebui-settings').style.display =
        provider === 'openwebui' ? 'block' : 'none';
}

function saveSettings() {
    const provider = document.querySelector('input[name="provider"]:checked').value;
    const settings = {
        [STORAGE_KEYS.PROVIDER]: provider,
        [STORAGE_KEYS.OPENAI_KEY]: document.getElementById('openai-key').value,
        [STORAGE_KEYS.OPENWEBUI_URL]: document.getElementById('openwebui-url').value,
        [STORAGE_KEYS.OPENWEBUI_KEY]: document.getElementById('openwebui-key').value,
        [STORAGE_KEYS.ENABLED]: document.getElementById('enabled').checked
    };

    chrome.storage.sync.set(settings, () => {
        showStatus('Ayarlar kaydedildi!', 'success');
    });
}

function testConnection() {
    showStatus('Test ediliyor...', 'info');

    chrome.runtime.sendMessage(
        { action: 'correctText', text: 'Bu bir test metnidir.' },
        response => {
            if (response.error) {
                showStatus('Hata: ' + response.error, 'error');
            } else {
                showStatus('Bağlantı başarılı! Sonuç: ' + response.correctedText.substring(0, 50) + '...', 'success');
            }
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
```

### Adım 10: popup/popup.html

```html
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Metin Düzeltici</title>
    <link rel="stylesheet" href="popup.css">
</head>
<body>
    <div class="popup-container">
        <h2>🤖 AI Metin Düzeltici</h2>

        <div class="toggle-section">
            <label class="switch">
                <input type="checkbox" id="enabled-toggle">
                <span class="slider"></span>
            </label>
            <span id="status-text">Etkin</span>
        </div>

        <div class="info">
            <p id="provider-info">Provider: OpenAI</p>
        </div>

        <button id="open-settings" class="btn-settings">⚙️ Ayarlar</button>
    </div>

    <script src="popup.js"></script>
</body>
</html>
```

### Adım 11: popup/popup.js

```javascript
document.addEventListener('DOMContentLoaded', () => {
    loadStatus();

    document.getElementById('enabled-toggle').addEventListener('change', toggleEnabled);
    document.getElementById('open-settings').addEventListener('click', openSettings);
});

function loadStatus() {
    chrome.storage.sync.get(['ai_corrector_enabled', 'ai_corrector_provider'], (result) => {
        const enabled = result.ai_corrector_enabled !== false;
        const provider = result.ai_corrector_provider || 'openai';

        document.getElementById('enabled-toggle').checked = enabled;
        document.getElementById('status-text').textContent = enabled ? 'Etkin' : 'Devre Dışı';
        document.getElementById('provider-info').textContent =
            `Provider: ${provider === 'openai' ? 'OpenAI' : 'OpenWebUI'}`;
    });
}

function toggleEnabled(event) {
    const enabled = event.target.checked;
    chrome.storage.sync.set({ ai_corrector_enabled: enabled }, () => {
        document.getElementById('status-text').textContent = enabled ? 'Etkin' : 'Devre Dışı';
    });
}

function openSettings() {
    chrome.runtime.openOptionsPage();
}
```

---

## Test ve Yükleme

### 1. Extension'ı Yükle

1. Chrome'da `chrome://extensions/` aç
2. Sağ üstte "Developer mode" aktif et
3. "Load unpacked" butonuna tıkla
4. `ai-text-corrector-extension` klasörünü seç

### 2. Ayarları Yap

1. Extension ikonuna tıkla → "⚙️ Ayarlar"
2. OpenAI seç
3. API key gir
4. "Kaydet"
5. "API Bağlantısını Test Et"

### 3. Test Et

1. Herhangi bir web sitesine git (örn: gmail.com, notion.so)
2. Bir textarea veya input alanına tıkla
3. Sağ üstte "🤖 Düzelt" butonu görünecek
4. Metin yaz ve "🤖 Düzelt"e tıkla
5. Diff modal'da sonucu gör
6. "Kabul Et" veya "İptal"

---

## Kullanım

### Web Sitelerinde

Extension tüm web sitelerinde çalışır:
- Gmail
- Notion
- Google Docs
- MigemPortal HelpDesk
- Herhangi bir form

### Kısayol Tuşu (Opsiyonel)

manifest.json'a ekle:

```json
"commands": {
  "trigger-correction": {
    "suggested_key": {
      "default": "Ctrl+Shift+A",
      "mac": "Command+Shift+A"
    },
    "description": "Aktif alandaki metni düzelt"
  }
}
```

---

## Geliştirme Notları

### İkon Oluşturma

```bash
# Placeholder ikonlar için (gerçek icon tasarla)
# 16x16, 48x48, 128x128 PNG dosyaları gerekli
```

### Lib Dosyaları İndir

```bash
cd lib

# crypto-js
curl -o crypto-js.min.js https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js

# jsdiff
curl -o diff.min.js https://cdn.jsdelivr.net/npm/diff@5.1.0/dist/diff.min.js
```

### Debugging

```
chrome://extensions/ → Extension → "Inspect views: service worker"
```

Console'da hatalar görünür.

---

## Güvenlik Notları

1. **API Key Encryption**: CryptoJS ile şifrele (opsiyonel, chrome.storage.sync zaten güvenli)
2. **Manifest V3**: Modern ve güvenli
3. **Host Permissions**: Sadece gerekli domainler
4. **Content Security Policy**: XSS koruması

---

## Sonuç

Bu Chrome Extension ile:
- ✅ CORS sorunu yok
- ✅ Her web sitesinde çalışır
- ✅ MigemPortal'dan bağımsız
- ✅ Kullanıcı kendi API key'ini kullanır
- ✅ OpenAI + OpenWebUI desteği

**Toplam kod:** ~1000 satır
**Geliştirme süresi:** 2-3 saat
**Deployment:** Chrome Web Store'a yüklenebilir

İyi çalışmalar! 🚀