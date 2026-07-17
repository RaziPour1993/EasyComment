document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('.star');
    const generateButton = document.getElementById('generateComment');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.querySelector('.loading');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const geminiStatusEl = document.getElementById('geminiStatus');
    const openaiApiKeyInput = document.getElementById('openaiApiKey');
    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    const saveKeysButton = document.getElementById('saveKeys');

    let rating = 0;
    let generationMode = 'template';

    applyStaticLabels();
    loadSettings();

    modeButtons.forEach((btn) => {
        btn.addEventListener('click', async () => {
            generationMode = btn.dataset.mode;
            updateModeButtons();
            try {
                await chrome.storage.sync.set({ generationMode });
            } catch (error) {
                console.error('Failed to save generation mode:', error);
            }
            refreshGeminiStatus();
        });
    });

    saveKeysButton.addEventListener('click', async () => {
        try {
            await chrome.storage.sync.set({
                openaiApiKey: openaiApiKeyInput.value.trim(),
                geminiApiKey: geminiApiKeyInput.value.trim()
            });
            showMessage(translations.keysSaved, 'success');
            refreshGeminiStatus();
        } catch (error) {
            console.error('Failed to save API keys:', error);
            showMessage(translations.error, 'error');
        }
    });

    stars.forEach((star, index) => {
        star.addEventListener('mouseover', () => {
            stars.forEach((s, i) => {
                if (i <= index) {
                    s.style.transform = 'scale(1.2)';
                    s.style.color = '#FFC107';
                }
            });
        });

        star.addEventListener('mouseout', () => {
            stars.forEach((s, i) => {
                if (!s.classList.contains('selected')) {
                    s.style.transform = 'scale(1)';
                    s.style.color = '#ddd';
                }
            });
        });
    });

    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            rating = index + 1;
            stars.forEach((s, i) => {
                s.classList.toggle('selected', i <= index);
                if (i <= index) {
                    s.style.transform = 'scale(1.2)';
                    s.style.color = '#FFC107';
                } else {
                    s.style.transform = 'scale(1)';
                    s.style.color = '#ddd';
                }
            });
        });
    });

    generateButton.addEventListener('click', async () => {
        if (rating === 0) {
            showMessage(translations.selectRating, 'error');
            return;
        }

        showLoading(translations.generatingComment || translations.loading);
        generateButton.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url || !tab.url.includes('youtube.com/watch')) {
                showMessage(translations.goToYoutube, 'error');
                hideLoading();
                generateButton.disabled = false;
                return;
            }

            const response = await chrome.runtime.sendMessage({
                action: 'generateComment',
                rating,
                mode: generationMode
            });

            hideLoading();
            generateButton.disabled = false;

            if (!response || !response.success || !response.comment) {
                showMessage((response && response.error) || translations.error, 'error');
                return;
            }

            const comment = response.comment;
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="comment-text">${escapeHtml(comment)}</div>
                <div class="action-row">
                    <button id="confirmComment" type="button">
                        <span>💬 ${escapeHtml(translations.confirmButton)}</span>
                    </button>
                    <button id="previewComment" type="button">
                        <span>👁️ ${escapeHtml(translations.previewButton)}</span>
                    </button>
                </div>
            `;

            document.getElementById('confirmComment').addEventListener('click', () => {
                handleCommentAction(tab.id, comment, false);
            });
            document.getElementById('previewComment').addEventListener('click', () => {
                handleCommentAction(tab.id, comment, true);
            });
        } catch (error) {
            console.error('Generate comment failed:', error);
            hideLoading();
            generateButton.disabled = false;
            showMessage(translations.error, 'error');
        }
    });

    function applyStaticLabels() {
        const modeTemplate = document.getElementById('modeTemplate');
        const modeChatGpt = document.getElementById('modeChatGpt');
        const modeGemini = document.getElementById('modeGemini');
        if (modeTemplate) modeTemplate.textContent = translations.modeTemplate;
        if (modeChatGpt) modeChatGpt.textContent = translations.modeChatGpt;
        if (modeGemini) modeGemini.textContent = translations.modeGemini;
        if (saveKeysButton) saveKeysButton.textContent = translations.saveKeysButton;
    }

    async function loadSettings() {
        try {
            const data = await chrome.storage.sync.get([
                'generationMode',
                'openaiApiKey',
                'geminiApiKey'
            ]);
            generationMode = data.generationMode || 'template';
            openaiApiKeyInput.value = data.openaiApiKey || '';
            geminiApiKeyInput.value = data.geminiApiKey || '';
            updateModeButtons();
            refreshGeminiStatus();
        } catch (error) {
            console.error('Failed to load settings:', error);
            updateModeButtons();
        }
    }

    function updateModeButtons() {
        modeButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.mode === generationMode);
        });
    }

    async function refreshGeminiStatus() {
        if (generationMode !== 'gemini') {
            geminiStatusEl.textContent = '';
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({ action: 'getGeminiStatus' });
            const status = response && response.status;
            if (status === 'builtin') {
                geminiStatusEl.textContent = translations.geminiStatusBuiltin;
            } else if (status === 'api_key') {
                geminiStatusEl.textContent = translations.geminiStatusApiKey;
            } else {
                geminiStatusEl.textContent = translations.geminiStatusNeedsSetup;
            }
        } catch (error) {
            console.error('Failed to refresh Gemini status:', error);
            geminiStatusEl.textContent = translations.geminiStatusNeedsSetup;
        }
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showMessage(message, type) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `<div class="${type}-message">${escapeHtml(message)}</div>`;
    }

    function showLoading(message) {
        loadingDiv.style.display = 'block';
        loadingDiv.querySelector('.loading-text').textContent = message;
        resultDiv.style.display = 'none';
    }

    function hideLoading() {
        loadingDiv.style.display = 'none';
    }

    async function handleCommentAction(tabId, comment, preview) {
        try {
            showLoading(
                preview
                    ? translations.previewingComment || 'Previewing your comment...'
                    : translations.postingComment || 'Posting your comment...'
            );
            const postResponse = await chrome.tabs.sendMessage(tabId, {
                action: 'postComment',
                comment,
                preview
            });
            hideLoading();
            if (postResponse && postResponse.success) {
                showMessage(
                    preview
                        ? translations.previewSuccess || 'Preview successful!'
                        : translations.confirmSuccess || 'Comment posted successfully!',
                    'success'
                );
            } else {
                showMessage(translations.error, 'error');
            }
        } catch (error) {
            console.error('Post comment failed:', error);
            hideLoading();
            showMessage(translations.error, 'error');
        }
    }
});
