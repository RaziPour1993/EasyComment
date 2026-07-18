document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('.star');
    const generateButton = document.getElementById('generateComment');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.querySelector('.loading');
    const aiStatusEl = document.getElementById('aiStatus');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const modeTemplateBtn = document.getElementById('modeTemplate');
    const modeOnDeviceBtn = document.getElementById('modeOnDevice');
    const languageSelect = document.getElementById('commentLanguage');
    const toneSelect = document.getElementById('commentTone');
    const lengthButtons = document.querySelectorAll('#commentLength .pref-btn');
    const commentSettingsEl = document.getElementById('commentSettings');

    let rating = 0;
    let generationMode = 'template';
    let userChangedMode = false;
    let commentPrefs = normalizeCommentPrefs(
        typeof DEFAULT_COMMENT_PREFS !== 'undefined' ? DEFAULT_COMMENT_PREFS : null
    );

    if (modeTemplateBtn) modeTemplateBtn.textContent = translations.modeTemplate;
    if (modeOnDeviceBtn) modeOnDeviceBtn.textContent = translations.modeOnDevice;

    const settingsTitle = document.querySelector('[data-i18n="commentSettingsTitle"]');
    if (settingsTitle) {
        settingsTitle.textContent = translations.commentSettingsTitle || 'Comment style';
    }
    const languageLabel = document.querySelector('[data-i18n="languageLabel"]');
    if (languageLabel) {
        languageLabel.textContent = translations.languageLabel || 'Language';
    }
    const lengthLabel = document.querySelector('[data-i18n="lengthLabel"]');
    if (lengthLabel) {
        lengthLabel.textContent = translations.lengthLabel || 'Length';
    }
    const toneLabelEl = document.querySelector('[data-i18n="toneLabel"]');
    if (toneLabelEl) {
        toneLabelEl.textContent = translations.toneLabel || 'Tone';
    }

    const aboutLink = document.getElementById('aboutLink');
    if (aboutLink) {
        aboutLink.textContent = translations.aboutLink || 'About';
        aboutLink.addEventListener('click', (event) => {
            event.preventDefault();
            const aboutUrl = chrome.runtime.getURL('about.html');
            chrome.tabs.create({ url: aboutUrl }).catch((error) => {
                console.error('Failed to open About page:', error);
                window.open(aboutUrl, '_blank', 'noopener,noreferrer');
            });
        });
    }

    initCommentSettingsControls();
    const settingsReady = loadSettings();

    modeButtons.forEach((btn) => {
        btn.addEventListener('click', async () => {
            userChangedMode = true;
            generationMode = btn.dataset.mode === 'ondevice' ? 'ondevice' : 'template';
            updateModeButtons();
            updateModeDependentUi();
            try {
                await chrome.storage.sync.set({ generationMode });
            } catch (error) {
                console.error('Failed to save generation mode:', error);
            }
            if (generationMode === 'ondevice') {
                refreshAiStatus();
            }
        });
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
        await settingsReady;

        if (rating === 0) {
            showMessage(translations.selectRating, 'error');
            return;
        }

        showLoading(translations.generatingComment || translations.loading);
        generateButton.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id || !tab.url || !tab.url.includes('youtube.com/watch')) {
                showMessage(translations.goToYoutube, 'error');
                hideLoading();
                generateButton.disabled = false;
                return;
            }

            // Generate in the popup context so Gemini Nano uses LanguageModel here,
            // and Local templates never get mixed into the on-device path.
            let videoContext = { title: '', channel: '', description: '' };
            if (generationMode === 'ondevice') {
                videoContext = await fetchVideoContext(tab.id);
                if (!videoContext.title && tab.title) {
                    videoContext.title = String(tab.title).replace(/ - YouTube$/i, '').trim();
                }
                console.log('Gemini Nano video title:', videoContext.title || '(missing)');
            }

            const result = await generateComment(
                generationMode,
                rating,
                videoContext,
                commentPrefs
            );
            hideLoading();
            generateButton.disabled = false;

            if (!result || !result.comment) {
                showMessage(translations.error, 'error');
                return;
            }

            showGeneratedComment(tab.id, result.comment, result.source);
        } catch (error) {
            console.error('Generate comment failed:', error);
            hideLoading();
            generateButton.disabled = false;
            const code = error && error.message ? error.message : 'UNKNOWN';
            const mapped =
                (translations.aiErrors && translations.aiErrors[code]) || translations.error;
            showMessage(mapped, 'error');
        }
    });

    function initCommentSettingsControls() {
        const languages =
            typeof COMMENT_LANGUAGES !== 'undefined'
                ? COMMENT_LANGUAGES
                : ['auto', 'Persian', 'English'];
        const tones =
            typeof COMMENT_TONES !== 'undefined'
                ? COMMENT_TONES
                : ['casual', 'friendly', 'formal'];

        if (languageSelect) {
            languageSelect.innerHTML = '';
            languages.forEach((lang) => {
                const option = document.createElement('option');
                option.value = lang;
                option.textContent =
                    lang === 'auto'
                        ? translations.languageAuto || 'Follow video title'
                        : lang;
                languageSelect.appendChild(option);
            });
            languageSelect.addEventListener('change', async () => {
                commentPrefs = normalizeCommentPrefs({
                    ...commentPrefs,
                    language: languageSelect.value
                });
                await saveCommentPrefs();
            });
        }

        if (toneSelect) {
            toneSelect.innerHTML = '';
            tones.forEach((tone) => {
                const option = document.createElement('option');
                option.value = tone;
                option.textContent = toneLabel(tone);
                toneSelect.appendChild(option);
            });
            toneSelect.addEventListener('change', async () => {
                commentPrefs = normalizeCommentPrefs({
                    ...commentPrefs,
                    tone: toneSelect.value
                });
                await saveCommentPrefs();
            });
        }

        const lengthShort = document.getElementById('lengthShort');
        const lengthMedium = document.getElementById('lengthMedium');
        const lengthLong = document.getElementById('lengthLong');
        if (lengthShort) lengthShort.textContent = translations.lengthShort || 'Short';
        if (lengthMedium) lengthMedium.textContent = translations.lengthMedium || 'Medium';
        if (lengthLong) lengthLong.textContent = translations.lengthLong || 'Long';

        lengthButtons.forEach((btn) => {
            btn.addEventListener('click', async () => {
                commentPrefs = normalizeCommentPrefs({
                    ...commentPrefs,
                    length: btn.dataset.length
                });
                updateLengthButtons();
                await saveCommentPrefs();
            });
        });

        applyCommentPrefsToUi();
    }

    function toneLabel(tone) {
        const map = {
            casual: translations.toneCasual,
            friendly: translations.toneFriendly,
            formal: translations.toneFormal,
            enthusiastic: translations.toneEnthusiastic,
            constructive: translations.toneConstructive,
            humorous: translations.toneHumorous,
            professional: translations.toneProfessional
        };
        return map[tone] || tone;
    }

    async function loadSettings() {
        try {
            const data = await chrome.storage.sync.get(['generationMode', 'commentPrefs']);
            if (!userChangedMode) {
                generationMode = data.generationMode === 'ondevice' ? 'ondevice' : 'template';
            }
            commentPrefs = normalizeCommentPrefs(data.commentPrefs);
        } catch (error) {
            console.error('Failed to load settings:', error);
            if (!userChangedMode) {
                generationMode = 'template';
            }
            commentPrefs = normalizeCommentPrefs(null);
        }
        updateModeButtons();
        updateModeDependentUi();
        applyCommentPrefsToUi();
        refreshAiStatus();
    }

    async function saveCommentPrefs() {
        try {
            await chrome.storage.sync.set({ commentPrefs });
        } catch (error) {
            console.error('Failed to save comment prefs:', error);
        }
    }

    function applyCommentPrefsToUi() {
        if (languageSelect) {
            languageSelect.value = commentPrefs.language;
        }
        if (toneSelect) {
            toneSelect.value = commentPrefs.tone;
        }
        updateLengthButtons();
    }

    function updateLengthButtons() {
        lengthButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.length === commentPrefs.length);
        });
    }

    function updateModeButtons() {
        modeButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.mode === generationMode);
        });
    }

    function updateModeDependentUi() {
        const isOnDevice = generationMode === 'ondevice';
        if (aiStatusEl) {
            aiStatusEl.style.display = isOnDevice ? 'block' : 'none';
        }
        if (commentSettingsEl) {
            commentSettingsEl.hidden = !isOnDevice;
            if (!isOnDevice) {
                commentSettingsEl.open = false;
            }
        }
    }

    async function refreshAiStatus() {
        try {
            // Prefer checking LanguageModel in the popup itself (same context used to generate).
            let available = false;
            if (typeof getBuiltInAiStatus === 'function') {
                available = (await getBuiltInAiStatus()) === 'available';
            } else {
                const response = await chrome.runtime.sendMessage({ action: 'getBuiltInAiStatus' });
                available = response && response.status === 'available';
            }

            aiStatusEl.textContent = available
                ? translations.aiStatusAvailable
                : translations.aiStatusUnavailable;
            aiStatusEl.classList.toggle('available', available);
            aiStatusEl.classList.toggle('unavailable', !available);
        } catch (error) {
            console.error('Failed to refresh AI status:', error);
            aiStatusEl.textContent = translations.aiStatusUnavailable;
            aiStatusEl.classList.add('unavailable');
            aiStatusEl.classList.remove('available');
        }
    }

    async function fetchVideoContext(tabId) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: 'getVideoContext' });
            if (response && response.success) {
                return {
                    title: response.title || '',
                    channel: response.channel || '',
                    description: response.description || ''
                };
            }
        } catch (error) {
            console.error('Failed to fetch video context from tab:', error);
        }
        return { title: '', channel: '', description: '' };
    }

    function showGeneratedComment(tabId, comment, source) {
        const sourceLabel =
            source === 'ondevice'
                ? translations.sourceOnDevice
                : translations.sourceLocal;

        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div class="comment-text">${escapeHtml(comment)}</div>
            <div class="ai-status ${source === 'ondevice' ? 'available' : ''}" style="margin-bottom: 12px;">
                ${escapeHtml(sourceLabel)}
            </div>
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
            handleCommentAction(tabId, comment, false);
        });
        document.getElementById('previewComment').addEventListener('click', () => {
            handleCommentAction(tabId, comment, true);
        });
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
