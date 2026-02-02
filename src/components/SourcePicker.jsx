import { useState, useEffect } from 'react';
import './SourcePicker.css';

/**
 * Modal para seleção de fonte de captura no Electron
 * Mostra todas as telas e janelas disponíveis
 */
function SourcePicker({ isOpen, onClose, onSelect }) {
    const [sources, setSources] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadSources();
        }
    }, [isOpen]);

    const loadSources = async () => {
        setLoading(true);
        try {
            if (window.electronAPI?.getSources) {
                const sourcesData = await window.electronAPI.getSources();
                setSources(sourcesData);
                if (sourcesData.length > 0) {
                    setSelectedId(sourcesData[0].id);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar fontes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedId) {
            const selected = sources.find(s => s.id === selectedId);
            onSelect(selected);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="source-picker-overlay" onClick={onClose}>
            <div className="source-picker-modal" onClick={e => e.stopPropagation()}>
                <header className="source-picker-header">
                    <h2>📺 Escolha o que compartilhar</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </header>

                <div className="source-picker-content">
                    {loading ? (
                        <div className="loading">
                            <div className="loading-spinner"></div>
                            <p>Carregando fontes...</p>
                        </div>
                    ) : sources.length === 0 ? (
                        <div className="no-sources">
                            <p>Nenhuma fonte disponível</p>
                        </div>
                    ) : (
                        <div className="sources-grid">
                            {sources.map(source => (
                                <div
                                    key={source.id}
                                    className={`source-item ${selectedId === source.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedId(source.id)}
                                >
                                    <div className="source-icon">
                                        {source.id.includes('screen') ? '🖥️' : '📄'}
                                    </div>
                                    <span className="source-name">{source.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <footer className="source-picker-footer">
                    <button className="btn-cancel" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        className="btn-confirm"
                        onClick={handleConfirm}
                        disabled={!selectedId || loading}
                    >
                        Compartilhar
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default SourcePicker;
