/**
 * Comment generation: local templates or Chrome on-device AI (Gemini Nano).
 * Loaded via importScripts in the service worker; attaches to global scope.
 * Session stays English-safe for Chrome APIs; output language is chosen in the prompt
 * from the video title so unsupported locale codes never break LanguageModel.create().
 */

const AI_MODES = {
    TEMPLATE: 'template',
    ONDEVICE: 'ondevice'
};

const RATING_LABELS = {
    1: 'very negative / disappointing',
    2: 'mostly negative / below expectations',
    3: 'mixed / average',
    4: 'positive / good',
    5: 'very positive / excellent'
};

/**
 * Detect comment language from the video title script/characters.
 * Returns a human language name for the prompt (not passed into LanguageModel options).
 * Persian vs Arabic uses scoring — many Persian titles lack پ/چ/ژ/گ and were mislabeled Arabic.
 */
function detectCommentLanguageFromTitle(title) {
    const text = (title || '').trim();
    if (!text) {
        return 'English';
    }

    if (/[\u0400-\u04FF]/.test(text)) {
        return 'Russian';
    }
    if (/[\u4E00-\u9FFF]/.test(text)) {
        return 'Chinese';
    }
    if (/[\u3040-\u30FF]/.test(text)) {
        return 'Japanese';
    }
    if (/[\uAC00-\uD7AF]/.test(text)) {
        return 'Korean';
    }
    if (/[\u0E00-\u0E7F]/.test(text)) {
        return 'Thai';
    }
    if (/[\u0900-\u097F]/.test(text)) {
        return 'Hindi';
    }

    // Arabic / Persian shared script range
    if (/[\u0600-\u06FF]/.test(text)) {
        return detectPersianOrArabic(text);
    }

    if (/[ğüşöçıİĞÜŞÖÇ]/.test(text)) {
        return 'Turkish';
    }
    if (/[äöüßÄÖÜ]/.test(text) && !/[áéíóúñ¿¡]/.test(text)) {
        return 'German';
    }
    if (/[áéíóúñ¿¡ÁÉÍÓÚÑ]/.test(text)) {
        return 'Spanish';
    }
    if (/[àâçéèêëîïôùûüÿœæÀÂÇÉÈÊËÎÏÔÙÛÜŸŒÆ]/.test(text)) {
        return 'French';
    }
    if (/[ãõáàâéêíóôúçÃÕÁÀÂÉÊÍÓÔÚÇ]/.test(text)) {
        return 'Portuguese';
    }

    return 'English';
}

function detectPersianOrArabic(text) {
    let persianScore = 0;
    let arabicScore = 0;

    // Distinct Persian letters: پ چ ژ گ + Persian ک/ی
    const persianLetters = text.match(/[\u067E\u0686\u0698\u06AF\u06A9\u06CC]/g);
    if (persianLetters) {
        persianScore += persianLetters.length * 3;
    }

    // Arabic-specific letters more common in Arabic than Persian
    const arabicLetters = text.match(/[\u0629\u0649\u0643\u064A\u0625\u0623\u0622]/g);
    if (arabicLetters) {
        arabicScore += arabicLetters.length * 3;
    }

    // Arabic definite article "ال" attached to words
    const alMatches = text.match(/(?:^|[\s\u200c])ال[\u0600-\u06FF]{2,}/g);
    if (alMatches) {
        arabicScore += alMatches.length * 2;
    }

    // Common Persian function words / YouTube words
    const persianWords = [
        'که', 'را', 'این', 'برای', 'با', 'از', 'به', 'در', 'است', 'های',
        'می', 'ها', 'یک', 'تا', 'هم', 'شود', 'کنید', 'آموزش', 'ویدیو', 'ویدئو',
        'فیلم', 'جدید', 'کامل', 'بررسی', 'چطور', 'چگونه', 'بهترین', 'ترین',
        'فارسی', 'ایران', 'دانلود', 'قسمت', 'فصل', 'سری', 'بازی', 'نصب',
        'ساخت', 'روش', 'معرفی', 'مقایسه', 'نکات', 'آموزشی'
    ];
    for (const word of persianWords) {
        if (text.includes(word)) {
            persianScore += 2;
        }
    }

    // Common Arabic function words
    const arabicWords = [
        'على', 'إلى', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'ماذا', 'كيف',
        'شرح', 'تعلم', 'فيديو', 'جديد', 'أفضل', 'طريقة', 'تحميل'
    ];
    for (const word of arabicWords) {
        if (text.includes(word)) {
            arabicScore += 2;
        }
    }

    // Zero-width non-joiner is very common in Persian typing
    if (text.includes('\u200c')) {
        persianScore += 4;
    }

    if (arabicScore > persianScore) {
        return 'Arabic';
    }

    // Default Arabic-script titles to Persian when tied/unclear (shared alphabet).
    return 'Persian';
}

function buildCommentPrompt(rating, videoContext) {
    const context = videoContext || {};
    const title = (context.title || '').trim();
    const description = (context.description || '').trim();
    const languageName = detectCommentLanguageFromTitle(title);

    if (!title) {
        return [
            'Write a short, natural YouTube comment in English only.',
            `The viewer rated this video ${rating}/5 stars (${RATING_LABELS[rating] || 'unknown'}).`,
            'Match the tone to the rating. Sound like a real person.',
            'Do NOT mention any person\'s name or channel name.',
            'Keep it a general comment about the video content.',
            'Do not use hashtag spam. Do not wrap the comment in quotes.',
            'Return ONLY the comment text.'
        ].join('\n');
    }

    return [
        'Write a short, natural YouTube comment.',
        `CRITICAL LANGUAGE: Write the ENTIRE comment in ${languageName}.`,
        languageName === 'Persian'
            ? 'Use Persian (Farsi) script and wording — NOT Arabic.'
            : `The video title language appears to be ${languageName}. Match that language exactly.`,
        'Do not translate into English unless the title language is English.',
        languageName === 'Persian'
            ? 'Do NOT write in Arabic. The comment must be Persian/Farsi.'
            : '',
        `The viewer rated this video ${rating}/5 stars (${RATING_LABELS[rating] || 'unknown'}).`,
        'CRITICAL TOPIC: Comment on the general topic of this video, based on its title.',
        `Video title: "${title}"`,
        description ? `Description snippet: ${description}` : '',
        'Talk about the subject/topic in a general way.',
        'Do NOT mention any person\'s name, creator name, channel name, celebrity name, or proper names of people.',
        'Do NOT address anyone by name (no "@", no greetings with names).',
        'Even if the title contains a person\'s name, do not repeat it — paraphrase the topic instead.',
        'Keep it a general viewer comment about the content only.',
        'Match the tone to the star rating. Sound like a real person, not marketing copy.',
        '1 or 2 short sentences max.',
        'Do not use hashtag spam. Do not wrap the comment in quotes.',
        'Return ONLY the comment text — no preamble, no explanation.'
    ].filter(Boolean).join('\n');
}

function cleanAiComment(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    let cleaned = text.trim();
    if (
        (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
        cleaned = cleaned.slice(1, -1).trim();
    }
    return cleaned;
}

function generateTemplateComment(rating) {
    const commentsArray = translations.comments[rating];
    if (!commentsArray || commentsArray.length === 0) {
        throw new Error('No template comments available for this rating.');
    }
    const randomIndex = Math.floor(Math.random() * commentsArray.length);
    return commentsArray[randomIndex];
}

async function getBuiltInAiStatus() {
    try {
        if (typeof LanguageModel === 'undefined') {
            return 'unavailable';
        }
        const availability = await LanguageModel.availability({
            expectedInputs: [{ type: 'text', languages: ['en'] }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }]
        });
        if (
            availability === 'available' ||
            availability === 'readily' ||
            availability === 'after-download' ||
            availability === 'downloadable' ||
            availability === 'downloading'
        ) {
            return 'available';
        }
        return 'unavailable';
    } catch (error) {
        // Older Chrome builds may not accept the options object.
        try {
            const availability = await LanguageModel.availability();
            if (
                availability === 'available' ||
                availability === 'readily' ||
                availability === 'after-download' ||
                availability === 'downloadable' ||
                availability === 'downloading'
            ) {
                return 'available';
            }
            return 'unavailable';
        } catch (fallbackError) {
            console.error('Built-in AI status check failed:', fallbackError);
            return 'unavailable';
        }
    }
}

async function createLanguageModelSession() {
    const monitor = (m) => {
        m.addEventListener('downloadprogress', (e) => {
            console.log(`Built-in model download: ${Math.round((e.loaded || 0) * 100)}%`);
        });
    };

    try {
        return await LanguageModel.create({
            monitor,
            expectedInputs: [{ type: 'text', languages: ['en'] }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }]
        });
    } catch (error) {
        console.error('LanguageModel.create with en options failed, retrying plain create:', error);
        return LanguageModel.create({ monitor });
    }
}

async function generateOnDeviceComment(rating, videoContext) {
    const safeRating = Math.min(5, Math.max(1, Number(rating) || 1));

    try {
        if (typeof LanguageModel === 'undefined') {
            throw new Error('BUILTIN_UNAVAILABLE');
        }

        let availability;
        try {
            availability = await LanguageModel.availability({
                expectedInputs: [{ type: 'text', languages: ['en'] }],
                expectedOutputs: [{ type: 'text', languages: ['en'] }]
            });
        } catch (error) {
            availability = await LanguageModel.availability();
        }

        if (availability === 'unavailable') {
            throw new Error('BUILTIN_UNAVAILABLE');
        }

        const session = await createLanguageModelSession();

        try {
            const prompt = buildCommentPrompt(safeRating, videoContext);
            const title = (videoContext && videoContext.title) || '';
            console.log(
                'Gemini Nano prompt language:',
                detectCommentLanguageFromTitle(title),
                '| title:',
                title.slice(0, 80) || '(missing)'
            );
            const result = await session.prompt(prompt);
            const comment = cleanAiComment(result);
            if (!comment) {
                throw new Error('EMPTY_AI_RESPONSE');
            }
            return comment;
        } finally {
            if (session && typeof session.destroy === 'function') {
                session.destroy();
            }
        }
    } catch (error) {
        if (
            error.message === 'EMPTY_AI_RESPONSE' ||
            error.message === 'BUILTIN_UNAVAILABLE'
        ) {
            throw error;
        }
        console.error('Built-in AI generation failed:', error);
        throw new Error('BUILTIN_FAILED');
    }
}

/**
 * @param {'template'|'ondevice'} mode
 * @param {number} rating
 * @param {{ title?: string, channel?: string, description?: string }} videoContext
 */
async function generateComment(mode, rating, videoContext) {
    const safeRating = Math.min(5, Math.max(1, Number(rating) || 1));
    const normalizedMode = String(mode || '').trim().toLowerCase();

    if (normalizedMode === AI_MODES.ONDEVICE) {
        const comment = await generateOnDeviceComment(safeRating, videoContext);
        return { comment, source: AI_MODES.ONDEVICE };
    }

    if (normalizedMode === AI_MODES.TEMPLATE || normalizedMode === 'local') {
        const comment = generateTemplateComment(safeRating);
        return { comment, source: AI_MODES.TEMPLATE };
    }

    throw new Error('UNKNOWN_MODE');
}
