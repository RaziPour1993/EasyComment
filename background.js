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

async function hasOffscreenDocument() {
    try {
        if (chrome.runtime.getContexts) {
            const contexts = await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT']
            });
            return contexts.length > 0;
        }
        if (chrome.offscreen && chrome.offscreen.hasDocument) {
            return chrome.offscreen.hasDocument();
        }
    } catch (error) {
        console.error('Failed to check offscreen document:', error);
    }
    return false;
}

async function ensureOffscreenDocument() {
    if (await hasOffscreenDocument()) {
        return;
    }

    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_SCRAPING'],
        justification: 'Run Gemini Nano Prompt API to generate YouTube comments'
    });
}

async function generateOnDeviceViaOffscreen(rating, videoContext) {
    await ensureOffscreenDocument();
    const response = await chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'generateOnDevice',
        rating,
        videoContext
    });
    return response;
}

async function handleGenerateComment(request, sender) {
    const rating = request.rating;
    const storedMode = await getStoredMode();
    // In-page button can force AI with request.mode === 'ondevice'
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

        try {
            // Prefer offscreen page — LanguageModel is more reliable there than in the SW.
            const offscreenResult = await generateOnDeviceViaOffscreen(rating, videoContext);
            if (offscreenResult && offscreenResult.success && offscreenResult.comment) {
                return {
                    success: true,
                    comment: offscreenResult.comment,
                    mode: AI_MODES.ONDEVICE,
                    source: AI_MODES.ONDEVICE
                };
            }

            const code = (offscreenResult && offscreenResult.errorCode) || 'BUILTIN_FAILED';
            return {
                success: false,
                error: (offscreenResult && offscreenResult.error) || mapErrorToMessage(code),
                errorCode: code,
                mode
            };
        } catch (error) {
            console.error('Offscreen on-device path failed, trying service worker:', error);
            try {
                const result = await generateComment(mode, rating, videoContext);
                return {
                    success: true,
                    comment: result.comment,
                    mode: result.source,
                    source: result.source
                };
            } catch (fallbackError) {
                const code = fallbackError && fallbackError.message ? fallbackError.message : 'UNKNOWN';
                console.error('generateComment failed:', code, 'mode=', mode);
                return { success: false, error: mapErrorToMessage(code), errorCode: code, mode };
            }
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
    // Ignore messages meant for the offscreen document
    if (request.target === 'offscreen') {
        return false;
    }

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
        ensureOffscreenDocument()
            .then(() =>
                chrome.runtime.sendMessage({
                    target: 'offscreen',
                    action: 'getBuiltInAiStatus'
                })
            )
            .then((response) => {
                sendResponse(response || { success: false, status: 'unavailable' });
            })
            .catch(async (error) => {
                console.error('Offscreen status failed, checking in SW:', error);
                try {
                    const status = await getBuiltInAiStatus();
                    sendResponse({ success: true, status });
                } catch (fallbackError) {
                    console.error('getBuiltInAiStatus failed:', fallbackError);
                    sendResponse({ success: false, status: 'unavailable' });
                }
            });
        return true;
    }

    return false;
});

function isYouTubeWatchUrl(url) {
    try {
        const parsed = new URL(url);
        return (
            (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') &&
            parsed.pathname === '/watch'
        );
    } catch (error) {
        return false;
    }
}

async function pingContentScriptToMountButton(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { action: 'ensureEasyCommentButton' });
    } catch (error) {
        // Content script may not be ready yet; retry a few times
        console.error('Ping ensureEasyCommentButton failed, retrying:', error);
        for (let i = 0; i < 8; i += 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            try {
                await chrome.tabs.sendMessage(tabId, { action: 'ensureEasyCommentButton' });
                return;
            } catch (retryError) {
                // keep trying
            }
        }
    }
}

function handlePossibleWatchNavigation(details) {
    if (!details || details.frameId !== 0 || !details.url || !isYouTubeWatchUrl(details.url)) {
        return;
    }
    pingContentScriptToMountButton(details.tabId);
}

if (chrome.webNavigation) {
    chrome.webNavigation.onCompleted.addListener(handlePossibleWatchNavigation, {
        url: [{ hostEquals: 'www.youtube.com', pathEquals: '/watch' }]
    });
    chrome.webNavigation.onHistoryStateUpdated.addListener(handlePossibleWatchNavigation, {
        url: [{ hostEquals: 'www.youtube.com', pathPrefix: '/watch' }]
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && isYouTubeWatchUrl(tab.url)) {
        pingContentScriptToMountButton(tabId);
    }
});
