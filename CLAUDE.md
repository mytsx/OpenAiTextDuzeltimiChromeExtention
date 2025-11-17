# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome Extension (Manifest V3) that adds AI-powered Turkish text correction buttons **ONLY to rich text editors** (CKEditor, Summernote, TinyMCE, Quill). Uses OpenAI GPT-4o to correct text according to TDK (Turkish Language Association) standards and official correspondence regulations.

**Current Version:** 3.1.0

## Build & Development Commands

**No build step required** - this is vanilla JavaScript with no dependencies or build process.

**Development workflow:**
1. Make code changes
2. Reload extension: `chrome://extensions/` → Click reload icon
3. Refresh test webpage (F5)

**Package for distribution:**
```bash
zip -r dist.zip manifest.json background content popup options lib icons
```

**Debugging:**
- Background script: `chrome://extensions/` → "Inspect views: service worker"
- Content script: F12 on any webpage → Console tab
- Popup: Right-click extension icon → "Inspect popup"

## Architecture

### Message Flow
```
Content Script (content.js)
    ↓ chrome.runtime.sendMessage({ action: 'correctText', text })
Background Script (background.js)
    ↓ OpenAIProvider.correctText(text, apiKey)
OpenAI API (GPT-4o with JSON mode)
    ↓ { "corrected_text": "..." }
Background Script
    ↓ sendResponse({ correctedText })
Content Script → Shows diff modal with accept/reject
```

### Storage Architecture (CRITICAL)

**Security fix in v2.1.0+:** API keys MUST use `chrome.storage.local` (not sync)

```javascript
// API key - chrome.storage.local (device-specific, NOT synced)
STORAGE_KEYS.OPENAI_KEY = 'openai_api_key'

// Settings - chrome.storage.sync (synced across devices)
STORAGE_KEYS.ENABLED = 'ai_corrector_enabled'
```

**Rationale:** API keys in `chrome.storage.sync` would sync across all user devices via Google account, creating security risk. Always use `local` for secrets.

### Rich Text Editor Support (v3.1.0: ONLY Rich Editors)

**Important:** As of v3.1.0, buttons appear **ONLY** in rich text editors (CKEditor, Summernote, TinyMCE, Quill). Normal textarea/input fields are **NOT** supported.

**Rationale:** Users requested to limit the extension to professional rich text editors only, not all text fields.

**Detection functions** (each runs on init and via MutationObserver):
- `detectCKEditor()`: Checks `window.CKEDITOR.instances` + `.ck-editor` class for CKEditor 4.x/5.x
- `detectSummernote()`: Checks `.note-editor` container
- `detectTinyMCE()`: Checks `window.tinymce.editors`
- `detectQuill()`: Checks `.ql-container`

**Button placement:**
- **Rich editors:** Button added to toolbar (integrated into editor UI)
- **Plain textarea/input:** NOT supported (removed in v3.1.0)

### HTML Format Preservation (v3.0.0+)

**Critical feature:** When correcting rich text, preserve HTML formatting (bold, italic, links, lists).

**Implementation:**
```javascript
// getEditorValue returns object with both text and HTML
{ text: "plain text", html: "<b>formatted</b> text", isPlainText: false }

// mapTextToHTML does word-based replacement preserving tags
correctedHTML = mapTextToHTML(originalHTML, originalText, correctedText)

// setEditorValue uses correctedHTML for rich editors
editor.setData(correctedHTML)  // CKEditor
editor.innerHTML = correctedHTML  // Others
```

**Algorithm:** Word-by-word diff between original and corrected text, replacing words inside HTML without touching tags. Falls back to plain text if word count differs by >50%.

### Enable/Disable Mechanism (v2.1.0+)

**Problem:** MutationObserver continued running after disable, causing buttons to reappear.

**Solution:** Robust enable/disable mechanism using three guards and observer disconnect:
```javascript
// Guard 1: Check before adding buttons (line 33)
function addButtonsToExistingFields() {
    if (!isEnabled) return;
}

// Guard 2: Check before starting observer (line 458)
function observeDOMChanges() {
    if (!isEnabled) return;
}

// Guard 3: Check inside observer callback (line 467)
domObserver = new MutationObserver(mutations => {
    if (!isEnabled) return;
});

// Guard 4: Disconnect observer when disabled (line 514)
function disconnectObserver() {
    if (domObserver) {
        domObserver.disconnect();
        domObserver = null;
    }
}
```

### Processed Fields Tracking (v2.1.1+)

**Critical fix:** Changed from `WeakSet` to `Set` because WeakSet doesn't have `.clear()` method.

```javascript
const processedFields = new Set();  // line 14

// Clear when disabled
function removeAllButtons() {
    processedFields.clear();  // Works with Set, not WeakSet
}
```

### Chrome Service Worker Fetch Quirk (v3.0.1)

**Problem:** Manifest V3 service workers throw "non ISO-8859-1 code point" error when headers contain Turkish characters or are improperly constructed.

**Solution:** Use `Headers` constructor instead of object literal:
```javascript
// CORRECT (v3.0.1+):
const headers = new Headers();
headers.append('Content-Type', 'application/json; charset=utf-8');
headers.append('Authorization', 'Bearer ' + apiKey);

// INCORRECT (causes errors):
headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
}
```

## File Organization

```
manifest.json          - Extension config (v3.1.0)
background/
  ├── background.js         - Message handler, loads config from storage
  └── openai-provider.js    - OpenAI API client with Headers fix (v3.0.1)
content/
  ├── content.js            - Button injection, rich editor detection, HTML preservation
  └── content.css           - Button styles, modal styles
options/
  ├── options.html/js/css   - Settings page with 4-layer error handling
popup/
  ├── popup.html/js/css     - Quick enable/disable toggle
lib/
  └── diff.min.js           - jsdiff library for preview modal
prompts/
  └── turkish-official.txt  - TDK + official correspondence rules (embedded in code)
```

## Coding Conventions

**Style:**
- Vanilla JavaScript ES2020, no modules or transpilation
- 4 spaces indentation, single quotes
- Variables: `camelCase`, Constants: `UPPER_SNAKE_CASE`
- Files: lowercase with hyphens (`openai-provider.js`, `popup.html`)

**Commit messages:** Follow conventional commits pattern:
```
type: summary (version)

Examples:
feat: HTML format preservation in rich text editors (v3.0.0)
fix: Chrome Service Worker fetch header encoding issue (v3.0.1)
chore: Bump version to 2.1.1
```

## Testing Checklist

Before committing changes, manually test:

1. **Popup toggle:** Enable/disable in popup → verify buttons appear/disappear
2. **Settings page:** Save API key → test connection → verify success message
3. **CKEditor:** WordPress admin, Drupal → verify button appears in toolbar
4. **Summernote:** CMS editors → verify button appears in toolbar
5. **TinyMCE:** Various CMSs → verify button appears in toolbar
6. **Quill:** Notion-like editors → verify button appears in toolbar
7. **Plain textarea/input:** Gmail compose, basic forms → verify NO buttons appear (v3.1.0+)
8. **HTML preservation:** Bold/italic text → correct → verify formatting preserved
9. **Disable flow:** Disable in popup → verify observer stops → no buttons reappear on DOM changes

**Check service worker logs** for any runtime errors after each test.

## Common Issues & Fixes

### "Duplicate buttons in Quill editor toolbar"
- **Cause:** detectQuill() checks container but adds toolbar to processedFields
- **Fix:** Explicitly mark container as processed when adding button to toolbar (fixed in v3.1.0, line 109)

### "Format loss when accepting corrections"
- **Cause:** Using `innerText` instead of HTML preservation
- **Fix:** Ensure `mapTextToHTML()` is called for rich editors (implemented in v3.0.0)

### "WeakSet.clear() TypeError"
- **Cause:** WeakSet doesn't have clear() method
- **Fix:** Use `Set` instead (fixed in v2.1.1, line 14)

### "Buttons reappear after disabling"
- **Cause:** MutationObserver not disconnected
- **Fix:** Call `disconnectObserver()` when disabled (line 514)

### "Failed to read headers property" fetch error
- **Cause:** Object literal headers in Service Worker with non-ASCII chars
- **Fix:** Use `Headers` constructor (fixed in v3.0.1, openai-provider.js lines 60-62)

### "API key not saved" or "syncing to wrong devices"
- **Cause:** Using sync storage for API keys
- **Fix:** MUST use `chrome.storage.local` for API keys (security requirement)

## Turkish Correction Prompt

System prompt follows:
1. **TDK** (Türk Dil Kurumu) spelling and grammar rules
2. **Official correspondence regulations** (Resmî Yazışmalarda Uygulanacak Usul ve Esaslar)
3. **JSON-only output:** `{"corrected_text":"..."}`
4. **Temperature:** 0.3 for consistency
5. **Model:** gpt-4o with `response_format: { type: 'json_object' }`

Priority order: Official correspondence rules > TDK general rules

## Version History (Key Changes)

- **v3.1.0:** BREAKING: Removed support for plain textarea/input - ONLY rich text editors supported
- **v3.0.1:** Fix Chrome Service Worker fetch header encoding (Headers constructor)
- **v3.0.0:** HTML format preservation in rich text editors
- **v2.1.1:** Fix WeakSet.clear() crash (changed to Set)
- **v2.1.0:** Security fix (API keys to local storage), enable/disable guards, error handling
- **v2.0.0:** Rich text editor support, duplicate button prevention
- **v1.0.0:** Initial release

## Critical Security Rules

1. **API keys:** ALWAYS use `chrome.storage.local`, NEVER sync
2. **New external APIs:** Add to `host_permissions` in manifest.json
3. **User input:** All text goes through background script (no direct API calls from content script)
4. **Storage keys:** Document in STORAGE_KEYS constant, maintain consistency across files
