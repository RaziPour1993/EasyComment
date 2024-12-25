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
    generateButton.addEventListener('click', async () => {
        if (rating === 0) {
            showMessage(translations.selectRating, 'error');
            return;
        }

        // Show loading and disable button
        showLoading('Generating your comment...');
        generateButton.disabled = true;

        try {
            // Get current tab to ensure we're on YouTube
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.url.includes('youtube.com/watch')) {
                showMessage(translations.goToYoutube, 'error');
                hideLoading();
                generateButton.disabled = false;
                return;
            }

            // Generate comment based on rating
            setTimeout(() => {
                const commentsArray = translations.comments[rating];
                const randomIndex = Math.floor(Math.random() * commentsArray.length);
                const comment = commentsArray[randomIndex];
                hideLoading();
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div style="font-size: 16px; line-height: 1.2; margin-bottom: 20px;">${comment}</div>
                    <div style="display: flex; gap: 10px;">
                        <button id="confirmComment" style="flex: 1; background: var(--confirm-button-color);">
                            <span>${translations.confirmButton}</span>
                        </button>
                        <button id="previewComment" style="flex: 1; background: var(--preview-button-color);">
                            <span>${translations.previewButton}</span>
                        </button>
                    </div>
                `;

                // Add event listeners for both buttons
                document.getElementById('confirmComment').addEventListener('click', () => handleCommentAction(tab.id, comment, false));
                document.getElementById('previewComment').addEventListener('click', () => handleCommentAction(tab.id, comment, true));

                generateButton.disabled = false;
            }, 1000);
        } catch (error) {
            hideLoading();
            generateButton.disabled = false;
            showMessage(translations.error, 'error');
        }
    });

    function showMessage(message, type) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `<div class="${type}-message">${message}</div>`;
    }

    function showLoading(message) {
        loadingDiv.style.display = 'block';
        loadingDiv.querySelector('.loading-text').textContent = message;
        resultDiv.style.display = 'none';
    }

    function hideLoading() {
        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';
    }

    async function handleCommentAction(tabId, comment, preview) {
        try {
            showLoading(preview ? 'Previewing your comment...' : 'Posting your comment...');
            const postResponse = await chrome.tabs.sendMessage(tabId, { 
                action: "postComment",
                comment: comment,
                preview: preview
            });
            hideLoading();
            if (postResponse && postResponse.success) {
                showMessage(preview ? translations.previewSuccess || 'Preview successful!' : translations.confirmSuccess || 'Comment posted successfully!', 'success');
            }
        } catch (error) {
            hideLoading();
            showMessage(translations.error, 'error');
        }
    }
});