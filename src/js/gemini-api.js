// ===== Módulo de Comunicação com API Gemini =====

import { CONFIG, ESPRO_SYSTEM_PROMPT } from './config.js';

class GeminiAPI {
    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key') || '';
        this.conversationHistory = [];
        this.isProcessing = false;
        this.lastAnalyzedHash = null;
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
    }

    getApiKey() {
        return this.apiKey;
    }

    hasApiKey() {
        return !!this.apiKey;
    }

    clearApiKey() {
        this.apiKey = '';
        localStorage.removeItem('gemini_api_key');
    }

    /**
     * Constrói o prompt otimizado para questões ESPRO
     */
    buildPrompt(userMessage, screenContext = '') {
        let prompt = ESPRO_SYSTEM_PROMPT + '\n\n';

        prompt += '=== SITUAÇÃO ATUAL ===\n';

        if (screenContext) {
            prompt += `Contexto anterior da tela: ${screenContext}\n\n`;
        }

        prompt += `PERGUNTA DO USUÁRIO: ${userMessage}\n\n`;
        prompt += 'Analise a imagem da tela atual e forneça a resposta CORRETA seguindo o formato especificado.';

        return prompt;
    }

    /**
     * Prompt para detectar e resolver questões automaticamente
     */
    buildAutoQuestionPrompt() {
        return `Você é um assistente educacional ESPRO que analisa telas em TEMPO REAL.

=== SUA TAREFA ===
1. VERIFIQUE se há uma QUESTÃO/EXERCÍCIO visível na tela
2. Se houver questão, RESOLVA IMEDIATAMENTE com a resposta correta
3. Se NÃO houver questão, responda apenas: [AGUARDANDO]

=== COMO IDENTIFICAR UMA QUESTÃO ===
- Texto com pergunta (termina em ?)
- Alternativas (A, B, C, D ou 1, 2, 3, 4)
- Enunciado de exercício
- Problema matemático
- Texto para interpretação
- Questão de múltipla escolha

=== SE DETECTAR QUESTÃO, RESPONDA ASSIM ===

🎯 **QUESTÃO DETECTADA:** [Tipo da questão - ex: Matemática, Português, Inglês]

📌 **RESPOSTA:** [Alternativa correta ou resposta]

📝 **EXPLICAÇÃO RÁPIDA:**
[Explicação em 2-3 linhas]

=== SE NÃO HOUVER QUESTÃO ===
Responda apenas: [AGUARDANDO]

=== REGRAS ===
- Seja RÁPIDO e PRECISO
- Não descreva a tela, apenas resolva a questão
- Se for Matemática, mostre o cálculo
- Se for Inglês, traduza se necessário
- Se for Português, cite a regra

ANALISE A TELA AGORA:`;
    }

    /**
     * Chama a API do Gemini com retry automático
     */
    async callAPI(prompt, imageBase64 = null, options = {}) {
        const { silent = false, retryCount = 0 } = options;

        if (!this.apiKey) {
            throw new Error('API Key não configurada');
        }

        const apiUrl = `${CONFIG.GEMINI.API_BASE}/${CONFIG.GEMINI.MODEL}:generateContent?key=${this.apiKey}`;

        // Construir partes da mensagem
        const parts = [];

        // Adicionar imagem primeiro (se houver)
        if (imageBase64) {
            parts.push({
                inline_data: {
                    mime_type: CONFIG.CAPTURE.IMAGE_TYPE,
                    data: imageBase64
                }
            });
        }

        // Adicionar texto
        parts.push({ text: prompt });

        const requestBody = {
            contents: [{
                parts: parts
            }],
            generationConfig: CONFIG.GEMINI.GENERATION_CONFIG,
            safetySettings: CONFIG.GEMINI.SAFETY_SETTINGS
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Tratar erros específicos
                if (response.status === 400) {
                    throw new Error('API Key inválida ou expirada. Verifique sua chave.');
                } else if (response.status === 429) {
                    // Rate limit - tentar novamente
                    if (retryCount < CONFIG.RETRY.MAX_ATTEMPTS) {
                        const delay = CONFIG.RETRY.DELAY_MS * Math.pow(CONFIG.RETRY.BACKOFF_MULTIPLIER, retryCount);
                        await this.sleep(delay);
                        return this.callAPI(prompt, imageBase64, { ...options, retryCount: retryCount + 1 });
                    }
                    throw new Error('Limite de requisições atingido. Aguarde alguns segundos.');
                } else if (response.status === 404) {
                    throw new Error('Modelo não disponível. Verifique sua API Key.');
                }

                throw new Error(errorData.error?.message || `Erro na API: ${response.status}`);
            }

            const data = await response.json();

            // Extrair texto da resposta
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            }

            // Verificar se foi bloqueado por segurança
            if (data.candidates && data.candidates[0]?.finishReason === 'SAFETY') {
                return 'Desculpe, não posso responder a esta pergunta devido às políticas de segurança.';
            }

            return null;

        } catch (error) {
            if (!silent) {
                console.error('Erro na API Gemini:', error);
            }

            // Retry em caso de erro de rede
            if (error.name === 'TypeError' && retryCount < CONFIG.RETRY.MAX_ATTEMPTS) {
                const delay = CONFIG.RETRY.DELAY_MS * Math.pow(CONFIG.RETRY.BACKOFF_MULTIPLIER, retryCount);
                await this.sleep(delay);
                return this.callAPI(prompt, imageBase64, { ...options, retryCount: retryCount + 1 });
            }

            throw error;
        }
    }

    /**
     * Envia mensagem do usuário com contexto de tela
     */
    async sendMessage(message, imageBase64 = null, screenContext = '') {
        if (this.isProcessing) {
            throw new Error('Aguarde a resposta anterior');
        }

        this.isProcessing = true;

        try {
            const prompt = this.buildPrompt(message, screenContext);
            const response = await this.callAPI(prompt, imageBase64);

            // Salvar no histórico
            this.conversationHistory.push({
                role: 'user',
                content: message,
                timestamp: Date.now()
            });

            if (response) {
                this.conversationHistory.push({
                    role: 'assistant',
                    content: response,
                    timestamp: Date.now()
                });
            }

            return response;

        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Detecta e resolve questões automaticamente
     * @param {string} imageBase64 - Imagem da tela em base64
     * @returns {Promise<{hasQuestion: boolean, response: string|null}>}
     */
    async detectAndSolveQuestion(imageBase64) {
        if (this.isProcessing) {
            return { hasQuestion: false, response: null };
        }

        // Calcular hash simples da imagem para evitar reprocessar a mesma tela
        const imageHash = this.simpleHash(imageBase64.substring(0, 1000));
        if (imageHash === this.lastAnalyzedHash) {
            return { hasQuestion: false, response: null };
        }

        this.isProcessing = true;

        try {
            const prompt = this.buildAutoQuestionPrompt();
            const response = await this.callAPI(prompt, imageBase64, { silent: true });

            this.lastAnalyzedHash = imageHash;

            if (!response) {
                return { hasQuestion: false, response: null };
            }

            // Verificar se detectou questão
            const isWaiting = response.includes('[AGUARDANDO]');

            if (isWaiting) {
                return { hasQuestion: false, response: null };
            }

            // Questão detectada e resolvida!
            return { hasQuestion: true, response: response };

        } catch (error) {
            console.error('Erro na detecção automática:', error);
            return { hasQuestion: false, response: null };
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Analisa a tela sob demanda - resposta mais detalhada e precisa
     * Chamado quando o usuário clica no botão "Analisar"
     */
    async analyzeScreenOnDemand(imageBase64) {
        if (this.isProcessing) {
            throw new Error('Aguarde a análise anterior');
        }

        this.isProcessing = true;

        try {
            const prompt = `Você é um ASSISTENTE EDUCACIONAL DE ALTA PRECISÃO especializado em resolver questões do programa ESPRO.

ANALISE A TELA COM CUIDADO E SEM PRESSA. O usuário solicitou esta análise manualmente, então TOME O TEMPO NECESSÁRIO para garantir precisão.

=== SE HOUVER UMA QUESTÃO/EXERCÍCIO VISÍVEL ===

1. IDENTIFIQUE o tipo de questão (Matemática, Português, Inglês, Raciocínio Lógico)
2. LEIA a questão COMPLETAMENTE
3. ANALISE TODAS as alternativas (se houver)
4. PENSE PASSO A PASSO antes de responder
5. FORNEÇA a resposta CORRETA

FORMATO DA RESPOSTA:

🎯 **TIPO:** [Matéria identificada]

📌 **RESPOSTA CORRETA:** [Letra/Resposta]

📝 **EXPLICAÇÃO DETALHADA:**
[Explicação passo a passo do raciocínio]

💡 **DICA:** [Dica para questões similares]

=== SE NÃO HOUVER QUESTÃO ===
Descreva o que você vê na tela e ofereça ajuda relevante.

=== REGRAS IMPORTANTES ===
- Nunca "chute" - sempre tenha justificativa
- Para Matemática: mostre os cálculos
- Para Português: cite a regra gramatical
- Para Inglês: traduza termos importantes
- Se a imagem estiver borrada, diga ao usuário

ANALISE AGORA COM MÁXIMA PRECISÃO:`;

            const response = await this.callAPI(prompt, imageBase64);
            return response;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Hash simples para comparar imagens
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    /**
     * Reseta o hash para forçar nova análise
     */
    resetAnalysis() {
        this.lastAnalyzedHash = null;
    }

    /**
     * Limpa histórico de conversa
     */
    clearHistory() {
        this.conversationHistory = [];
        this.lastAnalyzedHash = null;
    }

    /**
     * Utilitário: sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Testa a conexão com a API
     */
    async testConnection() {
        try {
            const response = await this.callAPI('Responda apenas: OK', null, { silent: true });
            return response !== null;
        } catch (error) {
            return false;
        }
    }
}

// Exportar instância única (singleton)
export const geminiAPI = new GeminiAPI();
export default geminiAPI;
