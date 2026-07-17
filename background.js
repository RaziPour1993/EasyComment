importScripts('translations.js', 'ai.js');

const STORAGE_KEYS = {
    generationMode: 'generationMode',
    openaiApiKey: 'openaiApiKey',
    geminiApiKey: 'geminiApiKey'
};

async function getStoredSettings() {
    try {
        const data = await chrome.storage.sync.get([
            STORAGE_KEYS.generationMode,
            STORAGE_KEYS.openaiApiKey,
            STORAGE_KEYS.geminiApiKey
        ]);
        return {
            generationMode: data.generationMode || AI_MODES.TEMPLATE,
            openaiApiKey: data.openaiApiKey || '',
            geminiApiKey: data.geminiApiKey || ''
        };
    } catch (error) {
        console.error('Failed to read settings:', error);
        return {
            generationMode: AI_MODES.TEMPLATE,
            openaiApiKey: '',
            geminiApiKey: ''
        };
    }
}

async function getActiveYouTubeTab() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        if (!tab || !tab.id || !tab.url || !tab.url.includes('youtube.com/watch')) {
            return null;
        }
        return tab;
    } catch (error) {
        console.error('Failed to query active tab:', error);
        return null;
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
        return { title: '', channel: '', description: '' };
    } catch (error) {
        console.error('Failed to get video context:', error);
        return { title: '', channel: '', description: '' };
    }
}

function mapErrorToMessage(code) {
    const messages = translations.aiErrors || {};
    return messages[code] || translations.error || 'An error occurred. Please try again.';
}

async function resolveYouTubeTab(sender) {
    if (sender && sender.tab && sender.tab.id && sender.tab.url && sender.tab.url.includes('youtube.com/watch')) {
        return sender.tab;
    }
    return getActiveYouTubeTab();
}

async function handleGenerateComment(request, sender) {
    const settings = await getStoredSettings();
    const mode = request.mode || settings.generationMode || AI_MODES.TEMPLATE;
    const rating = request.rating;

    if (!rating || rating < 1 || rating > 5) {
        return { success: false, error: mapErrorToMessage('INVALID_RATING') };
    }

    const tab = await resolveYouTubeTab(sender);
    if (!tab) {
        return { success: false, error: translations.goToYoutube };
    }

    let videoContext = { title: '', channel: '', description: '' };
    if (mode !== AI_MODES.TEMPLATE) {
        videoContext = await fetchVideoContext(tab.id);
    }

    try {
        const comment = await generateComment(mode, rating, videoContext, {
            openaiApiKey: settings.openaiApiKey,
            geminiApiKey: settings.geminiApiKey
        });
        return { success: true, comment, mode };
    } catch (error) {
        const code = error && error.message ? error.message : 'UNKNOWN';
        console.error('generateComment failed:', code);
        return { success: false, error: mapErrorToMessage(code), errorCode: code };
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateComment') {
        handleGenerateComment(request, sender)
            .then(sendResponse)
            .catch((error) => {
                console.error('Unhandled generateComment error:', error);
                sendResponse({ success: false, error: translations.error });
            });
        return true;
    }

    if (request.action === 'getGeminiStatus') {
        getStoredSettings()
            .then(async (settings) => {
                const status = await getGeminiStatus(settings.geminiApiKey);
                sendResponse({ success: true, status });
            })
            .catch((error) => {
                console.error('getGeminiStatus failed:', error);
                sendResponse({ success: false, status: 'needs_setup' });
            });
        return true;
    }

    if (request.action === 'getSettings') {
        getStoredSettings()
            .then((settings) => sendResponse({ success: true, settings }))
            .catch((error) => {
                console.error('getSettings failed:', error);
                sendResponse({ success: false, error: translations.error });
            });
        return true;
    }

    return false;
});
