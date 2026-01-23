import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import './ChatSection.css';

function ChatSection({
    messages,
    isAnalyzing,
    onSendMessage,
    onClear,
    onOpenPopup,
    onAnalyze,
    isCapturing
}) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Scroll para baixo quando novas mensagens chegam
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        onSendMessage(inputValue.trim());
        setInputValue('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <section className="chat-section">
            <div className="section-header">
                <h2>💬 Respostas</h2>
                <div className="header-actions">
                    <button
                        className="btn-icon"
                        onClick={onOpenPopup}
                        title="Janela flutuante"
                    >
                        📤
                    </button>
                    <button
                        className="btn-icon"
                        onClick={onClear}
                        title="Limpar"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            <div className="chat-messages">
                {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                {isAnalyzing && (
                    <div className="typing-indicator">
                        <div className="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <span>Gemini está pensando...</span>
                    </div>
                )}

                <form className="chat-input-wrapper" onSubmit={handleSubmit}>
                    <button
                        type="button"
                        className="btn-analyze-inline"
                        onClick={onAnalyze}
                        disabled={!isCapturing || isAnalyzing}
                        title="Analisar tela"
                    >
                        🔍
                    </button>
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Faça uma pergunta sobre a análise..."
                        rows={1}
                    />
                    <button type="submit" className="btn-send" disabled={!inputValue.trim()}>
                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                            <path
                                d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </form>
            </div>
        </section>
    );
}

export default ChatSection;
