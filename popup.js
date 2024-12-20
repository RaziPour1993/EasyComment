document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('.star');
    const generateButton = document.getElementById('generateComment');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.querySelector('.loading');
    let rating = 0;

    // Add hover effect to stars
    stars.forEach((star, index) => {
        star.addEventListener('mouseover', () => {
            stars.forEach((s, i) => {
                if (i <= index) {
                    s.style.transform = 'scale(1.2)';
                    s.style.color = '#FFC107';
                }
            });
        });

        star.addEventListener('mouseout', () => {
            stars.forEach((s, i) => {
                if (!s.classList.contains('selected')) {
                    s.style.transform = 'scale(1)';
                    s.style.color = '#ddd';
                }
            });
        });
    });

    // Update rating value when star is clicked
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            rating = index + 1;
            stars.forEach((s, i) => {
                s.classList.toggle('selected', i <= index);
                if (i <= index) {
                    s.style.transform = 'scale(1.2)';
                    s.style.color = '#FFC107';
                } else {
                    s.style.transform = 'scale(1)';
                    s.style.color = '#ddd';
                }
            });
        });
    });

    // Handle generate comment button click
    generateButton.addEventListener('click', () => {
        if (rating === 0) {
            showMessage('لطفاً یک امتیاز انتخاب کنید.', 'error');
            return;
        }

        // Show loading and disable button
        loadingDiv.style.display = 'block';
        generateButton.disabled = true;
        resultDiv.style.display = 'none';

        try {
            // Get current tab to ensure we're on YouTube
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
                if (!tab.url.includes('youtube.com/watch')) {
                    showMessage('لطفاً به یک صفحه ویدیوی یوتیوب بروید.', 'error');
                    loadingDiv.style.display = 'none';
                    generateButton.disabled = false;
                    return;
                }

                // Generate comment based on rating
                setTimeout(() => { // Added timeout to show loading animation
                    const comment = generateComment(rating);
                    loadingDiv.style.display = 'none';
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = `
                        <div style="font-size: 16px; line-height: 1.6;">${comment}</div>
                        <button id="confirmComment">
                            <span>ارسال کامنت</span>
                        </button>
                    `;

                    // Add event listener for confirm button
                    document.getElementById('confirmComment').addEventListener('click', () => {
                        chrome.tabs.sendMessage(tab.id, { 
                            action: "postComment",
                            comment: comment
                        }, (postResponse) => {
                            if (postResponse && postResponse.success) {
                                showMessage('کامنت با موفقیت در فیلد نظرات قرار گرفت.', 'success');
                            }
                        });
                    });

                    generateButton.disabled = false;
                }, 1000);
            });
        } catch (error) {
            loadingDiv.style.display = 'none';
            generateButton.disabled = false;
            showMessage('خطایی رخ داد. لطفاً دوباره تلاش کنید.', 'error');
        }
    });

    function showMessage(message, type) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `<div class="${type}-message">${message}</div>`;
    }

    function generateComment(rating) {
        const comments = {
            1: "متأسفانه محتوای ویدیو انتظارات را برآورده نکرد 😕",
            2: "ویدیو نیاز به بهبود در کیفیت و محتوا دارد 🤔",
            3: "ویدیوی نسبتاً خوبی بود، ممنون از اشتراک‌گذاری 👍",
            4: "محتوای بسیار مفید و کاربردی! ادامه بدید 👏",
            5: "فوق‌العاده عالی بود! یکی از بهترین ویدیوهایی که در این زمینه دیدم ⭐️🌟"
        };
        return comments[rating];
    }
});