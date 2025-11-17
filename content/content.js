(function() {
    'use strict';

    const CONFIG = {
        BUTTON_CLASS: 'ai-text-corrector-button',
        MODAL_ID: 'ai-text-corrector-modal',
        ENABLED_KEY: 'ai_corrector_enabled'
    };

    let isEnabled = true;
    let buttonCounter = 0;
    const processedFields = new WeakSet();

    chrome.storage.sync.get([CONFIG.ENABLED_KEY], function(result) {
        isEnabled = result[CONFIG.ENABLED_KEY] !== false;
        if (isEnabled) {
            init();
        }
    });

    function init() {
        // İlk yüklemede biraz bekle (editörler yüklensin)
        setTimeout(() => {
            addButtonsToExistingFields();
            observeDOMChanges();
        }, 1000);
    }

    function addButtonsToExistingFields() {
        // Normal alanlar
        const fields = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
        fields.forEach(field => {
            if (!processedFields.has(field) && isFieldEligible(field)) {
                addButtonToField(field);
            }
        });

        // Rich text editörleri tespit et
        detectRichTextEditors();
    }

    function detectRichTextEditors() {
        // CKEditor 4.x ve 5.x
        detectCKEditor();

        // Summernote
        detectSummernote();

        // TinyMCE
        detectTinyMCE();

        // Quill
        detectQuill();
    }

    function detectCKEditor() {
        // CKEditor 4.x
        if (window.CKEDITOR && window.CKEDITOR.instances) {
            Object.keys(window.CKEDITOR.instances).forEach(instanceName => {
                const editor = window.CKEDITOR.instances[instanceName];
                const editorElement = editor.container.$;

                if (editorElement && !processedFields.has(editorElement)) {
                    addButtonToRichEditor(editorElement, 'ckeditor4', editor);
                }
            });
        }

        // CKEditor 5.x (class-based detection)
        document.querySelectorAll('.ck-editor').forEach(editorElement => {
            if (!processedFields.has(editorElement)) {
                const editableElement = editorElement.querySelector('.ck-content[contenteditable="true"]');
                if (editableElement) {
                    addButtonToRichEditor(editorElement, 'ckeditor5', editableElement);
                }
            }
        });
    }

    function detectSummernote() {
        document.querySelectorAll('.note-editor').forEach(editorElement => {
            if (!processedFields.has(editorElement)) {
                const editableElement = editorElement.querySelector('.note-editable');
                if (editableElement) {
                    addButtonToRichEditor(editorElement, 'summernote', editableElement);
                }
            }
        });
    }

    function detectTinyMCE() {
        if (window.tinymce && window.tinymce.editors) {
            window.tinymce.editors.forEach(editor => {
                const editorElement = editor.getContainer();
                if (editorElement && !processedFields.has(editorElement)) {
                    addButtonToRichEditor(editorElement, 'tinymce', editor);
                }
            });
        }
    }

    function detectQuill() {
        document.querySelectorAll('.ql-container').forEach(container => {
            if (!processedFields.has(container)) {
                const editableElement = container.querySelector('.ql-editor');
                if (editableElement) {
                    const toolbar = container.previousElementSibling;
                    if (toolbar && toolbar.classList.contains('ql-toolbar')) {
                        addButtonToRichEditor(toolbar, 'quill', editableElement);
                    } else {
                        addButtonToRichEditor(container, 'quill', editableElement);
                    }
                }
            }
        });
    }

    function isFieldEligible(field) {
        // Zaten işlenmiş mi?
        if (processedFields.has(field)) return false;

        // Temel kontroller
        if (field.readOnly || field.disabled) return false;
        if (field.style.display === 'none' || field.offsetParent === null) return false;
        if (field.closest('[data-ai-corrector-ignore]')) return false;

        // Rich text editör içindeki contenteditable alanları atla (onlar için toolbar'a buton ekliyoruz)
        if (field.contentEditable === 'true' || field.getAttribute('contenteditable') === 'true') {
            // CKEditor editable alanı mı?
            if (field.classList.contains('ck-content') || field.classList.contains('ck-editor__editable')) {
                return false;
            }
            // Summernote editable alanı mı?
            if (field.classList.contains('note-editable')) {
                return false;
            }
            // Quill editable alanı mı?
            if (field.classList.contains('ql-editor')) {
                return false;
            }
            // TinyMCE editable alanı mı?
            if (field.id && field.id.includes('tinymce')) {
                return false;
            }
            // Genel kontrol: rich text editör container içinde mi?
            if (field.closest('.ck-editor, .note-editor, .ql-container, .tox-tinymce')) {
                return false;
            }
        }

        // Çok küçük alanları atla (search box vb.)
        if (field.offsetWidth < 100 || field.offsetHeight < 30) return false;

        // Password, email vb. atla
        if (field.type && ['password', 'email', 'number', 'tel', 'url', 'search'].includes(field.type)) return false;

        return true;
    }

    function addButtonToField(field) {
        const fieldId = field.id || `ai-field-${buttonCounter++}`;
        if (!field.id) field.id = fieldId;

        const button = createButton(fieldId, field);
        insertButtonNearField(field, button);
        processedFields.add(field);
    }

    function addButtonToRichEditor(containerElement, editorType, editorInstance) {
        const fieldId = `ai-richeditor-${buttonCounter++}`;
        const button = createButton(fieldId, editorInstance, editorType);

        // Rich editörler için butonu daha iyi konumlandır
        insertButtonForRichEditor(containerElement, button, editorType);
        processedFields.add(containerElement);
    }

    function createButton(fieldId, fieldOrEditor, editorType = null) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = CONFIG.BUTTON_CLASS;
        button.dataset.aiFieldId = fieldId;
        button.dataset.aiCorrectorButton = 'true';
        if (editorType) {
            button.dataset.editorType = editorType;
        }
        button.innerHTML = '🤖 Düzelt';
        button.title = 'AI ile Türkçe düzeltme yap';

        button.addEventListener('click', (event) => handleButtonClick(event, fieldOrEditor, editorType));

        return button;
    }

    function insertButtonNearField(field, button) {
        // Parent'ın position'ını kontrol et
        const parent = field.parentNode;
        const parentPosition = window.getComputedStyle(parent).position;

        if (parentPosition === 'static') {
            parent.style.position = 'relative';
        }

        parent.appendChild(button);
    }

    function insertButtonForRichEditor(editorElement, button, editorType) {
        // Rich editörler için toolbar'a veya container'a ekle
        let targetElement = editorElement;

        if (editorType === 'summernote') {
            // Summernote için toolbar'ı bul
            const toolbar = editorElement.querySelector('.note-toolbar');
            if (toolbar) {
                const btnGroup = document.createElement('div');
                btnGroup.className = 'note-btn-group btn-group';
                button.style.position = 'relative';
                button.style.margin = '5px';
                btnGroup.appendChild(button);
                toolbar.appendChild(btnGroup);
                return;
            }
        } else if (editorType === 'quill') {
            // Quill için toolbar sonuna ekle
            if (editorElement.classList.contains('ql-toolbar')) {
                button.style.position = 'relative';
                button.style.margin = '0 5px';
                editorElement.appendChild(button);
                return;
            }
        } else if (editorType === 'ckeditor5') {
            // CKEditor 5 için toolbar bul
            const toolbar = editorElement.querySelector('.ck-toolbar');
            if (toolbar) {
                button.style.position = 'relative';
                button.style.margin = '0 5px';
                toolbar.appendChild(button);
                return;
            }
        }

        // Varsayılan: container'a ekle
        const parentPosition = window.getComputedStyle(targetElement).position;
        if (parentPosition === 'static') {
            targetElement.style.position = 'relative';
        }
        targetElement.appendChild(button);
    }

    async function handleButtonClick(event, fieldOrEditor, editorType = null) {
        event.preventDefault();
        const button = event.currentTarget;

        const originalText = getEditorValue(fieldOrEditor, editorType);
        if (!originalText || originalText.trim().length < 10) {
            alert('Lütfen düzeltilecek metin girin (en az 10 karakter)');
            return;
        }

        button.disabled = true;
        button.innerHTML = '⏳ Düzeltiliyor...';

        try {
            const correctedText = await requestCorrection(originalText);
            showDiffModal(originalText, correctedText, fieldOrEditor, button, editorType);
        } catch (error) {
            alert('Hata: ' + error.message);
            button.disabled = false;
            button.innerHTML = '🤖 Düzelt';
        }
    }

    function getEditorValue(fieldOrEditor, editorType) {
        if (!editorType) {
            // Normal field
            if (fieldOrEditor.isContentEditable) {
                return fieldOrEditor.innerText || fieldOrEditor.textContent;
            }
            return fieldOrEditor.value;
        }

        // Rich text editörler
        switch (editorType) {
            case 'ckeditor4':
                return fieldOrEditor.getData().replace(/<[^>]*>/g, '');

            case 'ckeditor5':
                return fieldOrEditor.innerText || fieldOrEditor.textContent;

            case 'summernote':
                return fieldOrEditor.innerText || fieldOrEditor.textContent;

            case 'tinymce':
                return fieldOrEditor.getContent({ format: 'text' });

            case 'quill':
                return fieldOrEditor.innerText || fieldOrEditor.textContent;

            default:
                return fieldOrEditor.innerText || fieldOrEditor.textContent || fieldOrEditor.value || '';
        }
    }

    function setEditorValue(fieldOrEditor, value, editorType) {
        if (!editorType) {
            // Normal field
            if (fieldOrEditor.isContentEditable) {
                fieldOrEditor.innerText = value;
            } else {
                fieldOrEditor.value = value;
            }
            fieldOrEditor.dispatchEvent(new Event('input', { bubbles: true }));
            fieldOrEditor.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        // Rich text editörler
        switch (editorType) {
            case 'ckeditor4':
                fieldOrEditor.setData(value);
                break;

            case 'ckeditor5':
                fieldOrEditor.innerText = value;
                fieldOrEditor.dispatchEvent(new Event('input', { bubbles: true }));
                break;

            case 'summernote':
                fieldOrEditor.innerText = value;
                fieldOrEditor.dispatchEvent(new Event('input', { bubbles: true }));
                break;

            case 'tinymce':
                fieldOrEditor.setContent(value);
                break;

            case 'quill':
                fieldOrEditor.innerText = value;
                fieldOrEditor.dispatchEvent(new Event('input', { bubbles: true }));
                break;
        }
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

    function showDiffModal(original, corrected, fieldOrEditor, button, editorType) {
        const existingModal = document.getElementById(CONFIG.MODAL_ID);
        if (existingModal) existingModal.remove();

        const modal = createDiffModal(original, corrected);
        document.body.appendChild(modal);

        const acceptBtn = modal.querySelector('[data-action="accept"]');
        const rejectBtn = modal.querySelector('[data-action="reject"]');

        acceptBtn.addEventListener('click', () => {
            setEditorValue(fieldOrEditor, corrected, editorType);
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
            let needsUpdate = false;

            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        needsUpdate = true;
                    }
                });
            });

            if (needsUpdate) {
                // Debounce: 500ms sonra kontrol et
                clearTimeout(observeDOMChanges.timer);
                observeDOMChanges.timer = setTimeout(() => {
                    addButtonsToExistingFields();
                }, 500);
            }
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
        processedFields.clear();
    }

})();
