import { useState, useRef, useEffect } from 'react';
import './GemSelector.css';

/**
 * Seletor de Gems (Prompts Personalizados)
 */
function GemSelector({ gems, activeGem, onSelect, onEdit, onCreate }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (gem) => {
        onSelect(gem.id);
        setIsOpen(false);
    };

    return (
        <div className="gem-selector" ref={dropdownRef}>
            <button
                className="gem-selector-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="gem-icon">{activeGem?.icon || '💎'}</span>
                <span className="gem-name">{activeGem?.name || 'Selecionar Gem'}</span>
                <span className="gem-arrow">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div className="gem-dropdown">
                    <div className="gem-dropdown-header">
                        <span>💎 Gems Disponíveis</span>
                        <button
                            className="gem-new-btn"
                            onClick={() => { onCreate(); setIsOpen(false); }}
                            title="Criar nova Gem"
                        >
                            + Nova
                        </button>
                    </div>

                    <div className="gem-list">
                        {gems.map((gem) => (
                            <div
                                key={gem.id}
                                className={`gem-item ${activeGem?.id === gem.id ? 'active' : ''}`}
                            >
                                <button
                                    className="gem-item-main"
                                    onClick={() => handleSelect(gem)}
                                >
                                    <span className="gem-item-icon">{gem.icon}</span>
                                    <div className="gem-item-info">
                                        <span className="gem-item-name">{gem.name}</span>
                                        <span className="gem-item-desc">{gem.description}</span>
                                    </div>
                                    {gem.isDefault && (
                                        <span className="gem-badge">Padrão</span>
                                    )}
                                </button>
                                <button
                                    className="gem-item-edit"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(gem);
                                        setIsOpen(false);
                                    }}
                                    title={gem.isDefault ? "Duplicar e editar" : "Editar"}
                                >
                                    ✏️
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default GemSelector;
