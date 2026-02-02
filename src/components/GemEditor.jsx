import { useState, useEffect } from 'react';
import './GemEditor.css';

const AVAILABLE_ICONS = ['🎓', '📚', '⚡', '🧪', '🎯', '💡', '🔥', '✨', '🚀', '💎', '🌟', '📝', '🎨', '🔮', '🏆'];

/**
 * Editor de Gems - Modal para criar/editar prompts personalizados
 */
function GemEditor({ isOpen, gem, isNew, onSave, onDelete, onClose }) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('💎');
    const [description, setDescription] = useState('');
    const [analyzePrompt, setAnalyzePrompt] = useState('');
    const [chatPrompt, setChatPrompt] = useState('');
    const [activeTab, setActiveTab] = useState('analyze');
    const [showIconPicker, setShowIconPicker] = useState(false);

    useEffect(() => {
        if (gem) {
            setName(gem.isDefault ? `${gem.name} (Cópia)` : gem.name);
            setIcon(gem.icon);
            setDescription(gem.description);
            setAnalyzePrompt(gem.analyzePrompt);
            setChatPrompt(gem.chatPrompt);
        } else {
            setName('');
            setIcon('💎');
            setDescription('');
            setAnalyzePrompt(getDefaultAnalyzePrompt());
            setChatPrompt(getDefaultChatPrompt());
        }
    }, [gem, isOpen]);

    const getDefaultAnalyzePrompt = () => `Você é um assistente especializado.

{HISTORY}

{SUBJECT_INSTRUCTION}

Analise a imagem da tela e responda:

🎯 **TIPO:** [Tipo da questão]
📌 **RESPOSTA:** [Resposta]
📝 **EXPLICAÇÃO:** [Explicação]

ANALISE:`;

    const getDefaultChatPrompt = () => `Você é um assistente prestativo.

{SUBJECT_INSTRUCTION}

Contexto: {LAST_ANALYSIS}
Histórico: {HISTORY}
Pergunta: {USER_MESSAGE}

RESPONDA:`;

    const handleSave = () => {
        if (!name.trim()) {
            alert('Por favor, insira um nome para a Gem.');
            return;
        }
        onSave({
            name: name.trim(),
            icon,
            description: description.trim(),
            analyzePrompt,
            chatPrompt
        });
    };

    if (!isOpen) return null;

    const isEditable = isNew || !gem?.isDefault;

    return (
        <div className="gem-editor-overlay" onClick={onClose}>
            <div className="gem-editor-modal" onClick={e => e.stopPropagation()}>
                <header className="gem-editor-header">
                    <h2>{isNew ? '✨ Nova Gem' : gem?.isDefault ? '📋 Duplicar Gem' : '✏️ Editar Gem'}</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </header>

                <div className="gem-editor-content">
                    {/* Info básica */}
                    <div className="gem-info-row">
                        <div className="icon-selector">
                            <button
                                className="icon-btn"
                                onClick={() => setShowIconPicker(!showIconPicker)}
                            >
                                {icon}
                            </button>
                            {showIconPicker && (
                                <div className="icon-picker">
                                    {AVAILABLE_ICONS.map(i => (
                                        <button
                                            key={i}
                                            className={`icon-option ${icon === i ? 'active' : ''}`}
                                            onClick={() => { setIcon(i); setShowIconPicker(false); }}
                                        >
                                            {i}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="gem-name-input">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nome da Gem"
                                maxLength={30}
                            />
                        </div>
                    </div>

                    <input
                        type="text"
                        className="description-input"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descrição curta (opcional)"
                        maxLength={60}
                    />

                    {/* Tabs para prompts */}
                    <div className="prompt-tabs">
                        <button
                            className={`tab ${activeTab === 'analyze' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analyze')}
                        >
                            🔍 Prompt de Análise
                        </button>
                        <button
                            className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            💬 Prompt de Chat
                        </button>
                    </div>

                    {/* Editor de prompt */}
                    <div className="prompt-editor">
                        <div className="prompt-help">
                            <span>Variáveis disponíveis:</span>
                            <code>{'{HISTORY}'}</code>
                            <code>{'{SUBJECT_INSTRUCTION}'}</code>
                            <code>{'{LAST_ANALYSIS}'}</code>
                            <code>{'{USER_MESSAGE}'}</code>
                        </div>
                        <textarea
                            value={activeTab === 'analyze' ? analyzePrompt : chatPrompt}
                            onChange={(e) => activeTab === 'analyze'
                                ? setAnalyzePrompt(e.target.value)
                                : setChatPrompt(e.target.value)
                            }
                            placeholder={`Digite o prompt de ${activeTab === 'analyze' ? 'análise' : 'chat'}...`}
                            spellCheck={false}
                        />
                    </div>
                </div>

                <footer className="gem-editor-footer">
                    {!isNew && !gem?.isDefault && (
                        <button className="btn-delete" onClick={() => onDelete(gem.id)}>
                            🗑️ Excluir
                        </button>
                    )}
                    <div className="footer-actions">
                        <button className="btn-cancel" onClick={onClose}>
                            Cancelar
                        </button>
                        <button className="btn-save" onClick={handleSave}>
                            💾 Salvar Gem
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default GemEditor;
