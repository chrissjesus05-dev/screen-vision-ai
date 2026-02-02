/**
 * Serviço de gerenciamento de Gems (Prompts Personalizados)
 * Similar às Gems do Google Gemini
 */

const STORAGE_KEY = 'screen_vision_gems';
const ACTIVE_GEM_KEY = 'screen_vision_active_gem';

// Gems padrão do sistema
const DEFAULT_GEMS = [
    {
        id: 'espro-default',
        name: 'ESPRO Padrão',
        icon: '🎓',
        description: 'Otimizado para questões do programa ESPRO',
        isDefault: true,
        analyzePrompt: `Você é um ASSISTENTE EDUCACIONAL DE ALTA PRECISÃO especializado em resolver questões do programa ESPRO.

VOCÊ ESTÁ ANALISANDO A TELA DO USUÁRIO. O usuário clicou no botão "Analisar" para obter sua ajuda.
{HISTORY}

{SUBJECT_INSTRUCTION}

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

ANALISE AGORA:`,
        chatPrompt: `Você é um ASSISTENTE EDUCACIONAL inteligente e prestativo.

{SUBJECT_INSTRUCTION}

=== CONTEXTO ===
Você está ajudando um usuário com questões educacionais.

=== ÚLTIMA ANÁLISE DA TELA ===
{LAST_ANALYSIS}

=== HISTÓRICO DA CONVERSA ===
{HISTORY}

=== PERGUNTA ATUAL DO USUÁRIO ===
{USER_MESSAGE}

Use o contexto para dar uma resposta RELEVANTE.

RESPONDA:`
    },
    {
        id: 'detailed-tutor',
        name: 'Tutor Detalhado',
        icon: '📚',
        description: 'Explicações longas e detalhadas com exemplos',
        isDefault: true,
        analyzePrompt: `Você é um PROFESSOR DEDICADO que explica tudo em DETALHES.

{HISTORY}

{SUBJECT_INSTRUCTION}

VOCÊ ESTÁ ANALISANDO A TELA DO ALUNO.

=== SEU ESTILO ===
- Explique PASSO A PASSO como se o aluno nunca tivesse visto o assunto
- Dê EXEMPLOS adicionais relacionados
- Mostre DIFERENTES FORMAS de resolver quando possível
- Use analogias para facilitar o entendimento
- Inclua dicas de memorização

FORMATO:

🎯 **MATÉRIA:** [Tipo]

📌 **RESPOSTA:** [Letra/Resposta]

📖 **EXPLICAÇÃO DETALHADA:**
[Explicação completa passo a passo]

🔍 **POR QUE AS OUTRAS ESTÃO ERRADAS:**
[Análise de cada alternativa incorreta]

📝 **EXEMPLO SIMILAR:**
[Um exemplo adicional para praticar]

💡 **COMO MEMORIZAR:**
[Dica de memorização]

ANALISE:`,
        chatPrompt: `Você é um PROFESSOR DEDICADO. Explique com muitos detalhes.

{SUBJECT_INSTRUCTION}

CONTEXTO: {LAST_ANALYSIS}
HISTÓRICO: {HISTORY}
PERGUNTA: {USER_MESSAGE}

Responda de forma DETALHADA e DIDÁTICA:`
    },
    {
        id: 'quick-answer',
        name: 'Resposta Rápida',
        icon: '⚡',
        description: 'Respostas diretas e concisas',
        isDefault: true,
        analyzePrompt: `Você é um assistente RÁPIDO e DIRETO.

{SUBJECT_INSTRUCTION}

ANALISE A TELA E RESPONDA:

📌 **RESPOSTA:** [Letra]
📝 **Motivo:** [1-2 frases apenas]

Seja CONCISO:`,
        chatPrompt: `Resposta RÁPIDA e DIRETA.
{SUBJECT_INSTRUCTION}
Pergunta: {USER_MESSAGE}
Contexto: {LAST_ANALYSIS}

Responda em no máximo 2-3 frases:`
    },
    {
        id: 'debug-mode',
        name: 'Debug Mode',
        icon: '🧪',
        description: 'Mostra todo o raciocínio passo a passo',
        isDefault: true,
        analyzePrompt: `Você está em MODO DEBUG. Mostre TODO seu raciocínio.

{HISTORY}

{SUBJECT_INSTRUCTION}

=== INSTRUÇÕES DEBUG ===
Pense em voz alta. Mostre CADA passo do seu raciocínio:

1. O QUE VOCÊ VÊ na tela
2. QUAL É A QUESTÃO exatamente
3. QUAIS SÃO AS ALTERNATIVAS
4. SEU RACIOCÍNIO para cada alternativa
5. POR QUE você chegou na resposta final
6. NÍVEL DE CONFIANÇA (1-10)

FORMATO:

🔍 **[LEITURA]**
O que vejo na tela...

❓ **[QUESTÃO]**
A pergunta é...

📋 **[ALTERNATIVAS]**
- A) ... → (análise)
- B) ... → (análise)
- C) ... → (análise)
- D) ... → (análise)

🧠 **[RACIOCÍNIO]**
Meu processo de pensamento...

✅ **[CONCLUSÃO]**
Resposta: X
Confiança: Y/10

ANALISE:`,
        chatPrompt: `MODO DEBUG ATIVADO.
Mostre seu raciocínio completo.
{SUBJECT_INSTRUCTION}
Contexto: {LAST_ANALYSIS}
Histórico: {HISTORY}
Pergunta: {USER_MESSAGE}

Pense passo a passo e mostre cada etapa:`
    }
];

class GemService {
    constructor() {
        this.gems = this.loadGems();
        this.activeGemId = this.loadActiveGemId();
    }

    /**
     * Carrega gems do localStorage
     */
    loadGems() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const customGems = JSON.parse(stored);
                // Mesclar com defaults (defaults sempre atualizados)
                return [...DEFAULT_GEMS, ...customGems.filter(g => !g.isDefault)];
            }
        } catch (e) {
            console.error('Erro ao carregar gems:', e);
        }
        return [...DEFAULT_GEMS];
    }

    /**
     * Salva gems customizadas no localStorage
     */
    saveGems() {
        try {
            const customGems = this.gems.filter(g => !g.isDefault);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(customGems));
        } catch (e) {
            console.error('Erro ao salvar gems:', e);
        }
    }

    /**
     * Carrega ID da gem ativa
     */
    loadActiveGemId() {
        return localStorage.getItem(ACTIVE_GEM_KEY) || 'espro-default';
    }

    /**
     * Define gem ativa
     */
    setActiveGem(gemId) {
        this.activeGemId = gemId;
        localStorage.setItem(ACTIVE_GEM_KEY, gemId);
    }

    /**
     * Retorna gem ativa
     */
    getActiveGem() {
        return this.gems.find(g => g.id === this.activeGemId) || this.gems[0];
    }

    /**
     * Retorna todas as gems
     */
    getAllGems() {
        return [...this.gems];
    }

    /**
     * Cria nova gem
     */
    createGem(gem) {
        const newGem = {
            ...gem,
            id: `custom-${Date.now()}`,
            isDefault: false,
            createdAt: Date.now()
        };
        this.gems.push(newGem);
        this.saveGems();
        return newGem;
    }

    /**
     * Atualiza gem existente
     */
    updateGem(gemId, updates) {
        const index = this.gems.findIndex(g => g.id === gemId);
        if (index !== -1 && !this.gems[index].isDefault) {
            this.gems[index] = { ...this.gems[index], ...updates };
            this.saveGems();
            return this.gems[index];
        }
        return null;
    }

    /**
     * Deleta gem (apenas customizadas)
     */
    deleteGem(gemId) {
        const gem = this.gems.find(g => g.id === gemId);
        if (gem && !gem.isDefault) {
            this.gems = this.gems.filter(g => g.id !== gemId);
            this.saveGems();
            // Se deletou a ativa, volta para default
            if (this.activeGemId === gemId) {
                this.setActiveGem('espro-default');
            }
            return true;
        }
        return false;
    }

    /**
     * Duplica uma gem (para criar baseado em existente)
     */
    duplicateGem(gemId) {
        const original = this.gems.find(g => g.id === gemId);
        if (original) {
            return this.createGem({
                name: `${original.name} (Cópia)`,
                icon: original.icon,
                description: original.description,
                analyzePrompt: original.analyzePrompt,
                chatPrompt: original.chatPrompt
            });
        }
        return null;
    }

    /**
     * Processa prompt substituindo placeholders
     */
    processPrompt(promptTemplate, variables) {
        let result = promptTemplate;

        if (variables.history) {
            result = result.replace('{HISTORY}', variables.history);
        } else {
            result = result.replace('{HISTORY}', '');
        }

        if (variables.subjectInstruction) {
            result = result.replace('{SUBJECT_INSTRUCTION}',
                `=== INSTRUÇÃO DE MATÉRIA ===\n${variables.subjectInstruction}`);
        } else {
            result = result.replace('{SUBJECT_INSTRUCTION}', '');
        }

        if (variables.lastAnalysis) {
            result = result.replace('{LAST_ANALYSIS}', variables.lastAnalysis);
        } else {
            result = result.replace('{LAST_ANALYSIS}', 'Nenhuma análise recente.');
        }

        if (variables.userMessage) {
            result = result.replace('{USER_MESSAGE}', variables.userMessage);
        }

        return result;
    }
}

export const gemService = new GemService();
export default gemService;
