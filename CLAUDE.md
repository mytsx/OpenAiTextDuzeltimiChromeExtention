# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension (Manifest V3) that adds AI-powered Turkish text correction buttons to all text input fields across the web. It uses OpenAI's GPT-4o to correct text according to Turkish official writing rules (TDK standards and official correspondence guidelines).

**Current Version:** 2.0.0

## Development Setup

### Testing the Extension

1. Load unpacked extension in Chrome:
   ```
   chrome://extensions/ → Enable "Developer mode" → "Load unpacked" → Select this directory
   ```

2. After making changes, reload the extension:
   ```
   chrome://extensions/ → Click reload icon next to the extension
   ```

3. Refresh the test webpage (F5)

### Debugging

- **Background script errors**: `chrome://extensions/` → Extension → "Inspect views: service worker"
- **Content script errors**: Open DevTools on any webpage (F12) → Console tab
- **Popup errors**: Right-click extension icon → "Inspect popup"

## Architecture

### Message Flow
```
Content Script (content.js)
    ↓ chrome.runtime.sendMessage({ action: 'correctText', text })
Background Script (background.js)
    ↓ OpenAIProvider.correctText(text, apiKey)
OpenAI API (GPT-4o)
    ↓ JSON response { corrected_text: "..." }
Background Script
    ↓ sendResponse({ correctedText })
Content Script → Shows diff modal
```

### Key Components

**Content Script (content/content.js)**
- Runs on all web pages (`<all_urls>`)
- Detects and injects buttons into text fields
- Rich text editor detection: CKEditor (4.x, 5.x), Summernote, TinyMCE, Quill
- Uses `WeakSet` to track processed fields (prevents duplicate buttons)
- MutationObserver with 500ms debounce for dynamic content
- 1000ms initial delay to allow rich text editors to load

**Background Script (background/background.js)**
- Service worker (Manifest V3)
- Handles API communication with OpenAI
- Loads API key from chrome.storage.sync
- Returns corrected text or error messages

**OpenAI Provider (background/openai-provider.js)**
- GPT-4o model with response_format: json_object
- Temperature: 0.3 (for consistency)
- System prompt from prompts/turkish-official.txt (TDK rules)
- Expects JSON response: `{ "corrected_text": "..." }`

### Storage Keys
```javascript
STORAGE_KEYS = {
    OPENAI_KEY: 'openai_api_key',
    ENABLED: 'ai_corrector_enabled'
}
```

## Critical Implementation Details

### Rich Text Editor Button Placement

**Problem:** Rich text editors use contenteditable divs, which would trigger both toolbar buttons AND floating buttons.

**Solution:** The `isFieldEligible()` function filters out contenteditable elements inside rich text editors:
- Checks for `.ck-content`, `.note-editable`, `.ql-editor` classes
- Checks for parent containers: `.ck-editor`, `.note-editor`, `.ql-container`, `.tox-tinymce`
- Only toolbar buttons appear for rich editors; floating buttons appear for plain textareas/inputs

### Field Filtering Logic
Fields are skipped if they are:
- Inside rich text editor containers (see above)
- Too small (< 100px width or < 30px height) → prevents search boxes
- Password, email, number, tel, url, or search input types
- Read-only or disabled
- Hidden (display: none or no offsetParent)

### Detection Functions
Each rich text editor has its own detection function:
- `detectCKEditor()`: Checks `window.CKEDITOR.instances` + `.ck-editor` class
- `detectSummernote()`: Checks `.note-editor` container
- `detectTinyMCE()`: Checks `window.tinymce.editors`
- `detectQuill()`: Checks `.ql-container`

## Turkish Correction Prompt

The system prompt in `prompts/turkish-official.txt` follows:
1. TDK (Türk Dil Kurumu) spelling and grammar rules
2. Official correspondence regulations ("Resmî Yazışmalarda Uygulanacak Usul ve Esaslar")
3. Must return ONLY valid JSON: `{"corrected_text":"..."}`
4. Preserves meaning, only corrects grammar/spelling/formality

## Common Issues

### "Buttons appearing twice"
- Rich text editor contenteditable elements must be filtered in `isFieldEligible()`
- Check if new editor type needs to be added to detection functions

### "Buttons not appearing"
- Extension enabled? Check popup toggle
- Check console for errors
- Rich text editors need 1000ms to initialize (see `init()` timeout)
- MutationObserver debounces 500ms - wait before expecting buttons

### "API errors"
- Check if API key is set in options page
- OpenAI API key format: starts with `sk-proj-` or `sk-`
- Background script logs visible in service worker inspector

## File Organization

```
manifest.json          → Extension config, permissions, content_scripts
background/
  ├── background.js         → Message handling, API orchestration
  └── openai-provider.js    → OpenAI API client (GPT-4o)
content/
  ├── content.js            → Button injection, rich editor detection
  └── content.css           → Button styles, modal styles
options/
  ├── options.html/js/css   → Settings page (API key management)
popup/
  ├── popup.html/js/css     → Quick toggle UI
lib/
  └── diff.min.js           → Text diffing for preview modal
prompts/
  └── turkish-official.txt  → System prompt for corrections
```

## Testing Workflow

1. Make code changes
2. Reload extension at `chrome://extensions/`
3. Refresh test webpage
4. Test on pages with different editor types:
   - Plain textarea (Gmail compose)
   - Summernote (various CMSs)
   - CKEditor (WordPress, Drupal)
   - Quill (Notion-like editors)

## Storage Format

API key stored in `chrome.storage.sync`:
```javascript
{
  'openai_api_key': 'sk-proj-...',
  'ai_corrector_enabled': true
}
```
