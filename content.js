// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "postComment") {
        postCommentToYoutube(request.comment);
        sendResponse({ success: true });
    }
    return true;
});

// Post comment to YouTube
function postCommentToYoutube(comment) {
    // Scroll to comments section to ensure it's loaded
    const commentsSection = document.querySelector('#comments');
    if (commentsSection) {
        commentsSection.scrollIntoView();
    }

    // Wait for comment box to be available
    setTimeout(() => {
        // Click on comment box placeholder
        const commentBox = document.querySelector('#simplebox-placeholder');
        if (commentBox) {
            commentBox.click();
            
            // Wait for the actual input field to be ready
            setTimeout(() => {
                const commentInput = document.querySelector('#contenteditable-root');
                if (commentInput) {
                    // Set comment text
                    commentInput.textContent = comment;
                    commentInput.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    // Enable submit button
                    const submitButton = document.querySelector('#submit-button');
                    if (submitButton) {
                        submitButton.removeAttribute('disabled');
                        // Note: We don't auto-click submit button to let user review
                    } else {
                        console.error('Submit button not found');
                    }
                } else {
                    console.error('Comment input field not found');
                }
            }, 500);
        } else {
            console.error('Comment box not found. Make sure you are logged in to YouTube');
        }
    }, 1000);
}
