// Add button next to the "Subscribe" button
function addEasyCommentButton() {
    const subscribeButtonContainer = document.querySelector('#subscribe-button');

    // Create button if it doesn't exist
    if (!document.querySelector('#easyCommentButton')) {
        const button = document.createElement('button');
        button.id = 'easyCommentButton';
        button.className = 'easy-comment-button';
        button.innerHTML = '<span class="icon">💬</span>';
        
        button.addEventListener('click', async () => {
            // Show loading spinner
            button.innerHTML = '<span class="spinner"></span>';
            button.disabled = true;

            // Generate a random 5-star comment
            const commentsArray = translations.comments[5];
            const randomIndex = Math.floor(Math.random() * commentsArray.length);
            const comment = commentsArray[randomIndex];

            // Post the comment
            try {
                await postCommentToYoutube(comment, false);
                console.log('5-star comment posted successfully');
            } catch (error) {
                console.error('Failed to post 5-star comment:', error);
            } finally {
                // Restore button icon
                button.innerHTML = '<span class="icon">💬</span>';
                button.disabled = false;
            }
        });

        // Insert button next to the "Subscribe" button
        if (subscribeButtonContainer) {
            subscribeButtonContainer.insertAdjacentElement('afterend', button);
        }
    }
}

// Initial button addition
addEasyCommentButton();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "postComment") {
        postCommentToYoutube(request.comment, request.preview)
            .then(() => {
                console.log('Comment action completed successfully');
                sendResponse({ success: true });
            })
            .catch(error => {
                console.error('Failed to handle comment:', error);
                sendResponse({ success: false, error: error.toString() });
            });
        return true;
    }
});

// Post comment to YouTube
async function postCommentToYoutube(comment, preview = false) {
    try {
        // Scroll to comments section
        const commentsSection = document.querySelector('#comments');
        if (!commentsSection) {
            throw new Error('Comments section not found');
        }
        commentsSection.scrollIntoView({ behavior: 'smooth' });
        
        // Wait for comments section to load completely
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Click on comment box
        const commentBox = document.querySelector('#simplebox-placeholder');
        if (!commentBox) {
            throw new Error('Comment box not found');
        }
        commentBox.click();

        // Wait for comment box to open
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Find and fill the comment field
        const commentInput = document.querySelector('#contenteditable-root');
        if (!commentInput) {
            throw new Error('Comment input field not found');
        }

        // Enter comment text
        commentInput.focus();
        commentInput.textContent = comment;
        
        // Simulate typing
        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            composed: true
        });
        commentInput.dispatchEvent(inputEvent);

        // Wait for submit button to be enabled
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Only click submit if not in preview mode
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

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true
});
