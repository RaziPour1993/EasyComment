chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target !== 'offscreen') {
        return false;
    }

    if (request.action === 'generateOnDevice') {
        generateOnDeviceComment(
            request.rating,
            request.videoContext || {},
            request.commentPrefs
        )
            .then((comment) => {
                sendResponse({ success: true, comment, source: 'ondevice' });
            })
            .catch((error) => {
                const code = error && error.message ? error.message : 'UNKNOWN';
                console.error('Offscreen on-device generation failed:', code);
                sendResponse({
                    success: false,
                    errorCode: code,
                    error: (translations.aiErrors && translations.aiErrors[code]) || translations.error
                });
            });
        return true;
    }

    if (request.action === 'getBuiltInAiStatus') {
        getBuiltInAiStatus()
            .then((status) => sendResponse({ success: true, status }))
            .catch((error) => {
                console.error('Offscreen AI status failed:', error);
                sendResponse({ success: false, status: 'unavailable' });
            });
        return true;
    }

    return false;
});
