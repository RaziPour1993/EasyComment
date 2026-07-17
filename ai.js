/**
 * Comment generation providers (template, OpenAI, Gemini cloud, Chrome Built-in AI).
 * Loaded via importScripts in the service worker; attaches to global scope.
 */

const AI_MODES = {
    TEMPLATE: 'template',
    CHATGPT: 'chatgpt',
    GEMINI: 'gemini'
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

    let contextBlock = '';
    if (title || channel || description) {
        contextBlock = [
            title ? `Video title: ${title}` : '',
            channel ? `Channel: ${channel}` : '',
            description ? `Description snippet: ${description}` : ''
        ].filter(Boolean).join('\n');
    }

    return [
        'Write a short, natural YouTube comment for a viewer.',
        `The viewer rated this video ${rating}/5 stars (${RATING_LABELS[rating] || 'unknown'}).`,
        'Match the tone to the rating. Sound like a real person, not marketing copy.',
        'Do not use hashtag spam. Do not wrap the comment in quotes.',
        'Return ONLY the comment text — no preamble, no explanation.',
        contextBlock ? `\nVideo context:\n${contextBlock}` : '\nNo video metadata available; write a generic rating-appropriate comment.'
    ].join('\n');
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

async function generateChatGptComment(rating, videoContext, apiKey) {
    if (!apiKey || !apiKey.trim()) {
        throw new Error('MISSING_OPENAI_KEY');
    }

    const prompt = buildCommentPrompt(rating, videoContext);
    let response;
    try {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You write short natural YouTube comments. Reply with only the comment text.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.9,
                max_tokens: 150
            })
        });
    } catch (error) {
        console.error('OpenAI network error:', error);
        throw new Error('OPENAI_NETWORK');
    }

    if (!response.ok) {
        const status = response.status;
        console.error('OpenAI API error status:', status);
        if (status === 401 || status === 403) {
            throw new Error('OPENAI_AUTH');
        }
        throw new Error('OPENAI_API');
    }

    let data;
    try {
        data = await response.json();
    } catch (error) {
        console.error('OpenAI JSON parse error:', error);
        throw new Error('OPENAI_API');
    }

    const comment = cleanAiComment(data?.choices?.[0]?.message?.content);
    if (!comment) {
        throw new Error('EMPTY_AI_RESPONSE');
    }
    return comment;
}

async function isBuiltInAiAvailable() {
    try {
        if (typeof LanguageModel === 'undefined') {
            return false;
        }
        const availability = await LanguageModel.availability();
        return availability === 'available' || availability === 'readily' || availability === 'after-download' || availability === 'downloadable';
    } catch (error) {
        console.error('Built-in AI availability check failed:', error);
        return false;
    }
}

async function generateBuiltInGeminiComment(rating, videoContext) {
    try {
        if (typeof LanguageModel === 'undefined') {
            throw new Error('BUILTIN_UNAVAILABLE');
        }

        const availability = await LanguageModel.availability();
        if (availability === 'unavailable') {
            throw new Error('BUILTIN_UNAVAILABLE');
        }

        const session = await LanguageModel.create({
            monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                    console.log(`Built-in model download: ${Math.round((e.loaded || 0) * 100)}%`);
                });
            }
        });

        try {
            const prompt = buildCommentPrompt(rating, videoContext);
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
        if (error.message === 'EMPTY_AI_RESPONSE' || error.message === 'BUILTIN_UNAVAILABLE') {
            throw error;
        }
        console.error('Built-in AI generation failed:', error);
        throw new Error('BUILTIN_FAILED');
    }
}

async function generateGeminiCloudComment(rating, videoContext, apiKey) {
    if (!apiKey || !apiKey.trim()) {
        throw new Error('MISSING_GEMINI_KEY');
    }

    const prompt = buildCommentPrompt(rating, videoContext);
    const url =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
        encodeURIComponent(apiKey.trim());

    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 150
                }
            })
        });
    } catch (error) {
        console.error('Gemini network error:', error);
        throw new Error('GEMINI_NETWORK');
    }

    if (!response.ok) {
        const status = response.status;
        console.error('Gemini API error status:', status);
        if (status === 400 || status === 401 || status === 403) {
            throw new Error('GEMINI_AUTH');
        }
        throw new Error('GEMINI_API');
    }

    let data;
    try {
        data = await response.json();
    } catch (error) {
        console.error('Gemini JSON parse error:', error);
        throw new Error('GEMINI_API');
    }

    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
        ? parts.map((p) => p.text || '').join('').trim()
        : '';
    const comment = cleanAiComment(text);
    if (!comment) {
        throw new Error('EMPTY_AI_RESPONSE');
    }
    return comment;
}

async function generateGeminiComment(rating, videoContext, geminiApiKey) {
    const builtInReady = await isBuiltInAiAvailable();
    if (builtInReady) {
        try {
            return await generateBuiltInGeminiComment(rating, videoContext);
        } catch (error) {
            console.error('Built-in Gemini failed, trying cloud if key present:', error.message);
            if (geminiApiKey && geminiApiKey.trim()) {
                return generateGeminiCloudComment(rating, videoContext, geminiApiKey);
            }
            throw error;
        }
    }

    if (geminiApiKey && geminiApiKey.trim()) {
        return generateGeminiCloudComment(rating, videoContext, geminiApiKey);
    }

    throw new Error('GEMINI_NO_PROVIDER');
}

/**
 * @param {'template'|'chatgpt'|'gemini'} mode
 * @param {number} rating
 * @param {{ title?: string, channel?: string, description?: string }} videoContext
 * @param {{ openaiApiKey?: string, geminiApiKey?: string }} keys
 */
async function generateComment(mode, rating, videoContext, keys) {
    const safeRating = Math.min(5, Math.max(1, Number(rating) || 1));
    const safeKeys = keys || {};

    switch (mode) {
        case AI_MODES.CHATGPT:
            return generateChatGptComment(safeRating, videoContext, safeKeys.openaiApiKey);
        case AI_MODES.GEMINI:
            return generateGeminiComment(safeRating, videoContext, safeKeys.geminiApiKey);
        case AI_MODES.TEMPLATE:
        default:
            return generateTemplateComment(safeRating);
    }
}

async function getGeminiStatus(geminiApiKey) {
    const builtIn = await isBuiltInAiAvailable();
    if (builtIn) {
        return 'builtin';
    }
    if (geminiApiKey && geminiApiKey.trim()) {
        return 'api_key';
    }
    return 'needs_setup';
}
