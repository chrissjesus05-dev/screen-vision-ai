// ===== Screen Vision AI - Main Application =====

class ScreenVisionAI {
    constructor() {
        // DOM Elements
        this.apiSection = document.getElementById('apiSection');
        this.mainContent = document.getElementById('mainContent');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.saveApiKeyBtn = document.getElementById('saveApiKey');
        this.toggleVisibilityBtn = document.getElementById('toggleVisibility');
        this.statusIndicator = document.getElementById('statusIndicator');

        this.startCaptureBtn = document.getElementById('startCapture');
        this.stopCaptureBtn = document.getElementById('stopCapture');
        this.screenVideo = document.getElementById('screenVideo');
        this.captureCanvas = document.getElementById('captureCanvas');
        this.previewPlaceholder = document.getElementById('previewPlaceholder');
        this.captureIntervalSelect = document.getElementById('captureInterval');
        this.frameCountDisplay = document.getElementById('frameCount');

        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendMessageBtn = document.getElementById('sendMessage');
        this.clearChatBtn = document.getElementById('clearChat');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.popoutChatBtn = document.getElementById('popoutChat');
        this.autoAnalyzeToggle = document.getElementById('autoAnalyzeToggle');

        // State
        this.apiKey = localStorage.getItem('gemini_api_key') || '';
        this.mediaStream = null;
        this.captureIntervalId = null;
        this.frameCount = 0;
        this.isCapturing = false;
        this.lastFrameBase64 = null;
        this.conversationHistory = [];
        this.screenContext = '';
        this.previousScreenContext = '';
        this.chatPopup = null;
        this.autoAnalyze = localStorage.getItem('auto_analyze') !== 'false'; // default true
        this.isAnalyzing = false;

        // Initialize
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkStoredApiKey();
        this.autoResizeTextarea();
        this.setupBroadcastChannel();

        // Set initial toggle state
        if (this.autoAnalyzeToggle) {
            this.autoAnalyzeToggle.checked = this.autoAnalyze;
        }
    }

    setupBroadcastChannel() {
        // BroadcastChannel for communication between main window and popup
        this.channel = new BroadcastChannel('screen_vision_ai');

        this.channel.onmessage = (event) => {
            const { type, data } = event.data;

            switch (type) {
                case 'new_message':
                    this.handlePopupMessage(data);
                    break;
                case 'chat_update':
                    this.syncChatToPopup();
                    break;
                case 'request_state':
                    this.sendStateToPopup();
                    break;
                case 'popup_closed':
                    this.chatPopup = null;
                    break;
            }
        };
    }

    sendStateToPopup() {
        this.channel.postMessage({
            type: 'state_update',
            data: {
                isCapturing: this.isCapturing,
                chatHistory: this.chatMessages.innerHTML,
                apiKey: this.apiKey
            }
        });
    }

    syncChatToPopup() {
        this.channel.postMessage({
            type: 'chat_sync',
            data: {
                chatHistory: this.chatMessages.innerHTML
            }
        });
    }

    handlePopupMessage(message) {
        // Add user message from popup and process it
        this.addUserMessage(message);
        this.processUserMessage(message);
    }

    bindEvents() {
        // API Key
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.toggleVisibilityBtn.addEventListener('click', () => this.toggleApiKeyVisibility());
        this.apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveApiKey();
        });

        // Screen Capture
        this.startCaptureBtn.addEventListener('click', () => this.startScreenCapture());
        this.stopCaptureBtn.addEventListener('click', () => this.stopScreenCapture());
        this.captureIntervalSelect.addEventListener('change', () => this.updateCaptureInterval());

        // Chat
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Popout Chat
        if (this.popoutChatBtn) {
            this.popoutChatBtn.addEventListener('click', () => this.openChatPopup());
        }

        // Auto Analyze Toggle
        if (this.autoAnalyzeToggle) {
            this.autoAnalyzeToggle.addEventListener('change', (e) => {
                this.autoAnalyze = e.target.checked;
                localStorage.setItem('auto_analyze', this.autoAnalyze);
            });
        }
    }

    // ===== Chat Popup with Picture-in-Picture =====

    async openChatPopup() {
        // Try Document Picture-in-Picture API first (always on top)
        if ('documentPictureInPicture' in window) {
            try {
                const pipWindow = await window.documentPictureInPicture.requestWindow({
                    width: 400,
                    height: 550
                });

                this.chatPopup = pipWindow;
                this.setupPiPWindow(pipWindow);
                return;
            } catch (error) {
                console.log('PiP failed, falling back to popup:', error);
            }
        }

        // Fallback to regular popup
        this.openRegularPopup();
    }

    setupPiPWindow(pipWindow) {
        // Copy styles to PiP window
        const styles = document.createElement('style');
        styles.textContent = this.getPiPStyles();
        pipWindow.document.head.appendChild(styles);

        // Add Google Font
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
        fontLink.rel = 'stylesheet';
        pipWindow.document.head.appendChild(fontLink);

        // Create chat UI
        pipWindow.document.body.innerHTML = this.getPiPChatHTML();

        // Setup event listeners
        const sendBtn = pipWindow.document.getElementById('pipSendBtn');
        const input = pipWindow.document.getElementById('pipInput');
        const chatMessages = pipWindow.document.getElementById('pipMessages');

        // Sync initial chat history
        chatMessages.innerHTML = this.chatMessages.innerHTML;
        chatMessages.scrollTop = chatMessages.scrollHeight;

        sendBtn.addEventListener('click', () => {
            const msg = input.value.trim();
            if (msg) {
                this.addUserMessage(msg);
                this.processUserMessage(msg);
                input.value = '';
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });

        // Keep syncing chat
        this.pipSyncInterval = setInterval(() => {
            if (pipWindow.closed) {
                clearInterval(this.pipSyncInterval);
                this.chatPopup = null;
                return;
            }
            chatMessages.innerHTML = this.chatMessages.innerHTML;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 500);

        pipWindow.addEventListener('pagehide', () => {
            clearInterval(this.pipSyncInterval);
            this.chatPopup = null;
        });
    }

    getPiPStyles() {
        return `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', sans-serif;
                background: #0a0a0f;
                color: #fff;
                height: 100vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .pip-header {
                padding: 12px 16px;
                background: #12121a;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 14px;
            }
            .pip-header::before {
                content: '🔵';
            }
            .pip-messages {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .message { display: flex; gap: 8px; }
            .message-icon {
                width: 28px; height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                font-size: 12px;
            }
            .ai-message .message-icon,
            .system-message .message-icon {
                background: linear-gradient(135deg, #6366f1, #818cf8);
            }
            .user-message { flex-direction: row-reverse; }
            .user-message .message-icon { background: #1e1e2a; }
            .message-content {
                max-width: 85%;
                padding: 10px 14px;
                border-radius: 12px;
                font-size: 13px;
                line-height: 1.5;
            }
            .ai-message .message-content,
            .system-message .message-content {
                background: #1a1a25;
                border: 1px solid rgba(255,255,255,0.08);
            }
            .user-message .message-content {
                background: linear-gradient(135deg, #6366f1, #818cf8);
            }
            .message-content p { margin: 0; }
            .message-content code {
                background: rgba(0,0,0,0.3);
                padding: 2px 5px;
                border-radius: 4px;
                font-size: 12px;
            }
            .pip-input-area {
                padding: 12px;
                background: #12121a;
                border-top: 1px solid rgba(255,255,255,0.08);
                display: flex;
                gap: 8px;
            }
            .pip-input-area textarea {
                flex: 1;
                padding: 10px 14px;
                background: #1a1a25;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 10px;
                color: #fff;
                font-size: 13px;
                font-family: 'Inter', sans-serif;
                resize: none;
                outline: none;
            }
            .pip-input-area textarea:focus {
                border-color: rgba(99,102,241,0.5);
            }
            .pip-input-area button {
                width: 40px; height: 40px;
                background: linear-gradient(135deg, #6366f1, #818cf8);
                border: none;
                border-radius: 10px;
                color: #fff;
                cursor: pointer;
                font-size: 18px;
            }
            .pip-input-area button:hover { opacity: 0.9; }
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: #0a0a0f; }
            ::-webkit-scrollbar-thumb { background: #1e1e2a; border-radius: 3px; }
        `;
    }

    getPiPChatHTML() {
        return `
            <div class="pip-header">Screen Vision AI - Always On Top</div>
            <div class="pip-messages" id="pipMessages"></div>
            <div class="pip-input-area">
                <textarea id="pipInput" placeholder="Pergunte sobre sua tela..." rows="1"></textarea>
                <button id="pipSendBtn">➤</button>
            </div>
        `;
    }

    openRegularPopup() {
        // Check if popup already exists
        if (this.chatPopup && !this.chatPopup.closed) {
            this.chatPopup.focus();
            return;
        }

        const width = 400;
        const height = 600;
        const left = window.screen.width - width - 50;
        const top = 50;

        this.chatPopup = window.open(
            'popup.html',
            'ScreenVisionChat',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,alwaysRaised=yes`
        );

        if (!this.chatPopup) {
            alert('Por favor, permita popups para usar o chat em janela separada.');
        }
    }

    // ===== API Key Management =====

    checkStoredApiKey() {
        if (this.apiKey) {
            this.apiKeyInput.value = this.apiKey;
            this.showMainContent();
        }
    }

    saveApiKey() {
        const key = this.apiKeyInput.value.trim();
        if (!key) {
            this.showNotification('Por favor, insira uma API Key válida.', 'error');
            return;
        }

        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        this.showMainContent();
        this.updateStatus('connected', 'Conectado');
        this.showNotification('API Key salva com sucesso!', 'success');
    }

    toggleApiKeyVisibility() {
        const input = this.apiKeyInput;
        const icon = document.getElementById('eyeIcon');

        if (input.type === 'password') {
            input.type = 'text';
            icon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0112 20C5 20 1 12 1 12a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            `;
        } else {
            input.type = 'password';
            icon.innerHTML = `
                <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            `;
        }
    }

    showMainContent() {
        this.apiSection.style.display = 'none';
        this.mainContent.style.display = 'block';
    }

    // ===== Screen Capture =====

    async startScreenCapture() {
        try {
            this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor'
                },
                audio: false
            });

            this.screenVideo.srcObject = this.mediaStream;
            this.screenVideo.classList.add('active');
            this.previewPlaceholder.style.display = 'none';

            this.startCaptureBtn.style.display = 'none';
            this.stopCaptureBtn.style.display = 'flex';

            this.isCapturing = true;
            this.startPeriodicCapture();
            this.updateStatus('streaming', 'Transmitindo');

            // Handle stream end
            this.mediaStream.getVideoTracks()[0].onended = () => {
                this.stopScreenCapture();
            };

            this.addSystemMessage('🎥 Tela compartilhada! Estou analisando sua tela em tempo real e comentarei automaticamente sobre o que vejo.');

            // Send state to popup if open
            this.sendStateToPopup();

        } catch (error) {
            console.error('Error starting screen capture:', error);
            this.showNotification('Erro ao compartilhar tela. Verifique as permissões.', 'error');
        }
    }

    stopScreenCapture() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        this.screenVideo.srcObject = null;
        this.screenVideo.classList.remove('active');
        this.previewPlaceholder.style.display = 'flex';

        this.startCaptureBtn.style.display = 'flex';
        this.stopCaptureBtn.style.display = 'none';

        this.isCapturing = false;
        this.stopPeriodicCapture();
        this.updateStatus('connected', 'Conectado');
        this.lastFrameBase64 = null;

        this.addSystemMessage('⏹️ Compartilhamento de tela encerrado.');
        this.sendStateToPopup();
    }

    startPeriodicCapture() {
        const interval = parseInt(this.captureIntervalSelect.value);

        // Initial capture with automatic analysis
        setTimeout(() => this.captureAndAnalyzeFrame(true), 1500);

        // Periodic captures
        this.captureIntervalId = setInterval(() => {
            if (this.isCapturing) {
                this.captureAndAnalyzeFrame(true);
            }
        }, interval);
    }

    stopPeriodicCapture() {
        if (this.captureIntervalId) {
            clearInterval(this.captureIntervalId);
            this.captureIntervalId = null;
        }
    }

    updateCaptureInterval() {
        if (this.isCapturing) {
            this.stopPeriodicCapture();
            this.startPeriodicCapture();
        }
    }

    captureFrame() {
        const video = this.screenVideo;
        const canvas = this.captureCanvas;
        const ctx = canvas.getContext('2d');

        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64
        return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    }

    async captureAndAnalyzeFrame(autoComment = false) {
        if (!this.isCapturing || !this.screenVideo.videoWidth) return;
        if (this.isAnalyzing) return; // Prevent overlapping analyses

        try {
            this.lastFrameBase64 = this.captureFrame();
            this.frameCount++;
            this.frameCountDisplay.textContent = this.frameCount;

            // Auto-analyze and comment if enabled
            if (autoComment && this.autoAnalyze && !this.isAnalyzing) {
                await this.generateAutoComment();
            }

        } catch (error) {
            console.error('Error capturing frame:', error);
        }
    }

    async generateAutoComment() {
        if (!this.lastFrameBase64 || this.isAnalyzing) return;

        this.isAnalyzing = true;

        try {
            const prompt = `Você é um assistente visual inteligente. Analise esta captura de tela e forneça observações úteis.

REGRAS:
1. Se houver código, identifique possíveis erros ou melhorias
2. Se houver texto/documento, resuma o conteúdo principal  
3. Se houver uma aplicação/site, descreva o que o usuário parece estar fazendo
4. Se houver algo que pode ajudar o usuário, ofereça assistência proativa
5. Seja conciso (máximo 2-3 frases) mas útil
6. Se a tela parecer similar à última análise e não houver nada novo relevante, responda apenas: [SKIP]
7. Foque em informações acionáveis, não apenas descrições

Contexto anterior: ${this.previousScreenContext || 'Nenhum'}

Analise e forneça insights úteis:`;

            this.showTypingIndicator(true);

            const response = await this.callGeminiAPI(prompt, this.lastFrameBase64, true);

            this.showTypingIndicator(false);

            if (response && !response.includes('[SKIP]') && response.trim().length > 10) {
                this.addAIMessage(response);
                this.previousScreenContext = response;
                this.syncChatToPopup();
            }

        } catch (error) {
            console.error('Error generating auto comment:', error);
            this.showTypingIndicator(false);
        } finally {
            this.isAnalyzing = false;
        }
    }

    // ===== Chat Functions =====

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        // Add user message
        this.addUserMessage(message);
        this.userInput.value = '';
        this.autoResizeTextarea();

        await this.processUserMessage(message);
    }

    async processUserMessage(message) {
        // Show typing indicator
        this.showTypingIndicator(true);

        try {
            let response;

            if (this.lastFrameBase64) {
                // Include current screen frame
                const prompt = this.buildPrompt(message);
                response = await this.callGeminiAPI(prompt, this.lastFrameBase64);
            } else {
                // Text-only response
                response = await this.callGeminiAPI(message);
            }

            this.showTypingIndicator(false);

            if (response) {
                this.addAIMessage(response);
            } else {
                this.addAIMessage('Desculpe, não consegui processar sua solicitação. Tente novamente.');
            }

            // Sync to popup
            this.syncChatToPopup();

        } catch (error) {
            this.showTypingIndicator(false);
            console.error('Error sending message:', error);
            this.addAIMessage('Ocorreu um erro ao processar sua mensagem. Verifique sua API Key e conexão.');
        }
    }

    buildPrompt(userMessage) {
        let prompt = `Você é um assistente visual de alta precisão. Suas respostas devem ser CORRETAS e PRECISAS.

INSTRUÇÕES CRÍTICAS:
1. Analise a imagem da tela com MÁXIMA ATENÇÃO aos detalhes
2. Para questões de múltipla escolha, testes ou perguntas com respostas definidas, forneça a resposta CORRETA
3. Pense cuidadosamente antes de responder - verifique sua resposta mentalmente
4. Se for uma questão técnica, educacional ou de teste, seja PRECISO
5. Não invente informações - baseie-se apenas no que está visível na tela
6. Para questões de inglês, gramática ou vocabulário, aplique as regras corretamente
7. Se não tiver certeza absoluta, indique isso claramente

`;

        if (this.previousScreenContext) {
            prompt += `[Contexto anterior da tela: ${this.previousScreenContext}]\n\n`;
        }

        prompt += `PERGUNTA DO USUÁRIO: ${userMessage}\n\n`;
        prompt += `Analise cuidadosamente a imagem e responda com precisão. Se for uma questão de teste/prova, forneça a resposta correta com explicação breve.`;

        return prompt;
    }

    async callGeminiAPI(prompt, imageBase64 = null, silent = false) {
        // Use gemini-1.5-pro for maximum accuracy and capability
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`;

        const parts = [{ text: prompt }];

        if (imageBase64) {
            parts.unshift({
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64
                }
            });
        }

        const requestBody = {
            contents: [{
                parts: parts
            }],
            generationConfig: {
                temperature: 0.1,  // Low temperature for high accuracy
                topK: 1,           // Most likely token for precision
                topP: 0.8,         // Focused responses
                maxOutputTokens: 2048  // More detailed responses
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
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
                const errorData = await response.json();
                console.error('API Error:', errorData);

                if (response.status === 400) {
                    throw new Error('API Key inválida ou expirada');
                } else if (response.status === 429) {
                    throw new Error('Limite de requisições atingido. Aguarde um momento.');
                }

                throw new Error(errorData.error?.message || 'Erro na API');
            }

            const data = await response.json();

            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            }

            return null;

        } catch (error) {
            if (!silent) {
                console.error('Gemini API Error:', error);
            }
            throw error;
        }
    }

    addUserMessage(content) {
        const messageHTML = `
            <div class="message user-message">
                <div class="message-content">
                    <p>${this.escapeHtml(content)}</p>
                </div>
                <div class="message-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        `;

        this.chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
    }

    addAIMessage(content) {
        const formattedContent = this.formatMarkdown(content);

        const messageHTML = `
            <div class="message ai-message">
                <div class="message-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="message-content">
                    ${formattedContent}
                </div>
            </div>
        `;

        this.chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
    }

    addSystemMessage(content) {
        const messageHTML = `
            <div class="message system-message">
                <div class="message-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="message-content">
                    <p>${content}</p>
                </div>
            </div>
        `;

        this.chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
    }

    clearChat() {
        this.chatMessages.innerHTML = '';

        // Add initial message back
        this.addSystemMessage('Olá! Sou o Gemini. Compartilhe sua tela e eu irei analisá-la em tempo real. Vou comentar automaticamente sobre o que vejo e você pode me fazer perguntas a qualquer momento!');

        this.conversationHistory = [];
        this.previousScreenContext = '';
        this.syncChatToPopup();
    }

    // ===== UI Helpers =====

    updateStatus(status, text) {
        this.statusIndicator.className = 'status-indicator ' + status;
        this.statusIndicator.querySelector('.status-text').textContent = text;
    }

    showTypingIndicator(show) {
        this.typingIndicator.style.display = show ? 'flex' : 'none';
        if (show) this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    autoResizeTextarea() {
        this.userInput.addEventListener('input', () => {
            this.userInput.style.height = 'auto';
            this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
        });
    }

    showNotification(message, type = 'info') {
        // Simple alert for now - could be enhanced with toast notifications
        const prefix = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : 'ℹ️ ';
        alert(prefix + message);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatMarkdown(text) {
        // Basic markdown formatting
        let formatted = this.escapeHtml(text);

        // Code blocks
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return `<p>${formatted}</p>`;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ScreenVisionAI();
});
