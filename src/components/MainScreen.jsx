import { useState, useEffect, useRef } from 'react';
import ScreenPreview from './ScreenPreview';
import ChatSection from './ChatSection';
import AudioRecorder from './AudioRecorder';
import SourcePicker from './SourcePicker';
import SettingsPanel from './SettingsPanel';
import GemEditor from './GemEditor';
import ColorPicker from './customization/ColorPicker';
import LayoutSelector from './customization/LayoutSelector';
import { geminiService } from '../services/gemini';
import { gemService } from '../services/gemService';
import { isElectron, loadFromStorage } from '../services/utils';
import { keyboardService } from '../services/keyboardService';
import { audioService } from '../services/audioService';
import customizationService from '../services/customizationService';
import './MainScreen.css';

function MainScreen({ apiKey, workerUrl, onConfigChange }) {
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
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showLayoutSelector, setShowLayoutSelector] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('auto');

    // Gems State
    const [gems, setGems] = useState([]);
    const [activeGemId, setActiveGemId] = useState('espro-default');
    const [showGemEditor, setShowGemEditor] = useState(false);
    const [editingGem, setEditingGem] = useState(null);
    const [isNewGem, setIsNewGem] = useState(false);

    // Audio State
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [audioSpeedMultiplier, setAudioSpeedMultiplier] = useState(3.0);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const audioRecorderRef = useRef(null); // Ref to control AudioRecorder from shortcuts

    // Carregar Gems
    useEffect(() => {
        setGems(gemService.getAllGems());
        setActiveGemId(gemService.loadActiveGemId());
    }, []);

    // Load audio settings from storage
    useEffect(() => {
        const savedQuality = loadFromStorage('audio_quality', 'medium');
        const savedSpeed = loadFromStorage('audio_speed', 3.0);
        setAudioSpeedMultiplier(parseFloat(savedSpeed));
    }, []);

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

    // Unified Analysis Trigger
    const handleTriggerAnalysis = () => {
        if (isCapturing && frameBase64 && !isAnalyzing) {
            handleAnalyze();
        } else if (!isCapturing) {
            addMessage('system', '⚠️ Inicie a captura de tela primeiro (botão Iniciar Captura)');
        }
    };

    // Unified Audio Recording Trigger
    const handleToggleRecording = async () => {
        if (audioRecorderRef.current) {
            audioRecorderRef.current.toggleRecording();
        } else {
            console.error('audioRecorderRef is null');
            addMessage('system', '❌ Erro interno: Gravador não conectado.');
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        // Ctrl+Shift+A: Analyze screen
        keyboardService.register('CTRL+SHIFT+A', handleTriggerAnalysis, 'Analyze screen');

        // Ctrl+Shift+M: Toggle audio recording (Microphone) - Safe from Nvidia/Browser conflicts
        keyboardService.register('CTRL+SHIFT+M', handleToggleRecording, 'Toggle audio recording');

        return () => {
            keyboardService.clearAll();
        };
    }, [isCapturing, frameBase64, isAnalyzing, isRecording]);

    // ... (keep startCapture, handleSourceSelect, initializeStream, stopCapture, startFrameCapture methods unchanged)
    // Para simplificar, vou manter a lógica de captura igual, apenas copiando as referências
    // Como o replace_file_content substitui o bloco todo, preciso reescrever ou usar os métodos originais. 
    // Vou reescrever as funções de captura aqui para garantir que não se percam.

    const startCapture = async () => {
        if (isElectron() && window.electronAPI.getSources) {
            setShowSourcePicker(true);
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false
                });
                await initializeStream(stream);
            } catch (error) {
                console.error('Erro ao iniciar captura:', error);
                addMessage('system', '❌ Erro ao compartilhar tela. Verifique as permissões.');
            }
        }
    };

    const handleSourceSelect = async (source) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id
                    }
                }
            });
            await initializeStream(stream);
        } catch (error) {
            console.error('Erro ao capturar fonte:', error);
            addMessage('system', '❌ Erro ao compartilhar a fonte selecionada.');
        }
    };

    const initializeStream = async (stream) => {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setIsCapturing(true);

        stream.getVideoTracks()[0].onended = () => {
            stopCapture();
        };

        addMessage('system', '🎥 Tela compartilhada! Clique em "🔍 Analisar" quando quiser que eu analise.');
        startFrameCapture();
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

        const intervalId = setInterval(captureFrame, 2000);
        setTimeout(captureFrame, 1000);
        return () => clearInterval(intervalId);
    };

    // --- GEM MANAGEMENT ---

    const handleSelectGem = (id) => {
        gemService.setActiveGem(id);
        setActiveGemId(id);
    };

    const handleCreateGem = () => {
        setEditingGem(null);
        setIsNewGem(true);
        setShowGemEditor(true);
    };

    const handleEditGem = (gem) => {
        setEditingGem(gem);
        setIsNewGem(false);
        setShowGemEditor(true);
    };

    const handleSaveGem = (gemData) => {
        if (isNewGem) {
            gemService.createGem(gemData);
        } else if (editingGem) {
            gemService.updateGem(editingGem.id, gemData);
        }
        setGems(gemService.getAllGems());
        setShowGemEditor(false);
    };

    const handleDeleteGem = (id) => {
        if (confirm('Tem certeza que deseja excluir esta Gem?')) {
            gemService.deleteGem(id);
            setGems(gemService.getAllGems());
            setActiveGemId(gemService.loadActiveGemId());
            setShowGemEditor(false);
        }
    };

    // --- PROMPT GENERATION ---

    const getFormattedPrompt = (type, userMessage = '') => {
        const activeGem = gems.find(g => g.id === activeGemId);
        if (!activeGem) return null;

        const template = type === 'analyze' ? activeGem.analyzePrompt : activeGem.chatPrompt;
        const historyText = messages.slice(-5)
            .filter(m => m.role !== 'system')
            .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
            .join('\n'); // History formatting matching worker logic roughly

        // Use geminiService helper to get instruction text if available, or basic map
        const subjectInstruction = geminiService.getSubjectInstruction
            ? geminiService.getSubjectInstruction(selectedSubject)
            : selectedSubject;

        return gemService.processPrompt(template, {
            history: historyText,
            subjectInstruction: subjectInstruction,
            lastAnalysis: geminiService.lastAnalysis || '',
            userMessage: userMessage
        });
    };

    const handleAnalyze = async () => {
        if (isAnalyzing) return;

        if (!frameBase64) {
            addMessage('system', '📺 Compartilhe a tela primeiro para analisar.');
            return;
        }

        setIsAnalyzing(true);
        addMessage('system', '🔍 Analisando a tela...');

        try {
            // Gerar prompt customizado baseado na Gem
            const customPrompt = getFormattedPrompt('analyze');

            const response = await geminiService.analyzeScreen(frameBase64, selectedSubject, customPrompt);

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
            // Gerar prompt customizado baseado na Gem
            const customPrompt = getFormattedPrompt('chat', text);

            const response = await geminiService.sendMessage(text, frameBase64, selectedSubject, customPrompt);

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

    // Audio Processing Handler
    const handleSendAudio = async (audioData) => {
        if (!audioData) return;

        setIsAnalyzing(true);
        addMessage('system', '🎙️ Processando áudio...');

        try {
            if (isElectron() && window.electronAPI.speedUpAudio && !audioData.isProcessed) {
                addMessage('system', `⚡ Acelerando áudio ${audioSpeedMultiplier}x...`);

                const result = await window.electronAPI.speedUpAudio(audioData.dataUrl, audioSpeedMultiplier);

                if (!result.success) throw new Error(result.error || 'ffmpeg failed');

                addMessage('system', '📤 Enviando para IA...');
                const customPrompt = getFormattedPrompt('chat', '[ÁUDIO]');
                const response = await geminiService.sendMessage(
                    'Analise este áudio.',
                    result.dataUrl,
                    selectedSubject,
                    customPrompt
                );

                if (response) {
                    addMessage('assistant', response);
                    syncToChatWindow();
                }
            } else {
                // Already processed or not in Electron
                addMessage('system', '📤 Enviando para IA...');
                // If processed, use dataUrl directly
                const dataUrlToSend = audioData.dataUrl;

                const customPrompt = getFormattedPrompt('chat', '[ÁUDIO]');
                const response = await geminiService.sendMessage(
                    'Analise este áudio.',
                    dataUrlToSend,
                    selectedSubject,
                    customPrompt
                );

                if (response) {
                    addMessage('assistant', response);
                    syncToChatWindow();
                }
            }
        } catch (error) {
            addMessage('system', `❌ ${error.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ... (playNotificationSound, etc)
    // Redefinindo helpers
    const addMessage = (role, content) => {
        setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, role, content }]);
    };

    const clearMessages = () => {
        geminiService.clearHistory();
        setMessages([{
            id: Date.now(),
            role: 'system',
            content: '🧹 Conversa limpa! Estou pronto para ajudar novamente.'
        }]);
    };

    // ... (BroadcastChannel and syncToChatWindow logic)
    const channelRef = useRef(null);

    useEffect(() => {
        if (!isElectron()) {
            channelRef.current = new BroadcastChannel('screen_vision_ai');
            channelRef.current.onmessage = (event) => {
                const { type, data } = event.data;
                if (type === 'new_message') handleSendMessage(data);
                else if (type === 'request_state') syncToChatWindow();
                else if (type === 'request_analysis') handleAnalyze();
            };
            return () => channelRef.current?.close();
        }
    }, [isElectron]); // Added dependency to suppress warning, though empty array meant run once.

    useEffect(() => { syncToChatWindow(); }, [messages]);

    const syncToChatWindow = () => {
        const data = { messages, isCapturing };
        if (isElectron() && window.electronAPI.sendChatUpdate) {
            window.electronAPI.sendChatUpdate(data);
        } else if (channelRef.current) {
            channelRef.current.postMessage({ type: 'chat_sync', data });
        }
    };

    const openChatWindow = () => {
        if (isElectron() && window.electronAPI.openChatWindow) {
            window.electronAPI.openChatWindow();
        } else {
            const width = 420; height = 600; left = window.screen.width - width - 50; top = 50;
            window.open('/#/chat', 'ScreenVisionChat', `width=${width},height=${height},left=${left},top=${top},resizable=yes`);
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
                <div className="header-right">
                    <div className={`status-indicator ${isCapturing ? 'streaming' : 'connected'}`}>
                        <span className="status-dot"></span>
                        <span className="status-text">
                            {isCapturing ? 'Transmitindo' : 'Conectado'}
                        </span>
                    </div>
                    <button
                        className="btn-theme"
                        onClick={() => setShowColorPicker(true)}
                        title="Personalizar Tema"
                    >
                        🎨
                    </button>
                    <button
                        className="btn-layout"
                        onClick={() => setShowLayoutSelector(true)}
                        title="Escolher Layout"
                    >
                        📐
                    </button>
                    <button
                        className="btn-settings"
                        onClick={() => setShowSettings(true)}
                        title="Configurações"
                    >
                        ⚙️
                    </button>
                </div>
            </header>

            <div className="content-grid">
                <div className="screen-preview-container">
                    <ScreenPreview
                        videoRef={videoRef}
                        canvasRef={canvasRef}
                        isCapturing={isCapturing}
                        isAnalyzing={isAnalyzing}
                        onStartCapture={startCapture}
                        onStopCapture={stopCapture}
                        onAnalyze={handleAnalyze}
                    />
                </div>

                <div className="chat-window-container">
                    <ChatSection
                        messages={messages}
                        isAnalyzing={isAnalyzing}
                        onSendMessage={handleSendMessage}
                        onClear={clearMessages}
                        onOpenPopup={openChatWindow}
                        onAnalyze={handleAnalyze}
                        isCapturing={isCapturing}
                        selectedSubject={selectedSubject}
                        onSubjectChange={setSelectedSubject}
                        gems={gems}
                        activeGemId={activeGemId}
                        onSelectGem={handleSelectGem}
                        onEditGem={handleEditGem}
                        onCreateGem={handleCreateGem}
                    />
                </div>
            </div>

            {/* Audio Recorder Section */}
            <div className="audio-section">
                <AudioRecorder
                    ref={audioRecorderRef}
                    onAudioReady={handleSendAudio}
                    onRecordingStateChange={setIsRecording}
                    audioQuality="medium"
                    speedMultiplier={audioSpeedMultiplier}
                />
                <div className="audio-shortcuts">
                    <button
                        className="shortcut-btn"
                        onClick={handleTriggerAnalysis}
                        title="Capturar tela e analisar (Ctrl+Shift+A)"
                    >
                        🎯 <kbd>Ctrl+Shift+A</kbd> Analisar
                    </button>
                    <button
                        className={`shortcut-btn ${isRecording ? 'recording-active' : ''}`}
                        onClick={handleToggleRecording}
                        title="Alternar gravação de áudio (Ctrl+Shift+M)"
                    >
                        {isRecording ? '⏹️ Parar Gravação' : '🎙️ Gravar Áudio'} <kbd>Ctrl+Shift+M</kbd>
                    </button>
                </div>
            </div>

            <footer className="footer">
                <p>Screen Vision AI • React + Electron • Powered by Google Gemini</p>
            </footer>

            <SourcePicker
                isOpen={showSourcePicker}
                onClose={() => setShowSourcePicker(false)}
                onSelect={handleSourceSelect}
            />

            <SettingsPanel
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onSave={onConfigChange}
                currentApiKey={apiKey}
                currentWorkerUrl={workerUrl}
            />

            {/* Modal Editor de Gem */}
            <GemEditor
                isOpen={showGemEditor}
                gem={editingGem}
                isNew={isNewGem}
                onSave={handleSaveGem}
                onDelete={handleDeleteGem}
                onClose={() => setShowGemEditor(false)}
            />

            {/* Color Picker Modal */}
            <ColorPicker
                isOpen={showColorPicker}
                onClose={() => setShowColorPicker(false)}
            />

            {/* Layout Selector Modal */}
            <LayoutSelector
                isOpen={showLayoutSelector}
                onClose={() => setShowLayoutSelector(false)}
            />
        </div>
    );
}

export default MainScreen;
