/**
 * Serviço de comunicação com API Gemini
 * Suporta chamada direta ou via Cloudflare Worker
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash-exp';

class GeminiService {
    constructor() {
        this.apiKey = '';
        this.workerUrl = '';
        this.conversationHistory = [];
        this.lastAnalysis = '';
    }

    configure(apiKey, workerUrl = '') {
        this.apiKey = apiKey;
        this.workerUrl = workerUrl;
    }

    /**
     * Analisa a tela sob demanda
     */
    async analyzeScreen(imageBase64) {
        if (this.workerUrl) {
            return this.callWorker('/api/analyze', {
                imageBase64,
                conversationHistory: this.conversationHistory
            });
        }
        return this.callGeminiDirect(
            this.buildAnalyzePrompt(),
            imageBase64
        );
    }

    /**
     * Envia mensagem de chat com contexto
     */
    async sendMessage(message, imageBase64 = null) {
        // Adicionar ao histórico
        this.conversationHistory.push({ role: 'user', content: message });

        let response;

        if (this.workerUrl) {
            response = await this.callWorker('/api/chat', {
                message,
                imageBase64,
                lastAnalysis: this.lastAnalysis,
                conversationHistory: this.conversationHistory
            });
        } else {
            const prompt = this.buildChatPrompt(message);
            response = await this.callGeminiDirect(prompt, imageBase64);
        }

        if (response) {
            this.conversationHistory.push({ role: 'assistant', content: response });
        }

        return response;
    }

    /**
     * Chama o Cloudflare Worker
     */
    async callWorker(endpoint, body) {
        const response = await fetch(`${this.workerUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Worker error: ${response.status}`);
        }

        const data = await response.json();

        // Se for análise, guardar o resultado
        if (endpoint === '/api/analyze' && data.response) {
            this.lastAnalysis = data.response;
        }

        return data.response;
    }

    /**
     * Chama a API do Gemini diretamente
     */
    async callGeminiDirect(prompt, imageBase64 = null) {
        const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${this.apiKey}`;

        const parts = [];

        if (imageBase64) {
            parts.push({
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64
                }
            });
        }

        parts.push({ text: prompt });

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
            return text;
        }

        if (data.candidates?.[0]?.finishReason === 'SAFETY') {
            return 'Desculpe, não posso responder devido às políticas de segurança.';
        }

        return null;
    }

    buildAnalyzePrompt() {
        let historyContext = '';
        if (this.conversationHistory.length > 0) {
            historyContext = '\n\nHISTÓRICO DA CONVERSA:\n' +
                this.conversationHistory.slice(-5).map(m =>
                    `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
                ).join('\n');
        }

        return `Você é um ASSISTENTE EDUCACIONAL DE ALTA PRECISÃO especializado em resolver questões ESPRO.
${historyContext}

ANALISE A TELA COM CUIDADO. O usuário clicou no botão "Analisar".

Se houver uma QUESTÃO, forneça:
🎯 **TIPO:** [Matéria]
📌 **RESPOSTA CORRETA:** [Letra/Resposta]
📝 **EXPLICAÇÃO:** [Raciocínio]
💡 **DICA:** [Para questões similares]

Se não houver questão, descreva o que vê e ofereça ajuda.
O usuário pode fazer PERGUNTAS DE FOLLOW-UP sobre sua análise.

ANALISE:`;
    }

    buildChatPrompt(userMessage) {
        let historyContext = this.conversationHistory.slice(-8).map(m =>
            `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
        ).join('\n');

        return `Você é um ASSISTENTE EDUCACIONAL prestativo.

ÚLTIMA ANÁLISE DA TELA:
${this.lastAnalysis || 'Nenhuma análise recente.'}

HISTÓRICO:
${historyContext || 'Início da conversa.'}

PERGUNTA ATUAL:
${userMessage}

Use o contexto para dar uma resposta RELEVANTE. Se o usuário pedir explicação sobre a análise anterior, use esse contexto.

RESPONDA:`;
    }

    clearHistory() {
        this.conversationHistory = [];
        this.lastAnalysis = '';
    }

    getHistory() {
        return [...this.conversationHistory];
    }
}

export const geminiService = new GeminiService();
export default geminiService;
