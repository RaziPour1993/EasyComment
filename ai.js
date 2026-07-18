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

const COMMENT_LANGUAGES = [
    'auto',
    'Persian',
    'English',
    'Arabic',
    'Turkish',
    'Spanish',
    'French',
    'German',
    'Portuguese',
    'Russian',
    'Chinese',
    'Japanese',
    'Korean',
    'Hindi',
    'Italian'
];

const COMMENT_LENGTHS = ['short', 'medium', 'long'];

const COMMENT_TONES = [
    'casual',
    'friendly',
    'formal',
    'enthusiastic',
    'constructive',
    'humorous',
    'professional'
];

const DEFAULT_COMMENT_PREFS = {
    language: 'auto',
    length: 'short',
    tone: 'casual'
};

const LENGTH_INSTRUCTIONS = {
    short: 'Length: about 5 words total. Keep it very brief — roughly five words, not a full sentence if possible.',
    medium: 'Length: about 10 words total. Aim for roughly ten words; do not go much longer.',
    long: 'Length: about 20 words total. Aim for roughly twenty words; do not write a long paragraph.'
};

const TONE_INSTRUCTIONS = {
    casual: {
        en: 'Tone: conversational and informal — like a real viewer chatting under a video, NOT formal, stiff, or academic. Avoid corporate, marketing, or essay-like language. Everyday spoken style is required.',
        fa: 'Tone: خیلی محاوره‌ای و خودمونی بنویس؛ رسمی، ادبی یا کتابی نباشد. مثل حرف زدن معمولی مردم در کامنت یوتیوب.'
    },
    friendly: {
        en: 'Tone: warm and friendly — supportive and kind, like chatting with a buddy. Stay natural, not overly sweet or fake.',
        fa: 'Tone: گرم و دوستانه بنویس؛ حمایت‌کننده و مهربان، مثل حرف با یک دوست. تصنعی یا بیش از حد شیرین نباشد.'
    },
    formal: {
        en: 'Tone: polite and formal — clear, respectful wording. Avoid slang and overly casual phrases.',
        fa: 'Tone: رسمی و مؤدبانه بنویس؛ واضح و محترمانه. از اصطلاحات خیلی خودمونی پرهیز کن.'
    },
    enthusiastic: {
        en: 'Tone: enthusiastic and energetic — excited about the topic, but still sound like a real person (not spammy hype).',
        fa: 'Tone: پرانرژی و مشتاق بنویس؛ هیجان‌زده نسبت به موضوع، ولی مثل آدم واقعی — نه تبلیغاتی و اغراق‌آمیز.'
    },
    constructive: {
        en: 'Tone: thoughtful and constructive — share a clear opinion or takeaway. Be honest but respectful, not mean.',
        fa: 'Tone: متفکرانه و سازنده بنویس؛ نظر یا نکته‌ای واضح بگو. صادق باش ولی محترم — تند و توهین‌آمیز نباشد.'
    },
    humorous: {
        en: 'Tone: light and humorous — a witty or playful touch is welcome. Keep it light; no mean jokes or sarcasm that insults.',
        fa: 'Tone: شوخ‌طبع و سبک بنویس؛ کمی بامزه یا بازیگوش باشد. سبک نگه دار؛ شوخی تند یا توهین‌آمیز ننویس.'
    },
    professional: {
        en: 'Tone: professional and polished — concise, credible, and composed. No slang, memes, or overly casual filler.',
        fa: 'Tone: حرفه‌ای و مرتب بنویس؛ مختصر، معتبر و سنجیده. بدون اسلنگ، میم یا پرحرفی خودمونی.'
    }
};

/**
 * Normalize stored prefs; unknown values fall back to defaults.
 * @param {unknown} raw
 * @returns {{ language: string, length: string, tone: string }}
 */
function normalizeCommentPrefs(raw) {
    const prefs = raw && typeof raw === 'object' ? raw : {};
    const language = COMMENT_LANGUAGES.includes(prefs.language)
        ? prefs.language
        : DEFAULT_COMMENT_PREFS.language;
    const length = COMMENT_LENGTHS.includes(prefs.length)
        ? prefs.length
        : DEFAULT_COMMENT_PREFS.length;
    const tone = COMMENT_TONES.includes(prefs.tone)
        ? prefs.tone
        : DEFAULT_COMMENT_PREFS.tone;
    return { language, length, tone };
}

/**
 * @param {string} title
 * @param {{ language?: string }} prefs
 * @returns {string}
 */
function resolveCommentLanguage(title, prefs) {
    const normalized = normalizeCommentPrefs(prefs);
    if (normalized.language === 'auto') {
        return detectCommentLanguageFromTitle(title);
    }
    return normalized.language;
}

/**
 * @param {string} languageName
 * @param {string} tone
 * @returns {string}
 */
function getToneInstruction(languageName, tone) {
    const key = COMMENT_TONES.includes(tone) ? tone : DEFAULT_COMMENT_PREFS.tone;
    const entry = TONE_INSTRUCTIONS[key] || TONE_INSTRUCTIONS.casual;
    return languageName === 'Persian' ? entry.fa : entry.en;
}

/**
 * @param {string} length
 * @returns {string}
 */
function getLengthInstruction(length) {
    const key = COMMENT_LENGTHS.includes(length) ? length : DEFAULT_COMMENT_PREFS.length;
    return LENGTH_INSTRUCTIONS[key] || LENGTH_INSTRUCTIONS.short;
}

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

const PROMPT_VARIATION_HINTS = [
    'Start with a different opening than usual.',
    'Use slightly different wording than a typical generic comment.',
    'Focus on a fresh angle — reaction, takeaway, or feeling.',
    'Prefer a different sentence structure this time.',
    'Make it sound like another real viewer, not a copy of a previous comment.',
    'Vary the vocabulary; avoid repeating the same stock phrases.',
    'Keep the meaning, but change how it is phrased completely.'
];

function pickPromptVariationHint() {
    const index = Math.floor(Math.random() * PROMPT_VARIATION_HINTS.length);
    return PROMPT_VARIATION_HINTS[index];
}

/**
 * @returns {Promise<string[]>}
 */
async function loadRecentAiComments() {
    try {
        if (!chrome?.storage?.session) {
            return [];
        }
        const data = await chrome.storage.session.get(['recentAiComments']);
        const list = data.recentAiComments;
        return Array.isArray(list) ? list.filter((item) => typeof item === 'string') : [];
    } catch (error) {
        console.error('Failed to load recent AI comments:', error);
        return [];
    }
}

/**
 * @param {string} comment
 * @returns {Promise<void>}
 */
async function rememberAiComment(comment) {
    try {
        if (!chrome?.storage?.session || !comment) {
            return;
        }
        const recent = await loadRecentAiComments();
        const next = [comment, ...recent.filter((item) => item !== comment)].slice(0, 10);
        await chrome.storage.session.set({ recentAiComments: next });
    } catch (error) {
        console.error('Failed to remember AI comment:', error);
    }
}

function buildCommentPrompt(rating, videoContext, prefs, recentComments) {
    const context = videoContext || {};
    const title = (context.title || '').trim();
    const description = (context.description || '').trim();
    const commentPrefs = normalizeCommentPrefs(prefs);
    const languageName = resolveCommentLanguage(title, commentPrefs);
    const toneLine = getToneInstruction(languageName, commentPrefs.tone);
    const lengthLine = getLengthInstruction(commentPrefs.length);
    const lengthAdjective =
        commentPrefs.length === 'long'
            ? 'roughly 20-word'
            : commentPrefs.length === 'medium'
              ? 'roughly 10-word'
              : 'roughly 5-word';
    const variationHint = pickPromptVariationHint();
    const recent = Array.isArray(recentComments)
        ? recentComments.filter((item) => typeof item === 'string' && item.trim()).slice(0, 5)
        : [];
    const uniquenessLines = [
        'CRITICAL UNIQUENESS: Write a brand-new comment. Do NOT reuse the same wording as before.',
        `Variation hint: ${variationHint}`,
        `Freshness token: ${Date.now().toString(36)}-${Math.floor(Math.random() * 100000)}`,
        recent.length > 0
            ? `Do NOT repeat or closely paraphrase any of these recent comments:\n- ${recent.join('\n- ')}`
            : ''
    ];

    if (!title) {
        const fallbackLanguage =
            commentPrefs.language === 'auto' ? 'English' : languageName;
        return [
            `Write a ${lengthAdjective} YouTube comment in ${fallbackLanguage} only.`,
            `CRITICAL LANGUAGE: Write the ENTIRE comment in ${fallbackLanguage}.`,
            fallbackLanguage === 'Persian'
                ? 'Use Persian (Farsi) script and wording — NOT Arabic.'
                : '',
            fallbackLanguage === 'Persian'
                ? 'Do NOT write in Arabic. The comment must be Persian/Farsi.'
                : '',
            `The viewer rated this video ${rating}/5 stars (${RATING_LABELS[rating] || 'unknown'}).`,
            toneLine,
            lengthLine,
            ...uniquenessLines,
            'Do NOT mention any person\'s name or channel name.',
            'Keep it a general comment about the video content.',
            'Match the emotional tone to the star rating while keeping the chosen style.',
            'Do not use hashtag spam. Do not wrap the comment in quotes.',
            'Return ONLY the comment text.'
        ].filter(Boolean).join('\n');
    }

    const languageSource =
        commentPrefs.language === 'auto'
            ? `The video title language appears to be ${languageName}. Match that language exactly.`
            : `The user selected ${languageName} as the comment language. Write only in that language.`;

    return [
        `Write a ${lengthAdjective} YouTube comment.`,
        `CRITICAL LANGUAGE: Write the ENTIRE comment in ${languageName}.`,
        languageName === 'Persian'
            ? 'Use Persian (Farsi) script and wording — NOT Arabic.'
            : languageSource,
        languageName === 'English'
            ? ''
            : 'Do not translate into English unless the required language is English.',
        languageName === 'Persian'
            ? 'Do NOT write in Arabic. The comment must be Persian/Farsi.'
            : '',
        toneLine,
        `The viewer rated this video ${rating}/5 stars (${RATING_LABELS[rating] || 'unknown'}).`,
        'CRITICAL TOPIC: Comment on the general topic of this video, based on its title.',
        `Video title: "${title}"`,
        description ? `Description snippet: ${description}` : '',
        'Talk about the subject/topic in a general way.',
        'Do NOT mention any person\'s name, creator name, channel name, celebrity name, or proper names of people.',
        'Do NOT address anyone by name (no "@", no greetings with names).',
        'Even if the title contains a person\'s name, do not repeat it — paraphrase the topic instead.',
        'Keep it a general viewer comment about the content only.',
        'Match the emotional tone to the star rating while keeping the chosen style.',
        lengthLine,
        ...uniquenessLines,
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

    let temperature = 1.4;
    let topK = 40;
    try {
        if (typeof LanguageModel.params === 'function') {
            const params = await LanguageModel.params();
            const maxTemperature =
                typeof params.maxTemperature === 'number' ? params.maxTemperature : 2;
            const maxTopK = typeof params.maxTopK === 'number' ? params.maxTopK : 128;
            const defaultTemperature =
                typeof params.defaultTemperature === 'number'
                    ? params.defaultTemperature
                    : 1;
            temperature = Math.min(Math.max(defaultTemperature * 1.4, 1.2), maxTemperature);
            topK = Math.min(Math.max(40, params.defaultTopK || 3), maxTopK);
        }
    } catch (paramsError) {
        console.error('LanguageModel.params failed, using fallback sampling:', paramsError);
    }

    const createOptions = {
        monitor,
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        temperature,
        topK
    };

    try {
        return await LanguageModel.create(createOptions);
    } catch (error) {
        console.error('LanguageModel.create with sampling options failed, retrying plain create:', error);
        try {
            return await LanguageModel.create({
                monitor,
                temperature,
                topK
            });
        } catch (samplingError) {
            console.error('LanguageModel.create with temperature/topK failed:', samplingError);
            return LanguageModel.create({ monitor });
        }
    }
}

async function generateOnDeviceComment(rating, videoContext, prefs) {
    const safeRating = Math.min(5, Math.max(1, Number(rating) || 1));
    const commentPrefs = normalizeCommentPrefs(prefs);

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
        const recentComments = await loadRecentAiComments();

        try {
            const prompt = buildCommentPrompt(
                safeRating,
                videoContext,
                commentPrefs,
                recentComments
            );
            const title = (videoContext && videoContext.title) || '';
            console.log(
                'Gemini Nano prompt language:',
                resolveCommentLanguage(title, commentPrefs),
                '| prefs:',
                commentPrefs.language,
                commentPrefs.length,
                commentPrefs.tone,
                '| title:',
                title.slice(0, 80) || '(missing)'
            );
            const result = await session.prompt(prompt);
            const comment = cleanAiComment(result);
            if (!comment) {
                throw new Error('EMPTY_AI_RESPONSE');
            }
            await rememberAiComment(comment);
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
 * @param {{ language?: string, length?: string, tone?: string }} [prefs]
 */
async function generateComment(mode, rating, videoContext, prefs) {
    const safeRating = Math.min(5, Math.max(1, Number(rating) || 1));
    const normalizedMode = String(mode || '').trim().toLowerCase();

    if (normalizedMode === AI_MODES.ONDEVICE) {
        const comment = await generateOnDeviceComment(safeRating, videoContext, prefs);
        return { comment, source: AI_MODES.ONDEVICE };
    }

    if (normalizedMode === AI_MODES.TEMPLATE || normalizedMode === 'local') {
        const comment = generateTemplateComment(safeRating);
        return { comment, source: AI_MODES.TEMPLATE };
    }

    throw new Error('UNKNOWN_MODE');
}
