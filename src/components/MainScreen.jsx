import { useState, useEffect, useRef } from 'react';
import ScreenPreview from './ScreenPreview';
import ChatSection from './ChatSection';
import { geminiService } from '../services/gemini';
import { isElectron } from '../services/utils';
import './MainScreen.css';

function MainScreen({ apiKey, workerUrl }) {
    const [isCapturing, setIsCapturing] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'system',
            content: '🎯 **Pronto para ajudar!**\n\nCompartilhe sua tela e clique em "🔍 Analisar" quando quiser que eu analise a questão.\n\nVocê também pode me fazer perguntas de follow-up sobre a análise!'
        }
    ]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [frameBase64, setFrameBase64] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // Configurar serviço Gemini
    useEffect(() => {
        geminiService.configure(apiKey, workerUrl);
    }, [apiKey, workerUrl]);

    // Escutar trigger de análise do IPC (janela de chat)
    useEffect(() => {
        if (isElectron() && window.electronAPI.onTriggerAnalysis) {
            const cleanup = window.electronAPI.onTriggerAnalysis(() => {
                handleAnalyze();
            });
            return cleanup;
        }
    }, [isCapturing, frameBase64]);

    const startCapture = async () => {
        try {
            let stream;

            if (isElectron() && window.electronAPI.getSources) {
                const sources = await window.electronAPI.getSources();
                const screenSource = sources.find(s => s.name.includes('Screen')) || sources[0];

                stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: screenSource.id
                        }
                    }
                });
            } else {
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false
                });
            }

            streamRef.current = stream;
            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            setIsCapturing(true);

            // Listener para quando o usuário para de compartilhar
            stream.getVideoTracks()[0].onended = () => {
                stopCapture();
            };

            addMessage('system', '🎥 Tela compartilhada! Clique em "🔍 Analisar" quando quiser que eu analise.');

            // Capturar frames periodicamente para manter atualizado
            startFrameCapture();

        } catch (error) {
            console.error('Erro ao iniciar captura:', error);
            addMessage('system', '❌ Erro ao compartilhar tela. Verifique as permissões.');
        }
    };

    const stopCapture = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
        setFrameBase64(null);
        addMessage('system', '⏹️ Compartilhamento encerrado.');
    };

    const startFrameCapture = () => {
        const captureFrame = () => {
            if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setFrameBase64(dataUrl.split(',')[1]);
        };

        // Capturar a cada 2 segundos
        const intervalId = setInterval(captureFrame, 2000);

        // Primeira captura após 1s
        setTimeout(captureFrame, 1000);

        // Limpar quando parar
        return () => clearInterval(intervalId);
    };

    const handleAnalyze = async () => {
        if (isAnalyzing) {
            addMessage('system', '⏳ Aguarde, já estou analisando...');
            return;
        }

        if (!frameBase64) {
            addMessage('system', '📺 Compartilhe a tela primeiro para analisar.');
            return;
        }

        setIsAnalyzing(true);
        addMessage('system', '🔍 Analisando a tela...');

        try {
            const response = await geminiService.analyzeScreen(frameBase64);

            if (response) {
                addMessage('assistant', response);
                playNotificationSound();
                syncToChatWindow();
            } else {
                addMessage('system', '❌ Não foi possível analisar. Tente novamente.');
            }
        } catch (error) {
            console.error('Erro ao analisar:', error);
            addMessage('system', `❌ Erro: ${error.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSendMessage = async (text) => {
        addMessage('user', text);

        try {
            const response = await geminiService.sendMessage(text, frameBase64);

            if (response) {
                addMessage('assistant', response);
                syncToChatWindow();
            } else {
                addMessage('system', '❌ Não consegui processar. Tente novamente.');
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            addMessage('system', `❌ Erro: ${error.message}`);
        }
    };

    const addMessage = (role, content) => {
        setMessages(prev => [...prev, {
            id: Date.now(),
            role,
            content
        }]);
    };

    const clearMessages = () => {
        geminiService.clearHistory();
        setMessages([{
            id: Date.now(),
            role: 'system',
            content: '🧹 Conversa limpa! Estou pronto para ajudar novamente.'
        }]);
    };

    const syncToChatWindow = () => {
        if (isElectron() && window.electronAPI.sendChatUpdate) {
            window.electronAPI.sendChatUpdate({
                messages: messages,
                isCapturing
            });
        }
    };

    const openChatWindow = () => {
        if (isElectron() && window.electronAPI.openChatWindow) {
            window.electronAPI.openChatWindow();
        }
    };

    const playNotificationSound = () => {
        try {
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
        } catch (e) { }
    };

    return (
        <div className="main-screen">
            <header className="header">
                <div className="logo">
                    <div className="logo-icon">🔷</div>
                    <div className="logo-text">
                        <h1>Screen Vision AI</h1>
                        <span className="logo-subtitle">Assistente ESPRO</span>
                    </div>
                </div>
                <div className={`status-indicator ${isCapturing ? 'streaming' : 'connected'}`}>
                    <span className="status-dot"></span>
                    <span className="status-text">
                        {isCapturing ? 'Transmitindo' : 'Conectado'}
                    </span>
                </div>
            </header>

            <div className="content-grid">
                <ScreenPreview
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    isCapturing={isCapturing}
                    isAnalyzing={isAnalyzing}
                    onStartCapture={startCapture}
                    onStopCapture={stopCapture}
                    onAnalyze={handleAnalyze}
                />

                <ChatSection
                    messages={messages}
                    isAnalyzing={isAnalyzing}
                    onSendMessage={handleSendMessage}
                    onClear={clearMessages}
                    onOpenPopup={openChatWindow}
                    onAnalyze={handleAnalyze}
                    isCapturing={isCapturing}
                />
            </div>

            <footer className="footer">
                <p>Screen Vision AI • React + Electron • Powered by Google Gemini</p>
            </footer>
        </div>
    );
}

export default MainScreen;
