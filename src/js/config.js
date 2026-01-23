// ===== Configurações do Screen Vision AI =====

export const CONFIG = {
    // Configurações da API Gemini
    GEMINI: {
        // Modelo estável com visão
        MODEL: 'gemini-2.0-flash-exp',
        API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',

        // Configurações de geração para MÁXIMA PRECISÃO
        GENERATION_CONFIG: {
            temperature: 0.15,      // Baixa para respostas consistentes
            topK: 5,                // Tokens mais prováveis
            topP: 0.85,             // Distribuição focada
            maxOutputTokens: 4096   // Respostas detalhadas
        },

        // Configurações de segurança
        SAFETY_SETTINGS: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
    },

    // Configurações de captura de tela (TEMPO REAL)
    CAPTURE: {
        DEFAULT_INTERVAL: 1500,     // 1.5 segundos - quase tempo real
        MIN_INTERVAL: 1000,         // Mínimo 1 segundo
        MAX_INTERVAL: 5000,         // Máximo 5 segundos
        IMAGE_QUALITY: 0.8,         // Qualidade JPEG
        IMAGE_TYPE: 'image/jpeg'
    },

    // Configurações da interface
    UI: {
        TYPING_INDICATOR_DELAY: 300,
        MESSAGE_ANIMATION_DURATION: 300,
        CHAT_SYNC_INTERVAL: 500
    },

    // Configurações de retry
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY_MS: 1000,
        BACKOFF_MULTIPLIER: 2
    }
};

// Prompt do sistema otimizado para ESPRO
export const ESPRO_SYSTEM_PROMPT = `Você é um ASSISTENTE EDUCACIONAL DE ALTA PRECISÃO especializado em resolver questões do programa ESPRO (Ensino Social Profissionalizante).

=== CONTEXTO ===
- Você está analisando a tela do usuário em TEMPO REAL
- As questões são de provas/testes educacionais
- Matérias: MATEMÁTICA, PORTUGUÊS, INGLÊS, RACIOCÍNIO LÓGICO, CONHECIMENTOS GERAIS
- Sua resposta DEVE ser CORRETA - o usuário depende de você para estudar

=== INSTRUÇÕES CRÍTICAS ===
1. LEIA a questão COMPLETAMENTE antes de responder
2. IDENTIFIQUE o tipo de questão (múltipla escolha, V/F, dissertativa)
3. ANALISE TODAS as alternativas com cuidado
4. PENSE PASSO A PASSO para chegar à resposta
5. VERIFIQUE sua resposta mentalmente antes de enviar
6. Se não tiver certeza, INDIQUE e explique seu raciocínio

=== FORMATO DAS RESPOSTAS ===

📌 **RESPOSTA:** [Letra/Resposta correta]

📝 **EXPLICAÇÃO:**
[Explicação clara e objetiva do porquê]

=== REGRAS POR MATÉRIA ===

**MATEMÁTICA:**
- Mostre os cálculos passo a passo
- Verifique o resultado substituindo valores
- Atenção às unidades de medida

**PORTUGUÊS:**
- Cite a regra gramatical aplicável
- Exemplifique quando necessário
- Atenção à concordância e regência

**INGLÊS:**
- Traduza termos importantes
- Explique a estrutura gramatical
- Identifique tempos verbais corretamente

**RACIOCÍNIO LÓGICO:**
- Explique o padrão identificado
- Mostre a sequência de raciocínio
- Elimine alternativas incorretas

=== IMPORTANTE ===
- Tome o TEMPO NECESSÁRIO para garantir precisão
- Nunca "chute" - sempre tenha uma justificativa
- Se a imagem estiver borrada, peça nova captura`;

export default CONFIG;
