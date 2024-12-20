// گوش دادن به پیام‌های ارسالی از popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "postComment") {
        postCommentToYoutube(request.comment);
        sendResponse({ success: true });
    }
    return true;
});

// قرار دادن کامنت در بخش نظرات یوتیوب
function postCommentToYoutube(comment) {
    const commentBox = document.querySelector('#simplebox-placeholder');
    if (commentBox) {
        commentBox.click();
        
        setTimeout(() => {
            const commentInput = document.querySelector('#contenteditable-root');
            if (commentInput) {
                // شبیه‌سازی تایپ کردن کاربر
                commentInput.textContent = comment;
                commentInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                // فعال کردن دکمه ارسال
                const submitButton = document.querySelector('#submit-button');
                if (submitButton) {
                    submitButton.removeAttribute('disabled');
                    // در اینجا کلیک خودکار انجام نمی‌شود تا کاربر خودش تصمیم بگیرد
                }
            }
        }, 500);
    } else {
        console.error('Comment box not found');
    }
}
