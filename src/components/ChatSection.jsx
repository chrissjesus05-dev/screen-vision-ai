import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import GemSelector from './GemSelector';
import { useCustomization } from '../hooks/useCustomization';
import './ChatSection.css';

const SUBJECTS = [
    { id: 'auto', label: '🔄 Auto', description: 'Detecta automaticamente' },
    { id: 'portugues', label: '📖 Português', description: 'Responde em português' },
    { id: 'ingles', label: '🇬🇧 Inglês', description: 'Responds in English' },
    { id: 'matematica', label: '🔢 Matemática', description: 'Foco em cálculos' },
    { id: 'logica', label: '🧩 Lógica', description: 'Foco em lógica' },
];

function ChatSection({
    messages,
    isAnalyzing,
    onSendMessage,
    onClear,
    onOpenPopup,
    onAnalyze,
    isCapturing,
    selectedSubject,
    onSubjectChange,
    gems,
    activeGemId,
    onSelectGem,
    onEditGem,
    onCreateGem
}) {
    const [inputValue, setInputValue] = useState('');
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const { settings } = useCustomization();

    // Scroll para baixo quando novas mensagens chegam
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        onSendMessage(inputValue.trim());
        setInputValue('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const activeGem = gems?.find(g => g.id === activeGemId);

    return (
        <section className="chat-section">
            <div className="section-header">
                <h2>💬 Chat</h2>
                <div className="header-actions">
                    <button
                        className="btn-icon"
                        onClick={onOpenPopup}
                        title="Abrir em janela flutuante"
                    >
                        📤
                    </button>
                    <button
                        className="btn-icon"
                        onClick={onClear}
                        title="Limpar conversa"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="chat-messages">
                {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}
                {isAnalyzing && (
                    <div className="typing-indicator-inline">
                        <div className="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <span className="typing-text">Gemini está pensando...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - SIMPLIFIED AND CLEARER */}
            <div className="chat-input-area">
                {/* Quick Actions Bar */}
                <div className="quick-actions-bar">
                    <div className="left-actions">
                        {/* Current Gem Indicator - Simplified */}
                        {activeGem && (
                            <div className="active-gem-badge" title={activeGem.name}>
                                <span className="gem-icon">{activeGem.icon || '💎'}</span>
                                <span className="gem-name">{activeGem.name}</span>
                            </div>
                        )}

                        {/* Subject Selector - Compact */}
                        <div className="compact-subject-selector">
                            <span className="subject-label">Modo:</span>
                            <select
                                value={selectedSubject}
                                onChange={(e) => onSubjectChange(e.target.value)}
                                className="subject-dropdown"
                            >
                                {SUBJECTS.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Advanced Options Toggle */}
                    <button
                        className="btn-advanced-toggle"
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        title="Opções avançadas"
                    >
                        {showAdvancedOptions ? '▼ Menos' : '▶ Mais opções'}
                    </button>
                </div>

                {/* Advanced Options Panel - Hidden by Default */}
                {showAdvancedOptions && (
                    <div className="advanced-options-panel">
                        <div className="gem-selector-wrapper">
                            <label className="options-label">Selecionar Prompt (Gem):</label>
                            <GemSelector
                                gems={gems || []}
                                activeGem={activeGem}
                                onSelect={onSelectGem}
                                onEdit={onEditGem}
                                onCreate={onCreateGem}
                            />
                        </div>
                    </div>
                )}

                {/* Main Input - LARGER AND CLEARER */}
                <form className="chat-input-form" onSubmit={handleSubmit}>
                    <div className="input-wrapper">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite sua pergunta aqui... (Enter para enviar, Shift+Enter para quebrar linha)"
                            className="chat-input-field"
                            rows={3}
                        />
                        <div className="input-actions">
                            <button
                                type="button"
                                className={`btn-analyze ${!isCapturing || isAnalyzing ? 'disabled' : ''}`}
                                onClick={onAnalyze}
                                disabled={!isCapturing || isAnalyzing}
                                title={!isCapturing ? 'Inicie a captura de tela primeiro' : 'Analisar tela atual'}
                            >
                                <span className="btn-icon">🔍</span>
                                <span className="btn-text">Analisar</span>
                            </button>
                            <button
                                type="submit"
                                className={`btn-send-message ${!inputValue.trim() ? 'disabled' : ''}`}
                                disabled={!inputValue.trim()}
                                title="Enviar mensagem"
                            >
                                <span className="btn-icon">📨</span>
                                <span className="btn-text">Enviar</span>
                            </button>
                        </div>
                    </div>
                </form>

                {/* Help Hint */}
                <div className="input-hint">
                    <span className="hint-icon">💡</span>
                    <span className="hint-text">
                        Dica: Use <kbd>Ctrl+Shift+A</kbd> para análise rápida. Gravar: <kbd>Ctrl+Shift+M</kbd>
                    </span>
                </div>
            </div>
        </section>
    );
}

export default ChatSection;
