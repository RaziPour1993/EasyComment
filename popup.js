document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('.star');
    const generateButton = document.getElementById('generateComment');
    const resultDiv = document.getElementById('result');
    let rating = 0;

    // Update rating value when star is clicked
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            rating = index + 1;
            stars.forEach((s, i) => {
                s.classList.toggle('selected', i < rating);
            });
        });
    });

    // Handle generate comment button click
    generateButton.addEventListener('click', () => {
        if (rating === 0) {
            resultDiv.style.display = 'block';
            resultDiv.textContent = 'لطفاً یک امتیاز انتخاب کنید.';
            return;
        }

        // Show loading and disable button
        generateButton.disabled = true;
        resultDiv.style.display = 'none';

        try {
            // Get current tab to ensure we're on YouTube
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
                if (!tab.url.includes('youtube.com/watch')) {
                    resultDiv.style.display = 'block';
                    resultDiv.textContent = 'لطفاً به یک صفحه ویدیوی یوتیوب بروید.';
                    generateButton.disabled = false;
                    return;
                }

                // Generate comment based on rating
                const comment = generateComment(rating);
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div>${comment}</div>
                    <button id="confirmComment" style="margin-top: 10px;">ارسال کامنت</button>
                `;

                // Add event listener for confirm button
                document.getElementById('confirmComment').addEventListener('click', () => {
                    chrome.tabs.sendMessage(tab.id, { 
                        action: "postComment",
                        comment: comment
                    }, (postResponse) => {
                        if (postResponse && postResponse.success) {
                            resultDiv.innerHTML = 'کامنت با موفقیت در فیلد نظرات قرار گرفت.';
                        }
                    });
                });

                generateButton.disabled = false;
            });
        } catch (error) {
            // Hide loading and show error
            generateButton.disabled = false;
            resultDiv.style.display = 'block';
            resultDiv.textContent = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
        }
    });

    function generateComment(rating) {
        const comments = {
            1: "نیاز به بهبود زیادی دارد.",
            2: "می‌توانست بهتر باشد.",
            3: "ویدیوی خوبی بود.",
            4: "محتوای مفیدی داشت.",
            5: "ویدیوی بسیار عالی و آموزنده‌ای بود!"
        };
        return comments[rating];
    }
});