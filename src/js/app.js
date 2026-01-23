// ===== Screen Vision AI - Aplicação Principal =====

import { CONFIG } from './config.js';
import { geminiAPI } from './gemini-api.js';
import { screenCapture } from './screen-capture.js';
import { chatUI } from './chat-ui.js';
import { isElectron, loadFromStorage, saveToStorage } from './utils.js';

class ScreenVisionApp {
    constructor() {
        // Estado
        this.isInitialized = false;
        this.autoAnalyze = loadFromStorage('auto_analyze', true);
        this.previousContext = '';
        this.isAnalyzing = false;

        // Elementos DOM
        this.elements = {};
    }

    /**
     * Inicializa a aplicação
     */
    async init() {
        this.cacheElements();
        this.initModules();
        this.bindEvents();
        this.checkStoredApiKey();
        this.isInitialized = true;

        console.log('Screen Vision AI inicializado!');
    }

    /**
     * Cache dos elementos DOM
     */
    cacheElements() {
        this.elements = {
            // Seções
            apiSection: document.getElementById('apiSection'),
            mainContent: document.getElementById('mainContent'),

            // API Key
            apiKeyInput: document.getElementById('apiKeyInput'),
            saveApiKeyBtn: document.getElementById('saveApiKey'),
            toggleVisibilityBtn: document.getElementById('toggleVisibility'),

            // Status
            statusIndicator: document.getElementById('statusIndicator'),

            // Captura de tela
            startCaptureBtn: document.getElementById('startCapture'),
            stopCaptureBtn: document.getElementById('stopCapture'),
            analyzeScreenBtn: document.getElementById('analyzeScreen'),
            screenVideo: document.getElementById('screenVideo'),
            captureCanvas: document.getElementById('captureCanvas'),
            previewPlaceholder: document.getElementById('previewPlaceholder'),
            captureIntervalSelect: document.getElementById('captureInterval'),
            frameCountDisplay: document.getElementById('frameCount'),
            autoAnalyzeToggle: document.getElementById('autoAnalyzeToggle'),

            // Chat
            chatMessages: document.getElementById('chatMessages'),
            userInput: document.getElementById('userInput'),
            sendMessageBtn: document.getElementById('sendMessage'),
            clearChatBtn: document.getElementById('clearChat'),
            typingIndicator: document.getElementById('typingIndicator'),
            popoutChatBtn: document.getElementById('popoutChat'),
            analyzeFromChatBtn: document.getElementById('analyzeFromChat')
        };
    }

    /**
     * Inicializa módulos
     */
    initModules() {
        // Inicializar captura de tela
        screenCapture.init(
            this.elements.screenVideo,
            this.elements.captureCanvas
        );

        // Callbacks de captura
        screenCapture.setOnFrameCapture((frame, count) => {
            this.onFrameCapture(frame, count);
        });

        screenCapture.setOnStop(() => {
            this.onCaptureStop();
        });

        // Inicializar chat UI
        chatUI.init({
            messagesContainer: this.elements.chatMessages,
            inputElement: this.elements.userInput,
            typingIndicator: this.elements.typingIndicator,
            sendButton: this.elements.sendMessageBtn
        });

        // Callback de envio de mensagem
        chatUI.setOnSendMessage((message) => {
            this.handleUserMessage(message);
        });
    }

    /**
     * Bind de eventos
     */
    bindEvents() {
        // API Key
        this.elements.saveApiKeyBtn?.addEventListener('click', () => this.saveApiKey());
        this.elements.toggleVisibilityBtn?.addEventListener('click', () => this.toggleApiKeyVisibility());
        this.elements.apiKeyInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveApiKey();
        });

        // Captura de tela
        this.elements.startCaptureBtn?.addEventListener('click', () => this.startCapture());
        this.elements.stopCaptureBtn?.addEventListener('click', () => this.stopCapture());
        this.elements.analyzeScreenBtn?.addEventListener('click', () => this.analyzeCurrentScreen());
        this.elements.analyzeFromChatBtn?.addEventListener('click', () => this.analyzeCurrentScreen());
        this.elements.captureIntervalSelect?.addEventListener('change', (e) => {
            screenCapture.updateInterval(parseInt(e.target.value));
        });

        // Auto-analyze toggle
        if (this.elements.autoAnalyzeToggle) {
            this.elements.autoAnalyzeToggle.checked = this.autoAnalyze;
            this.elements.autoAnalyzeToggle.addEventListener('change', (e) => {
                this.autoAnalyze = e.target.checked;
                saveToStorage('auto_analyze', this.autoAnalyze);
            });
        }

        // Chat
        this.elements.clearChatBtn?.addEventListener('click', () => this.clearChat());
        this.elements.popoutChatBtn?.addEventListener('click', () => this.openChatWindow());
    }

    // ========== API Key ==========

    checkStoredApiKey() {
        if (geminiAPI.hasApiKey()) {
            this.elements.apiKeyInput.value = geminiAPI.getApiKey();
            this.showMainContent();
            this.updateStatus('connected', 'Conectado');
        }
    }

    saveApiKey() {
        const key = this.elements.apiKeyInput.value.trim();
        if (!key) {
            alert('Por favor, insira uma API Key válida.');
            return;
        }

        geminiAPI.setApiKey(key);
        this.showMainContent();
        this.updateStatus('connected', 'Conectado');

        chatUI.addSystemMessage('API Key configurada com sucesso! Compartilhe sua tela para começar.', 'success');
    }

    toggleApiKeyVisibility() {
        const input = this.elements.apiKeyInput;
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    showMainContent() {
        this.elements.apiSection.style.display = 'none';
        this.elements.mainContent.style.display = 'block';
    }

    // ========== Status ==========

    updateStatus(status, text) {
        const indicator = this.elements.statusIndicator;
        if (indicator) {
            indicator.className = 'status-indicator ' + status;
            indicator.querySelector('.status-text').textContent = text;
        }
    }

    // ========== Captura de Tela ==========

    async startCapture() {
        try {
            await screenCapture.startCapture();

            // Atualizar UI
            this.elements.screenVideo.classList.add('active');
            this.elements.previewPlaceholder.style.display = 'none';
            this.elements.startCaptureBtn.style.display = 'none';
            this.elements.stopCaptureBtn.style.display = 'flex';
            this.elements.analyzeScreenBtn.style.display = 'flex';

            // Iniciar captura periódica (apenas para preview)
            const interval = parseInt(this.elements.captureIntervalSelect.value);
            screenCapture.startPeriodicCapture(interval);

            this.updateStatus('streaming', 'Transmitindo');
            chatUI.addSystemMessage('🎥 Tela compartilhada! Clique em "🔍 Analisar" quando quiser que eu analise a tela.', 'success');

            // Notificar janela de chat (se existir)
            this.syncToChatWindow();

        } catch (error) {
            console.error('Erro ao iniciar captura:', error);
            chatUI.addSystemMessage('Erro ao compartilhar tela. Verifique as permissões.', 'error');
        }
    }

    stopCapture() {
        screenCapture.stopCapture();
    }

    onCaptureStop() {
        this.elements.screenVideo.classList.remove('active');
        this.elements.previewPlaceholder.style.display = 'flex';
        this.elements.startCaptureBtn.style.display = 'flex';
        this.elements.stopCaptureBtn.style.display = 'none';
        this.elements.analyzeScreenBtn.style.display = 'none';

        this.updateStatus('connected', 'Conectado');
        chatUI.addSystemMessage('⏹️ Compartilhamento encerrado.', 'info');

        this.syncToChatWindow();
    }

    async onFrameCapture(frameBase64, frameCount) {
        // Apenas atualizar contador - sem análise automática
        if (this.elements.frameCountDisplay) {
            this.elements.frameCountDisplay.textContent = frameCount;
        }
        // Análise agora é feita apenas quando o usuário clica no botão
    }

    /**
     * Analisa a tela atual sob demanda (quando o usuário clica no botão)
     */
    async analyzeCurrentScreen() {
        if (this.isAnalyzing) {
            chatUI.addSystemMessage('⏳ Aguarde, já estou analisando...', 'warning');
            return;
        }

        if (!screenCapture.isActive()) {
            chatUI.addSystemMessage('📺 Compartilhe a tela primeiro para analisar.', 'error');
            return;
        }

        const frameBase64 = screenCapture.captureFrameForAnalysis();
        if (!frameBase64) {
            chatUI.addSystemMessage('❌ Não foi possível capturar a tela.', 'error');
            return;
        }

        this.isAnalyzing = true;
        chatUI.showTyping(true);
        chatUI.addSystemMessage('🔍 Analisando a tela...', 'info');

        try {
            const response = await geminiAPI.analyzeScreenOnDemand(frameBase64);

            chatUI.showTyping(false);

            if (response) {
                chatUI.addAIMessage(response);
                this.playNotificationSound();
            } else {
                chatUI.addSystemMessage('❌ Não foi possível analisar a tela. Tente novamente.', 'error');
            }

            this.syncToChatWindow();
        } catch (error) {
            chatUI.showTyping(false);
            console.error('Erro ao analisar tela:', error);
            chatUI.addSystemMessage(`❌ Erro: ${error.message}`, 'error');
        } finally {
            this.isAnalyzing = false;
        }
    }

    // ========== Detecção Automática de Questões ==========

    async autoAnalyzeScreen(frameBase64) {
        if (this.isAnalyzing) return;

        this.isAnalyzing = true;

        try {
            // Usar novo sistema de detecção e resolução automática
            const result = await geminiAPI.detectAndSolveQuestion(frameBase64);

            if (result.hasQuestion && result.response) {
                // Questão detectada e resolvida!
                chatUI.addAIMessage(result.response);
                this.previousContext = result.response;
                this.syncToChatWindow();

                // Tocar som de notificação (se disponível)
                this.playNotificationSound();
            }

        } catch (error) {
            console.error('Erro na detecção automática:', error);
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * Toca som de notificação quando detecta questão
     */
    playNotificationSound() {
        try {
            // Criar oscilador para som simples
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
            // Ignorar erros de áudio
        }
    }

    // ========== Chat ==========

    async handleUserMessage(message) {
        // Adicionar mensagem do usuário
        chatUI.addUserMessage(message);
        chatUI.showTyping(true);

        try {
            const frameBase64 = screenCapture.getLastFrame();
            const response = await geminiAPI.sendMessage(message, frameBase64, this.previousContext);

            chatUI.showTyping(false);

            if (response) {
                chatUI.addAIMessage(response);
            } else {
                chatUI.addSystemMessage('Não consegui processar sua solicitação. Tente novamente.', 'error');
            }

            this.syncToChatWindow();

        } catch (error) {
            chatUI.showTyping(false);
            console.error('Erro ao processar mensagem:', error);
            chatUI.addSystemMessage(`Erro: ${error.message}`, 'error');
        }
    }

    clearChat() {
        chatUI.clearMessages();
        geminiAPI.clearHistory();
        this.previousContext = '';

        chatUI.addSystemMessage('Olá! Sou seu assistente para questões ESPRO. Compartilhe sua tela e me pergunte sobre Matemática, Português, Inglês e mais!', 'info');

        this.syncToChatWindow();
    }

    // ========== Janela de Chat ==========

    openChatWindow() {
        if (isElectron()) {
            window.electronAPI.openChatWindow();
        } else {
            // Fallback para navegador - abrir popup
            const width = 420;
            const height = 600;
            const left = window.screen.width - width - 50;
            const top = 50;

            window.open(
                'chat-window.html',
                'ScreenVisionChat',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes`
            );
        }
    }

    syncToChatWindow() {
        const data = {
            chatHTML: chatUI.getChatHTML(),
            isCapturing: screenCapture.isActive()
        };

        if (isElectron()) {
            window.electronAPI.sendChatUpdate(data);
        } else {
            // BroadcastChannel para navegador
            if (this.broadcastChannel) {
                this.broadcastChannel.postMessage({
                    type: 'chat_sync',
                    data: data
                });
            }
        }
    }

    /**
     * Configura canal de broadcast para comunicação com popup
     */
    setupBroadcastChannel() {
        if (isElectron()) {
            // Listener para trigger de análise vindo da janela de chat (Electron)
            window.electronAPI.onTriggerAnalysis(() => {
                this.analyzeCurrentScreen();
            });
        } else {
            // BroadcastChannel para navegador
            this.broadcastChannel = new BroadcastChannel('screen_vision_ai');

            this.broadcastChannel.onmessage = (event) => {
                const { type, data } = event.data;

                if (type === 'new_message') {
                    this.handleUserMessage(data);
                } else if (type === 'request_state') {
                    this.syncToChatWindow();
                } else if (type === 'request_analysis') {
                    // Análise solicitada pela janela de chat
                    this.analyzeCurrentScreen();
                }
            };
        }
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const app = new ScreenVisionApp();
    app.init();
    app.setupBroadcastChannel();

    // Expor globalmente para debug
    window.screenVisionApp = app;
});

export default ScreenVisionApp;
