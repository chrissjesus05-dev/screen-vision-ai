import { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import { isElectron } from '../services/utils';
import './ChatWindow.css';

/**
 * Janela de chat flutuante (always on top)
 * Roteada como /chat no React Router
 */
function ChatWindow() {
    const [messages, setMessages] = useState([
        { id: 1, role: 'system', content: '💬 Chat conectado! Esta janela permanece sempre visível.' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Receber atualizações da janela principal
    useEffect(() => {
        if (isElectron() && window.electronAPI.onChatUpdate) {
            const cleanup = window.electronAPI.onChatUpdate((data) => {
                if (data.messages) {
                    setMessages(data.messages);
                }
            });
            return cleanup;
        }
    }, []);

    // Scroll automático
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        if (isElectron() && window.electronAPI.sendChatMessage) {
            window.electronAPI.sendChatMessage(inputValue.trim());
        }

        setInputValue('');
        setIsTyping(true);
    };

    const handleAnalyze = () => {
        if (isElectron() && window.electronAPI.requestAnalysis) {
            window.electronAPI.requestAnalysis();
            setIsTyping(true);
        }
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
