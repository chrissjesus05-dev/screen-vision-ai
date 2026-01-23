// ===== Módulo de Captura de Tela =====

import { CONFIG } from './config.js';

class ScreenCapture {
    constructor() {
        this.mediaStream = null;
        this.videoElement = null;
        this.canvas = null;
        this.ctx = null;
        this.captureInterval = null;
        this.isCapturing = false;
        this.frameCount = 0;
        this.lastFrameBase64 = null;

        this.onFrameCapture = null;  // Callback para cada frame
        this.onStop = null;          // Callback quando parar
    }

    /**
     * Inicializa o módulo com elementos DOM
     */
    init(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
    }

    /**
     * Inicia captura de tela
     */
    async startCapture() {
        try {
            // Verificar se está no Electron
            if (window.electronAPI) {
                const sources = await window.electronAPI.getSources();
                if (sources.length > 0) {
                    // Pegar a tela principal
                    const screenSource = sources.find(s => s.name === 'Entire Screen' || s.name.includes('Screen')) || sources[0];

                    this.mediaStream = await navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: {
                            mandatory: {
                                chromeMediaSource: 'desktop',
                                chromeMediaSourceId: screenSource.id
                            }
                        }
                    });
                }
            } else {
                // Navegador normal
                this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: 'always',
                        displaySurface: 'monitor'
                    },
                    audio: false
                });
            }

            if (!this.mediaStream) {
                throw new Error('Não foi possível capturar a tela');
            }

            // Configurar vídeo
            this.videoElement.srcObject = this.mediaStream;
            await this.videoElement.play();

            this.isCapturing = true;
            this.frameCount = 0;

            // Detectar quando o usuário para o compartilhamento
            this.mediaStream.getVideoTracks()[0].onended = () => {
                this.stopCapture();
            };

            return true;

        } catch (error) {
            console.error('Erro ao iniciar captura:', error);
            throw error;
        }
    }

    /**
     * Para a captura de tela
     */
    stopCapture() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }

        this.stopPeriodicCapture();
        this.isCapturing = false;
        this.lastFrameBase64 = null;

        if (this.onStop) {
            this.onStop();
        }
    }

    /**
     * Inicia captura periódica de frames (apenas para preview, sem análise automática)
     */
    startPeriodicCapture(interval = CONFIG.CAPTURE.DEFAULT_INTERVAL) {
        // Primeira captura após 1.5s (apenas preview)
        setTimeout(() => {
            if (this.isCapturing) {
                this.captureFrameForPreview();
            }
        }, 1500);

        // Capturas periódicas (apenas para manter o lastFrame atualizado, sem análise)
        this.captureInterval = setInterval(() => {
            if (this.isCapturing) {
                this.captureFrameForPreview();
            }
        }, interval);
    }

    /**
     * Captura frame apenas para preview (sem disparar callback de análise)
     */
    captureFrameForPreview() {
        if (!this.isCapturing || !this.videoElement.videoWidth) {
            return null;
        }

        try {
            this.canvas.width = this.videoElement.videoWidth;
            this.canvas.height = this.videoElement.videoHeight;
            this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

            const dataUrl = this.canvas.toDataURL(
                CONFIG.CAPTURE.IMAGE_TYPE,
                CONFIG.CAPTURE.IMAGE_QUALITY
            );

            this.lastFrameBase64 = dataUrl.split(',')[1];
            this.frameCount++;

            // NÃO chama callback - apenas atualiza o frame para uso posterior
            return this.lastFrameBase64;
        } catch (error) {
            console.error('Erro ao capturar preview:', error);
            return null;
        }
    }

    /**
     * Captura frame atual para análise sob demanda (chamado pelo botão)
     */
    captureFrameForAnalysis() {
        if (!this.isCapturing || !this.videoElement.videoWidth) {
            return null;
        }

        // Força uma nova captura para garantir frame atualizado
        this.canvas.width = this.videoElement.videoWidth;
        this.canvas.height = this.videoElement.videoHeight;
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

        const dataUrl = this.canvas.toDataURL(
            CONFIG.CAPTURE.IMAGE_TYPE,
            CONFIG.CAPTURE.IMAGE_QUALITY
        );

        this.lastFrameBase64 = dataUrl.split(',')[1];
        return this.lastFrameBase64;
    }

    /**
     * Para captura periódica
     */
    stopPeriodicCapture() {
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }
    }

    /**
     * Atualiza intervalo de captura
     */
    updateInterval(newInterval) {
        if (this.isCapturing) {
            this.stopPeriodicCapture();
            this.startPeriodicCapture(newInterval);
        }
    }

    /**
     * Captura um frame atual
     */
    captureFrame() {
        if (!this.isCapturing || !this.videoElement.videoWidth) {
            return null;
        }

        try {
            // Configura canvas com tamanho do vídeo
            this.canvas.width = this.videoElement.videoWidth;
            this.canvas.height = this.videoElement.videoHeight;

            // Desenha frame atual
            this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

            // Converte para base64
            const dataUrl = this.canvas.toDataURL(
                CONFIG.CAPTURE.IMAGE_TYPE,
                CONFIG.CAPTURE.IMAGE_QUALITY
            );

            this.lastFrameBase64 = dataUrl.split(',')[1];
            this.frameCount++;

            // Chamar callback se definido
            if (this.onFrameCapture) {
                this.onFrameCapture(this.lastFrameBase64, this.frameCount);
            }

            return this.lastFrameBase64;

        } catch (error) {
            console.error('Erro ao capturar frame:', error);
            return null;
        }
    }

    /**
     * Obtém o último frame capturado
     */
    getLastFrame() {
        return this.lastFrameBase64;
    }

    /**
     * Obtém contagem de frames
     */
    getFrameCount() {
        return this.frameCount;
    }

    /**
     * Verifica se está capturando
     */
    isActive() {
        return this.isCapturing;
    }

    /**
     * Define callback para captura de frame
     */
    setOnFrameCapture(callback) {
        this.onFrameCapture = callback;
    }

    /**
     * Define callback para quando parar
     */
    setOnStop(callback) {
        this.onStop = callback;
    }
}

// Exportar instância única
export const screenCapture = new ScreenCapture();
export default screenCapture;
