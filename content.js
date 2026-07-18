const AI_BUTTON_ICON = `
<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path class="bubble-fill" d="M4.5 5.75c0-.97.78-1.75 1.75-1.75h11.5c.97 0 1.75.78 1.75 1.75v8c0 .97-.78 1.75-1.75 1.75h-4.86L8.2 19.4a.7.7 0 0 1-1.15-.53v-3.37H6.25c-.97 0-1.75-.78-1.75-1.75v-8z"/>
  <path class="spark-main" d="M15.9 7.15l.85 2.35 2.35.85-2.35.85-.85 2.35-.85-2.35-2.35-.85 2.35-.85.85-2.35z"/>
  <path class="spark-small" d="M19.05 11.35l.42 1.15 1.15.42-1.15.42-.42 1.15-.42-1.15-1.15-.42 1.15-.42.42-1.15z"/>
</svg>
`.trim();

function setEasyCommentButtonIcon(button) {
    button.innerHTML = AI_BUTTON_ICON;
    button.classList.remove('error');
    button.title = 'Generate AI comment with Gemini Nano';
}

function showEasyCommentButtonError(button, message) {
    button.classList.add('error');
    button.title = message || 'AI comment failed';
    setTimeout(() => {
        if (button && button.isConnected) {
            button.classList.remove('error');
            button.title = 'Generate AI comment with Gemini Nano';
        }
    }, 3500);
}

function isWatchPage() {
    return location.pathname === '/watch' || /[?&]v=/.test(location.search);
}

/** Only real Subscribe controls — never early empty shells like #actions. */
function findSubscribeAnchor() {
    const candidates = [
        document.querySelector('ytd-watch-metadata #owner #subscribe-button'),
        document.querySelector('#owner #subscribe-button'),
        document.querySelector('ytd-watch-metadata #subscribe-button'),
        document.querySelector('#subscribe-button'),
        document.querySelector('ytd-subscribe-button-renderer')
    ];

    for (const el of candidates) {
        if (!el || !el.isConnected) continue;
        // Ignore tiny/hidden placeholders that YouTube mounts before the real control
        const rect = el.getBoundingClientRect();
        if (rect.width < 8 && rect.height < 8) continue;
        return el;
    }
    return null;
}

function isButtonProperlyMounted(button, subscribe) {
    if (!button || !button.isConnected || !subscribe || !subscribe.isConnected) {
        return false;
    }
    return (
        button.previousElementSibling === subscribe ||
        subscribe.nextElementSibling === button ||
        (subscribe.parentElement && subscribe.parentElement.contains(button))
    );
}

function createEasyCommentButton() {
    const button = document.createElement('button');
    button.id = 'easyCommentButton';
    button.className = 'easy-comment-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Generate AI comment');
    setEasyCommentButtonIcon(button);

    button.addEventListener('click', async () => {
        button.innerHTML = '<span class="spinner"></span>';
        button.disabled = true;
        button.classList.remove('error');
        let failed = false;

        try {
            // Background loads language / length / tone from chrome.storage.sync
            // (same Comment style settings the user set in the extension popup).
            const response = await chrome.runtime.sendMessage({
                action: 'generateComment',
                rating: 5,
                mode: 'ondevice'
            });

            if (!response || !response.success || !response.comment) {
                failed = true;
                const message =
                    (response && response.error) ||
                    'AI comment failed. Check Gemini Nano availability.';
                console.error('Failed to generate AI comment:', message);
                button.innerHTML = AI_BUTTON_ICON;
                showEasyCommentButtonError(button, message);
                return;
            }

            await postCommentToYoutube(response.comment, false);
            console.log('AI comment posted successfully');
            setEasyCommentButtonIcon(button);
            button.title = 'AI comment posted';
        } catch (error) {
            failed = true;
            console.error('Failed to post AI comment from in-page button:', error);
            button.innerHTML = AI_BUTTON_ICON;
            showEasyCommentButtonError(button, 'AI comment failed. Please try again.');
        } finally {
            if (!failed) {
                setEasyCommentButtonIcon(button);
            }
            button.disabled = false;
        }
    });

    return button;
}

/**
 * Mount button immediately after Subscribe.
 * Returns true only when the button is correctly placed next to Subscribe.
 */
function ensureEasyCommentButton() {
    try {
        if (!isWatchPage()) {
            const stray = document.getElementById('easyCommentButton');
            if (stray) stray.remove();
            return false;
        }

        const subscribe = findSubscribeAnchor();
        if (!subscribe) {
            // Remove orphan buttons left in wiped containers
            const orphan = document.getElementById('easyCommentButton');
            if (orphan && !orphan.closest('#owner, ytd-watch-metadata')) {
                orphan.remove();
            }
            return false;
        }

        let button = document.getElementById('easyCommentButton');

        if (!button) {
            button = createEasyCommentButton();
            subscribe.insertAdjacentElement('afterend', button);
            return isButtonProperlyMounted(button, subscribe);
        }

        if (!isButtonProperlyMounted(button, subscribe)) {
            subscribe.insertAdjacentElement('afterend', button);
        }

        return isButtonProperlyMounted(button, subscribe);
    } catch (error) {
        console.error('Failed to ensure Easy Comment button:', error);
        return false;
    }
}

let ensureScheduled = false;
function scheduleEnsureEasyCommentButton() {
    if (ensureScheduled) return;
    ensureScheduled = true;
    requestAnimationFrame(() => {
        ensureScheduled = false;
        ensureEasyCommentButton();
    });
}

function startButtonMountWatchers() {
    ensureEasyCommentButton();

    // Keep trying forever on watch pages — YouTube often remounts Subscribe late
    // and also destroys injected nodes during hydration.
    setInterval(() => {
        if (!isWatchPage()) return;
        if (!ensureEasyCommentButton()) {
            // try again sooner on failure
        }
    }, 800);

    const ytEvents = [
        'yt-navigate-finish',
        'yt-page-data-updated',
        'yt-navigate-start',
        'yt-page-type-changed',
        'yt-player-updated'
    ];
    ytEvents.forEach((eventName) => {
        document.addEventListener(eventName, () => {
            ensureEasyCommentButton();
            let burst = 0;
            const burstId = setInterval(() => {
                burst += 1;
                if (ensureEasyCommentButton() || burst >= 25) {
                    clearInterval(burstId);
                }
            }, 300);
        }, true);
    });

    let lastHref = location.href;
    setInterval(() => {
        if (location.href !== lastHref) {
            lastHref = location.href;
            ensureEasyCommentButton();
        }
    }, 500);

    const root = document.documentElement;
    if (root) {
        const observer = new MutationObserver(() => {
            scheduleEnsureEasyCommentButton();
        });
        observer.observe(root, {
            childList: true,
            subtree: true
        });
    }
}

startButtonMountWatchers();

function getTextContent(selector) {
    const el = document.querySelector(selector);
    return el ? (el.textContent || '').trim() : '';
}

function getMetaContent(selector) {
    const el = document.querySelector(selector);
    if (!el) return '';
    return (el.getAttribute('content') || '').trim();
}

function getVideoContext() {
    try {
        const title =
            getTextContent('h1.ytd-watch-metadata yt-formatted-string') ||
            getTextContent('h1.ytd-watch-metadata') ||
            getTextContent('ytd-watch-metadata h1') ||
            getTextContent('#title h1') ||
            getTextContent('h1.title yt-formatted-string') ||
            getTextContent('h1.title') ||
            getMetaContent('meta[name="title"]') ||
            getMetaContent('meta[property="og:title"]') ||
            document.title.replace(/ - YouTube$/i, '').trim();

        const channel =
            getTextContent('#channel-name a') ||
            getTextContent('#owner #channel-name yt-formatted-string') ||
            getTextContent('#owner #channel-name') ||
            getTextContent('ytd-channel-name a') ||
            getTextContent('ytd-video-owner-renderer #channel-name') ||
            getMetaContent('link[itemprop="name"]') ||
            '';

        let description =
            getTextContent('#description-inline-expander yt-attributed-string') ||
            getTextContent('#description-inline-expander') ||
            getTextContent('#description-inner') ||
            getTextContent('#description') ||
            getMetaContent('meta[name="description"]') ||
            getMetaContent('meta[property="og:description"]') ||
            '';

        if (description.length > 400) {
            description = description.slice(0, 400);
        }

        return {
            success: true,
            title,
            channel,
            description
        };
    } catch (error) {
        console.error('Failed to scrape video context:', error);
        return {
            success: false,
            title: '',
            channel: '',
            description: '',
            error: error.toString()
        };
    }
}

// Listen for messages from popup / background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ensureEasyCommentButton') {
        const ok = ensureEasyCommentButton();
        sendResponse({ success: ok });
        return false;
    }

    if (request.action === 'postComment') {
        postCommentToYoutube(request.comment, request.preview)
            .then(() => {
                console.log('Comment action completed successfully');
                sendResponse({ success: true });
            })
            .catch((error) => {
                console.error('Failed to handle comment:', error);
                sendResponse({ success: false, error: error.toString() });
            });
        return true;
    }

    if (request.action === 'getVideoContext') {
        try {
            sendResponse(getVideoContext());
        } catch (error) {
            console.error('getVideoContext handler failed:', error);
            sendResponse({
                success: false,
                title: '',
                channel: '',
                description: '',
                error: error.toString()
            });
        }
        return false;
    }

    return false;
});

// Post comment to YouTube
async function postCommentToYoutube(comment, preview = false) {
    try {
        const commentsSection = document.querySelector('#comments');
        if (!commentsSection) {
            throw new Error('Comments section not found');
        }
        commentsSection.scrollIntoView({ behavior: 'smooth' });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const commentBox = document.querySelector('#simplebox-placeholder');
        if (!commentBox) {
            throw new Error('Comment box not found');
        }
        commentBox.click();

        await new Promise((resolve) => setTimeout(resolve, 1500));

        const commentInput = document.querySelector('#contenteditable-root');
        if (!commentInput) {
            throw new Error('Comment input field not found');
        }

        commentInput.focus();
        commentInput.textContent = comment;

        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            composed: true
        });
        commentInput.dispatchEvent(inputEvent);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (!preview) {
            const submitButton = document.querySelector('#submit-button');
            if (!submitButton) {
                throw new Error('Submit button not found');
            }
            submitButton.click();
        }

        return true;
    } catch (error) {
        console.error('Error handling comment:', error);
        throw new Error(error.message);
    }
}
