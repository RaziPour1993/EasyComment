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

// Add button next to the "Subscribe" button
function addEasyCommentButton() {
    const subscribeButtonContainer = document.querySelector('#subscribe-button');

    // Create button if it doesn't exist
    if (!document.querySelector('#easyCommentButton')) {
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
                showEasyCommentButtonError(
                    button,
                    'AI comment failed. Please try again.'
                );
            } finally {
                if (!failed) {
                    setEasyCommentButtonIcon(button);
                }
                button.disabled = false;
            }
        });

        if (subscribeButtonContainer) {
            subscribeButtonContainer.insertAdjacentElement('afterend', button);
        }
    }
}

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

// Initial button addition
addEasyCommentButton();

// Listen for messages from popup / background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

// Watch for page navigation
const observer = new MutationObserver(() => {
    addEasyCommentButton();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
