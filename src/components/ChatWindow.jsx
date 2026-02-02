import { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import { isElectron } from '../services/utils';
import './ChatWindow.css';

/**
 * Janela de chat flutuante (always on top)
 * Roteada como /chat no React Router
 * Funciona tanto em Electron quanto no navegador
 */
function ChatWindow() {
    const [messages, setMessages] = useState([
        { id: 1, role: 'system', content: '💬 Chat conectado! Esta janela permanece sempre visível.' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const channelRef = useRef(null);

    // Configurar comunicação
    useEffect(() => {
        if (isElectron() && window.electronAPI.onChatUpdate) {
            // Modo Electron
            const cleanup = window.electronAPI.onChatUpdate((data) => {
                if (data.messages) {
                    setMessages(data.messages);
                    setIsTyping(false);
                }
            });
            return cleanup;
        } else {
            // Modo navegador - usar BroadcastChannel
            channelRef.current = new BroadcastChannel('screen_vision_ai');

            channelRef.current.onmessage = (event) => {
                const { type, data } = event.data;
                if (type === 'chat_sync' && data.messages) {
                    setMessages(data.messages);
                    setIsTyping(false);
                }
            };

            // Solicitar estado atual
            channelRef.current.postMessage({ type: 'request_state' });

            return () => {
                channelRef.current?.close();
            };
        }
    }, []);

    // Scroll automático
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        const message = inputValue.trim();

        if (isElectron() && window.electronAPI.sendChatMessage) {
            window.electronAPI.sendChatMessage(message);
        } else if (channelRef.current) {
            channelRef.current.postMessage({ type: 'new_message', data: message });
        }

        setInputValue('');
        setIsTyping(true);
    };

    const handleAnalyze = () => {
        if (isElectron() && window.electronAPI.requestAnalysis) {
            window.electronAPI.requestAnalysis();
        } else if (channelRef.current) {
            channelRef.current.postMessage({ type: 'request_analysis' });
        }
        setIsTyping(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-window">
            <header className="chat-header">
                <h1>🔵 Screen Vision AI</h1>
                <div className="status-badge">
                    <span className="status-dot"></span>
                    <span>Conectado</span>
                </div>
            </header>

            <div className="chat-messages">
                {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                {isTyping && (
                    <div className="typing-indicator">
                        <div className="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <span>Gemini está pensando...</span>
                    </div>
                )}

                <div className="chat-input-wrapper">
                    <button
                        className="btn-analyze"
                        onClick={handleAnalyze}
                        title="Analisar tela"
                    >
                        🔍
                    </button>
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Pergunte sobre a tela..."
                        rows={1}
                    />
                    <button
                        className="btn-send"
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                    >
                        ➤
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatWindow;

