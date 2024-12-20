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
            showMessage(translations.selectRating, 'error');
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
                    showMessage(translations.goToYoutube, 'error');
                    loadingDiv.style.display = 'none';
                    generateButton.disabled = false;
                    return;
                }

                // Generate comment based on rating
                setTimeout(() => {
                    const commentsArray = translations.comments[rating];
                    const randomIndex = Math.floor(Math.random() * commentsArray.length);
                    const comment = commentsArray[randomIndex];
                    loadingDiv.style.display = 'none';
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = `
                        <div style="font-size: 16px; line-height: 1.6;">${comment}</div>
                        <div style="display: flex; gap: 10px;">
                            <button id="confirmComment" style="flex: 1;">
                                <span>${translations.confirmButton}</span>
                            </button>
                            <button id="previewComment" style="flex: 1; background: linear-gradient(145deg, #9C27B0, #7B1FA2);">
                                <span>${translations.previewButton}</span>
                            </button>
                        </div>
                    `;

                    // Add event listeners for both buttons
                    document.getElementById('confirmComment').addEventListener('click', () => {
                        showLoading();
                        chrome.tabs.sendMessage(tab.id, { 
                            action: "postComment",
                            comment: comment,
                            preview: false
                        }, (postResponse) => {
                            hideLoading();
                            if (postResponse && postResponse.success) {
                                showMessage(translations.confirmSuccess || 'Comment posted successfully!', 'success');
                            }
                        });
                    });

                    document.getElementById('previewComment').addEventListener('click', () => {
                        showLoading();
                        chrome.tabs.sendMessage(tab.id, { 
                            action: "postComment",
                            comment: comment,
                            preview: true
                        }, (postResponse) => {
                            hideLoading();
                            if (postResponse && postResponse.success) {
                                showMessage(translations.previewSuccess || 'Preview successful!', 'success');
                            }
                        });
                    });

                    generateButton.disabled = false;
                }, 1000);
            });
        } catch (error) {
            loadingDiv.style.display = 'none';
            generateButton.disabled = false;
            showMessage(translations.error, 'error');
        }
    });

    function showMessage(message, type) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `<div class="${type}-message">${message}</div>`;
    }

    function showLoading() {
        loadingDiv.style.display = 'block';
        resultDiv.style.display = 'none';
    }

    function hideLoading() {
        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';
    }
});