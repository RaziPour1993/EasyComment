importScripts('translations.js', 'ai.js');

async function getStoredMode() {
    try {
        const data = await chrome.storage.sync.get(['generationMode']);
        return data.generationMode === AI_MODES.ONDEVICE
            ? AI_MODES.ONDEVICE
            : AI_MODES.TEMPLATE;
    } catch (error) {
        console.error('Failed to read generation mode:', error);
        return AI_MODES.TEMPLATE;
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
    if (
        sender &&
        sender.tab &&
        sender.tab.id &&
        sender.tab.url &&
        sender.tab.url.includes('youtube.com/watch')
    ) {
        return sender.tab;
    }
    return getActiveYouTubeTab();
}

async function handleGenerateComment(request, sender) {
    const rating = request.rating;
    const storedMode = await getStoredMode();
    const mode = request.mode || storedMode;

    if (!rating || rating < 1 || rating > 5) {
        return { success: false, error: mapErrorToMessage('INVALID_RATING') };
    }

    const tab = await resolveYouTubeTab(sender);
    if (!tab) {
        return { success: false, error: translations.goToYoutube };
    }

    let videoContext = { title: '', channel: '', description: '' };
    if (mode === AI_MODES.ONDEVICE) {
        videoContext = await fetchVideoContext(tab.id);
        if (!videoContext.title && tab.title) {
            videoContext.title = String(tab.title).replace(/ - YouTube$/i, '').trim();
        }
    }

    try {
        const result = await generateComment(mode, rating, videoContext);
        return {
            success: true,
            comment: result.comment,
            mode: result.source,
            source: result.source
        };
    } catch (error) {
        const code = error && error.message ? error.message : 'UNKNOWN';
        console.error('generateComment failed:', code, 'mode=', mode);
        return { success: false, error: mapErrorToMessage(code), errorCode: code, mode };
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

    if (request.action === 'getBuiltInAiStatus') {
        getBuiltInAiStatus()
            .then((status) => sendResponse({ success: true, status }))
            .catch((error) => {
                console.error('getBuiltInAiStatus failed:', error);
                sendResponse({ success: false, status: 'unavailable' });
            });
        return true;
    }

    return false;
});
