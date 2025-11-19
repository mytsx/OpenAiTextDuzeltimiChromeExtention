importScripts('openai-provider.js');

const STORAGE_KEYS = {
    OPENAI_KEY: 'openai_api_key',
    CUSTOM_PROMPT: 'custom_system_prompt'
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

    if (!config.openaiKey) {
        throw new Error('OpenAI API key girilmemiş. Lütfen ayarlardan API key girin.');
    }

    return await OpenAIProvider.correctText(text, config.openaiKey, config.systemPrompt);
}

async function loadConfig() {
    return new Promise((resolve) => {
        // Tüm ayarları local storage'dan oku
        // Not: Prompt boyutu sync storage limitini (8KB) aşabildiği için local storage kullanıyoruz.
        chrome.storage.local.get([STORAGE_KEYS.OPENAI_KEY, STORAGE_KEYS.CUSTOM_PROMPT], (result) => {
            resolve({
                openaiKey: result[STORAGE_KEYS.OPENAI_KEY] || null,
                systemPrompt: result[STORAGE_KEYS.CUSTOM_PROMPT] || null
            });
        });
    });
}
