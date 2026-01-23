// ===== Módulo de Interface do Chat =====

import { formatMarkdown, generateId } from './utils.js';
import { CONFIG } from './config.js';

class ChatUI {
    constructor() {
        this.messagesContainer = null;
        this.inputElement = null;
        this.typingIndicator = null;
        this.sendButton = null;

        this.onSendMessage = null;  // Callback quando enviar mensagem
    }

    /**
     * Inicializa o módulo com elementos DOM
     */
    init(options) {
        this.messagesContainer = options.messagesContainer;
        this.inputElement = options.inputElement;
        this.typingIndicator = options.typingIndicator;
        this.sendButton = options.sendButton;

        this.setupEventListeners();
        this.setupAutoResize();
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.handleSend());
        }

        if (this.inputElement) {
            this.inputElement.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSend();
                }
            });
        }
    }

    /**
     * Configura auto-resize do textarea
     */
    setupAutoResize() {
        if (this.inputElement) {
            this.inputElement.addEventListener('input', () => {
                this.inputElement.style.height = 'auto';
                this.inputElement.style.height = Math.min(this.inputElement.scrollHeight, 120) + 'px';
            });
        }
    }

    /**
     * Handler para enviar mensagem
     */
    handleSend() {
        const message = this.inputElement?.value.trim();
        if (!message) return;

        if (this.onSendMessage) {
            this.onSendMessage(message);
        }

        this.inputElement.value = '';
        this.inputElement.style.height = 'auto';
    }

    /**
     * Adiciona mensagem do usuário
     */
    addUserMessage(content) {
        const messageHTML = `
            <div class="message user-message" data-id="${generateId()}">
                <div class="message-content">
                    <p>${this.escapeHtml(content)}</p>
                </div>
                <div class="message-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
            </div>
        `;

        this.appendMessage(messageHTML);
    }

    /**
     * Adiciona mensagem da IA
     */
    addAIMessage(content) {
        const formattedContent = formatMarkdown(content);

        const messageHTML = `
            <div class="message ai-message" data-id="${generateId()}">
                <div class="message-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <div class="message-content">
                    <div class="ai-response">${formattedContent}</div>
                </div>
            </div>
        `;

        this.appendMessage(messageHTML);
    }

    /**
     * Adiciona mensagem do sistema
     */
    addSystemMessage(content, type = 'info') {
        const icons = {
            info: '💡',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        const icon = icons[type] || icons.info;

        const messageHTML = `
            <div class="message system-message ${type}" data-id="${generateId()}">
                <div class="message-icon">${icon}</div>
                <div class="message-content">
                    <p>${content}</p>
                </div>
            </div>
        `;

        this.appendMessage(messageHTML);
    }

    /**
     * Adiciona mensagem ao container
     */
    appendMessage(html) {
        if (this.messagesContainer) {
            this.messagesContainer.insertAdjacentHTML('beforeend', html);
            this.scrollToBottom();
        }
    }

    /**
     * Mostra/esconde indicador de digitação
     */
    showTyping(show) {
        if (this.typingIndicator) {
            this.typingIndicator.style.display = show ? 'flex' : 'none';
            if (show) this.scrollToBottom();
        }
    }

    /**
     * Scroll para o final do chat
     */
    scrollToBottom() {
        if (this.messagesContainer) {
            setTimeout(() => {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }, CONFIG.UI.MESSAGE_ANIMATION_DURATION);
        }
    }

    /**
     * Limpa todas as mensagens
     */
    clearMessages() {
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
        }
    }

    /**
     * Obtém HTML do chat (para sincronização)
     */
    getChatHTML() {
        return this.messagesContainer?.innerHTML || '';
    }

    /**
     * Define HTML do chat (para sincronização)
     */
    setChatHTML(html) {
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = html;
            this.scrollToBottom();
        }
    }

    /**
     * Define callback para envio de mensagem
     */
    setOnSendMessage(callback) {
        this.onSendMessage = callback;
    }

    /**
     * Escapa HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Foca no input
     */
    focusInput() {
        if (this.inputElement) {
            this.inputElement.focus();
        }
    }

    /**
     * Desabilita/habilita input
     */
    setInputEnabled(enabled) {
        if (this.inputElement) {
            this.inputElement.disabled = !enabled;
        }
        if (this.sendButton) {
            this.sendButton.disabled = !enabled;
        }
    }
}

// Exportar instância única
export const chatUI = new ChatUI();
export default chatUI;
