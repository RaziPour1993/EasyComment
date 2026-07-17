document.addEventListener('DOMContentLoaded', () => {
    const githubLink = document.getElementById('githubLink');
    const contactLink = document.getElementById('contactLink');
    const closeAbout = document.getElementById('closeAbout');

    function openExternal(url) {
        if (chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url }).catch((error) => {
                console.error('Failed to open tab:', error);
                window.open(url, '_blank', 'noopener,noreferrer');
            });
            return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    if (githubLink) {
        githubLink.addEventListener('click', (event) => {
            event.preventDefault();
            openExternal('https://github.com/RaziPour1993/EasyComment');
        });
    }

    if (contactLink) {
        contactLink.addEventListener('click', (event) => {
            event.preventDefault();
            openExternal('https://razipour.ir/');
        });
    }

    if (closeAbout) {
        closeAbout.addEventListener('click', () => {
            window.close();
        });
    }
});
