/**
 * Screen Vision AI - Cloudflare Worker
 * Proxy seguro para a API do Google Gemini
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash-exp';

/**
 * Configurações de CORS
 */
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
};

/**
 * Handler principal do Worker
 */
export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            // Rota: POST /api/analyze - Análise de tela
            if (path === '/api/analyze' && request.method === 'POST') {
                return await handleAnalyze(request, env);
            }

            // Rota: POST /api/chat - Chat com contexto
            if (path === '/api/chat' && request.method === 'POST') {
                return await handleChat(request, env);
            }

            // Rota: GET /api/health - Health check
            if (path === '/api/health') {
                return jsonResponse({ status: 'ok', timestamp: Date.now() });
            }

            // Rota não encontrada
            return jsonResponse({ error: 'Not found' }, 404);

        } catch (error) {
            console.error('Worker error:', error);
            return jsonResponse({ error: error.message || 'Internal server error' }, 500);
        }
    }
};

/**
 * Handler para análise de tela
 */
async function handleAnalyze(request, env) {
    const body = await request.json();
    const { imageBase64, conversationHistory = [] } = body;

    if (!imageBase64) {
        return jsonResponse({ error: 'imageBase64 is required' }, 400);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
        return jsonResponse({ error: 'API key not configured' }, 500);
    }

    const prompt = buildAnalyzePrompt(conversationHistory);
    const response = await callGeminiAPI(apiKey, prompt, imageBase64);

    return jsonResponse({ response, timestamp: Date.now() });
}

/**
 * Handler para chat com contexto
 */
async function handleChat(request, env) {
    const body = await request.json();
    const { message, imageBase64, lastAnalysis = '', conversationHistory = [] } = body;

    if (!message) {
        return jsonResponse({ error: 'message is required' }, 400);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
        return jsonResponse({ error: 'API key not configured' }, 500);
    }

    const prompt = buildChatPrompt(message, lastAnalysis, conversationHistory);
    const response = await callGeminiAPI(apiKey, prompt, imageBase64);

    return jsonResponse({ response, timestamp: Date.now() });
}

/**
 * Prompt para análise de tela
 */
function buildAnalyzePrompt(conversationHistory) {
    let historyContext = '';
    if (conversationHistory.length > 0) {
        historyContext = '\n\nHISTÓRICO DA CONVERSA (use como contexto):\n' +
            conversationHistory.slice(-5).map(m =>
                `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
            ).join('\n');
    }

    return `Você é um ASSISTENTE EDUCACIONAL DE ALTA PRECISÃO especializado em resolver questões do programa ESPRO.

VOCÊ ESTÁ ANALISANDO A TELA DO USUÁRIO. O usuário clicou no botão "Analisar" para obter sua ajuda.
${historyContext}

=== INSTRUÇÕES ===

1. ANALISE a imagem da tela com CUIDADO
2. Se houver uma QUESTÃO/EXERCÍCIO visível:
   - Identifique o tipo (Matemática, Português, Inglês, Raciocínio Lógico)
   - Leia TODAS as alternativas
   - Pense PASSO A PASSO
   - Forneça a resposta CORRETA

FORMATO DA RESPOSTA:

🎯 **TIPO:** [Matéria identificada]

📌 **RESPOSTA CORRETA:** [Letra/Resposta]

📝 **EXPLICAÇÃO:**
[Explicação clara do raciocínio]

💡 **DICA:** [Dica para questões similares]

=== SE NÃO HOUVER QUESTÃO ===
Descreva o que você vê na tela e ofereça ajuda.

=== IMPORTANTE ===
- Tome o tempo que precisar para garantir PRECISÃO
- Nunca "chute" - sempre tenha justificativa
- O usuário pode fazer PERGUNTAS DE FOLLOW-UP sobre sua análise

ANALISE AGORA:`;
}

/**
 * Prompt para chat com contexto
 */
function buildChatPrompt(userMessage, lastAnalysis, conversationHistory) {
    let historyContext = '';
    if (conversationHistory.length > 0) {
        historyContext = conversationHistory.slice(-8).map(m =>
            `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
        ).join('\n');
    }

    return `Você é um ASSISTENTE EDUCACIONAL inteligente e prestativo.

=== CONTEXTO ===
Você está ajudando um usuário com questões educacionais. O usuário pode estar:
1. Fazendo uma PERGUNTA sobre uma análise anterior da tela
2. Pedindo mais EXPLICAÇÕES sobre uma resposta
3. Fazendo uma NOVA PERGUNTA relacionada ao tema

=== ÚLTIMA ANÁLISE DA TELA ===
${lastAnalysis || 'Nenhuma análise recente disponível.'}

=== HISTÓRICO DA CONVERSA ===
${historyContext || 'Início da conversa.'}

=== PERGUNTA ATUAL DO USUÁRIO ===
${userMessage}

=== INSTRUÇÕES ===
- Use o CONTEXTO acima para dar uma resposta RELEVANTE
- Se o usuário pedir para explicar algo da análise anterior, use esse contexto
- Se for uma pergunta nova, responda normalmente
- Seja claro, objetivo e educativo
- Se houver uma imagem anexada, analise-a também

RESPONDA:`;
}

/**
 * Chama a API do Gemini
 */
async function callGeminiAPI(apiKey, prompt, imageBase64 = null) {
    const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

    const parts = [];

    // Adicionar imagem primeiro (se houver)
    if (imageBase64) {
        parts.push({
            inline_data: {
                mime_type: 'image/jpeg',
                data: imageBase64
            }
        });
    }

    // Adicionar texto
    parts.push({ text: prompt });

    const requestBody = {
        contents: [{ parts }],
        generationConfig: {
            temperature: 0.15,
            topK: 5,
            topP: 0.85,
            maxOutputTokens: 4096
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
    }

    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        return 'Desculpe, não posso responder a esta pergunta devido às políticas de segurança.';
    }

    return null;
}

/**
 * Helper para resposta JSON
 */
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        }
    });
}
