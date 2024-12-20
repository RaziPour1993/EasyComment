// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "postComment") {
        postCommentToYoutube(request.comment)
            .then(() => {
                console.log('Comment posted successfully');
                sendResponse({ success: true });
            })
            .catch(error => {
                console.error('Failed to post comment:', error);
                sendResponse({ success: false, error: error.toString() });
            });
        return true;
    }
});

// Post comment to YouTube
function postCommentToYoutube(comment) {
    return new Promise(async (resolve, reject) => {
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

            // Click on submit button
            const submitButton = document.querySelector('#submit-button');
            if (!submitButton) {
                throw new Error('Submit button not found');
            }

            submitButton.click();
            resolve(true);

        } catch (error) {
            console.error('Error posting comment:', error);
            reject(error.message);
        }
    });
}
