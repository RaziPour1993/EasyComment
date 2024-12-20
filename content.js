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
            // اسکرول به بخش کامنت‌ها
            const commentsSection = document.querySelector('#comments');
            if (!commentsSection) {
                throw new Error('Comments section not found');
            }
            commentsSection.scrollIntoView({ behavior: 'smooth' });
            
            // صبر برای لود شدن کامل بخش کامنت‌ها
            await new Promise(resolve => setTimeout(resolve, 2000));

            // کلیک روی باکس کامنت
            const commentBox = document.querySelector('#simplebox-placeholder');
            if (!commentBox) {
                throw new Error('Comment box not found');
            }
            commentBox.click();

            // صبر برای باز شدن باکس کامنت
            await new Promise(resolve => setTimeout(resolve, 1500));

            // پیدا کردن و پر کردن فیلد کامنت
            const commentInput = document.querySelector('#contenteditable-root');
            if (!commentInput) {
                throw new Error('Comment input field not found');
            }

            // وارد کردن متن کامنت
            commentInput.focus();
            commentInput.textContent = comment;
            
            // شبیه‌سازی تایپ کردن
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                composed: true
            });
            commentInput.dispatchEvent(inputEvent);

            // صبر برای فعال شدن دکمه ثبت
            await new Promise(resolve => setTimeout(resolve, 1000));

            // کلیک روی دکمه ثبت
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
