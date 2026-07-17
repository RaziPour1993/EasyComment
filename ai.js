/**
 * Comment generation: local templates or Chrome on-device AI (Gemini Nano).
 * Loaded via importScripts in the service worker; attaches to global scope.
 * On-device comments are always English (Gemini Nano language support is limited).
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

function buildCommentPrompt(rating, videoContext) {
    const context = videoContext || {};
    const title = (context.title || '').trim();
    const channel = (context.channel || '').trim();
    const description = (context.description || '').trim();

    if (!title) {
        return [
            'Write a short, natural YouTube comment in English only.',
            `The viewer rated this video ${rating}/5 stars (${RATING_LABELS[rating] || 'unknown'}).`,
            'Match the tone to the rating. Sound like a real person.',
            'Do not use hashtag spam. Do not wrap the comment in quotes.',
            'Return ONLY the comment text.'
        ].join('\n');
    }

    return [
        'Write a short, natural YouTube comment in English only.',
        `The viewer rated this video ${rating}/5 stars (${RATING_LABELS[rating] || 'unknown'}).`,
        'CRITICAL: The comment MUST be specifically about THIS video, based on its title.',
        `Video title: "${title}"`,
        channel ? `Channel: ${channel}` : '',
        description ? `Description snippet: ${description}` : '',
        'Mention or clearly refer to the topic, subject, or content suggested by the title.',
        'Do NOT write a generic comment that could fit any video.',
        'Do NOT ignore the title. Use details from the title (names, topics, products, games, tutorials, etc.).',
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
