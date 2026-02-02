import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCustomization } from '../../hooks/useCustomization';
import './LayoutSelector.css';

const LAYOUT_TEMPLATES = [
    {
        id: 'single',
        name: 'Single Column',
        icon: '📱',
        description: 'Simple chat-like interface. Perfect for students and focused work.',
        preview: 'single-preview',
        recommended: ['students', 'simple tasks']
    },
    {
        id: 'sidebar',
        name: 'Sidebar',
        icon: '📊',
        description: 'Professional layout with sidebar. Best for multitasking and professionals.',
        preview: 'sidebar-preview',
        recommended: ['professionals', 'job interviews']
    },
    {
        id: 'dashboard',
        name: 'Dashboard',
        icon: '🎛️',
        description: 'Grid-based multi-panel view. For power users who need everything visible.',
        preview: 'dashboard-preview',
        recommended: ['power users', 'complex tasks']
    },
    {
        id: 'minimal',
        name: 'Minimal',
        icon: '✨',
        description: 'Distraction-free interface. Ideal for focused learning and interviews.',
        preview: 'minimal-preview',
        recommended: ['focus', 'presentations']
    }
];

function LayoutSelector({ isOpen, onClose }) {
    const { settings, setLayout } = useCustomization();
    const [selectedLayout, setSelectedLayout] = useState(settings.layout.type);
    const [showCustomBuilder, setShowCustomBuilder] = useState(false);

    // Visual controls (more accessible)
    const [previewWidthPercent, setPreviewWidthPercent] = useState(50); // 50% default
    const [previewHeight, setPreviewHeight] = useState(600); // px
    const [chatHeight, setChatHeight] = useState(600); // px

    const [customGap, setCustomGap] = useState(16);
    const [savedLayouts, setSavedLayouts] = useState([]);

    // Initialize sectionOrder from saved config or default
    const [sectionOrder, setSectionOrder] = useState(() => {
        const savedOrder = settings.layout.customConfig?.sectionOrder;
        return savedOrder || { preview: 1, chat: 2 };
    });

    if (!isOpen) return null;

    const handleSelectLayout = (layoutId) => {
        setSelectedLayout(layoutId);
    };

    const handleApply = () => {
        setLayout(selectedLayout);
        onClose();
    };

    const handleCancel = () => {
        setSelectedLayout(settings.layout.type);
        onClose();
    };

    const handleSwapSections = () => {
        console.log('[LayoutSelector] ANTES do swap:', sectionOrder);
        const newOrder = {
            preview: sectionOrder.preview === 1 ? 2 : 1,
            chat: sectionOrder.chat === 1 ? 2 : 1
        };
        console.log('[LayoutSelector] DEPOIS do swap:', newOrder);
        setSectionOrder(newOrder);
    };

    return (
        <motion.div
            className="layout-selector-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
        >
            <motion.div
                className="layout-selector-dialog"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="layout-selector-header">
                    <h2>📐 Choose Your Layout</h2>
                    <button className="close-btn" onClick={handleCancel}>&times;</button>
                </div>

                <div className="layout-selector-content">
                    <p className="layout-hint">
                        Select the layout that best fits your workflow. You can change this anytime.
                    </p>

                    <div className="layouts-grid">
                        {LAYOUT_TEMPLATES.map((layout) => (
                            <motion.button
                                key={layout.id}
                                className={`layout-card ${selectedLayout === layout.id ? 'selected' : ''}`}
                                onClick={() => handleSelectLayout(layout.id)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="layout-preview">
                                    {renderLayoutPreview(layout.id, selectedLayout === layout.id)}
                                </div>

                                <div className="layout-info">
                                    <div className="layout-header">
                                        <span className="layout-icon">{layout.icon}</span>
                                        <h3>{layout.name}</h3>
                                        {selectedLayout === layout.id && (
                                            <span className="selected-badge">✓</span>
                                        )}
                                    </div>

                                    <p className="layout-description">{layout.description}</p>

                                    <div className="layout-tags">
                                        {layout.recommended.map((tag) => (
                                            <span key={tag} className="tag">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {/* Custom Layout Builder */}
                    <div className="custom-layout-section">
                        <button
                            className="btn-custom-layout"
                            onClick={() => setShowCustomBuilder(!showCustomBuilder)}
                        >
                            {showCustomBuilder ? '📐 Hide' : '🎨 Create'} Custom Layout
                        </button>

                        {showCustomBuilder && (
                            <div className="custom-layout-builder">
                                <h3>🎨 Build Your Perfect Layout</h3>
                                <p className="builder-subtitle">Adjust sizes visually with sliders</p>

                                {/* Preview Width Slider */}
                                <div className="slider-group">
                                    <label>📺 Preview Width: <strong>{previewWidthPercent}%</strong></label>
                                    <input
                                        type="range"
                                        min="20"
                                        max="80"
                                        value={previewWidthPercent}
                                        onChange={(e) => setPreviewWidthPercent(parseInt(e.target.value))}
                                        className="size-slider"
                                    />
                                    <div className="slider-labels">
                                        <span>Small (20%)</span>
                                        <span>Medium (50%)</span>
                                        <span>Large (80%)</span>
                                    </div>
                                    <p className="slider-hint">Chat will take the remaining {100 - previewWidthPercent}%</p>
                                </div>

                                {/* Preview Height Slider */}
                                <div className="slider-group">
                                    <label>📺 Preview Height: <strong>{previewHeight}px</strong></label>
                                    <input
                                        type="range"
                                        min="300"
                                        max="900"
                                        step="50"
                                        value={previewHeight}
                                        onChange={(e) => setPreviewHeight(parseInt(e.target.value))}
                                        className="size-slider"
                                    />
                                    <div className="slider-labels">
                                        <span>Compact</span>
                                        <span>Normal</span>
                                        <span>Tall</span>
                                    </div>
                                </div>

                                {/* Chat Height Slider */}
                                <div className="slider-group">
                                    <label>💬 Chat Height: <strong>{chatHeight}px</strong></label>
                                    <input
                                        type="range"
                                        min="300"
                                        max="900"
                                        step="50"
                                        value={chatHeight}
                                        onChange={(e) => setChatHeight(parseInt(e.target.value))}
                                        className="size-slider"
                                    />
                                    <div className="slider-labels">
                                        <span>Compact</span>
                                        <span>Normal</span>
                                        <span>Tall</span>
                                    </div>
                                </div>

                                {/* Gap Slider */}
                                <div className="slider-group">
                                    <label>Spacing between sections: <strong>{customGap}px</strong></label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="50"
                                        value={customGap}
                                        onChange={(e) => setCustomGap(parseInt(e.target.value))}
                                        className="gap-slider"
                                    />
                                    <div className="slider-labels">
                                        <span>Tight</span>
                                        <span>Comfortable</span>
                                        <span>Spacious</span>
                                    </div>
                                </div>

                                {/* Section Order Control */}
                                <div className="section-order-control">
                                    <label>Section Arrangement</label>
                                    <button
                                        className="btn-swap"
                                        onClick={handleSwapSections}
                                    >
                                        🔄 Swap Preview ↔ Chat
                                    </button>
                                    <p className="order-hint">
                                        {sectionOrder.preview === 1
                                            ? '📺 Preview on Left | 💬 Chat on Right'
                                            : '💬 Chat on Left | 📺 Preview on Right'}
                                    </p>
                                </div>

                                {/* Live Preview */}
                                <div className="preview-box-large">
                                    <p className="preview-label">📋 Live Preview:</p>
                                    <div
                                        className="preview-grid-visual"
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: `${previewWidthPercent}% ${100 - previewWidthPercent}%`,
                                            gap: `${customGap}px`,
                                            height: '150px',
                                            border: '2px dashed var(--primary-color)',
                                            borderRadius: '8px',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{
                                            order: sectionOrder.preview,
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                            padding: '8px'
                                        }}>
                                            <div>📺 Preview</div>
                                            <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>
                                                {previewWidthPercent}% × {previewHeight}px
                                            </div>
                                        </div>
                                        <div style={{
                                            order: sectionOrder.chat,
                                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                            padding: '8px'
                                        }}>
                                            <div>💬 Chat</div>
                                            <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>
                                                {100 - previewWidthPercent}% × {chatHeight}px
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="custom-actions">
                                    <button
                                        className="btn-primary btn-large"
                                        onClick={() => {
                                            // Convert visual values to grid template
                                            const columns = `${previewWidthPercent}% ${100 - previewWidthPercent}%`;
                                            const rows = 'auto';

                                            setLayout('custom', {
                                                columns,
                                                rows,
                                                gap: customGap,
                                                sectionOrder,
                                                previewHeight,
                                                chatHeight
                                            });
                                            setSelectedLayout('custom');
                                            onClose();
                                        }}
                                    >
                                        ✅ Apply This Layout
                                    </button>
                                </div>

                                <p className="builder-hint">
                                    💡 Tip: Use the preset buttons for quick layouts, or adjust spacing to your preference
                                </p>
                            </div>
                        )}

                        <p className="custom-hint">
                            {showCustomBuilder ? 'Design your perfect workspace' : 'Build a layout tailored to your needs'}
                        </p>
                    </div>
                </div>

                <div className="layout-selector-actions">
                    <button className="btn-secondary" onClick={handleCancel}>
                        Cancel
                    </button>
                    <button className="btn-primary" onClick={handleApply}>
                        Apply Layout
                    </button>
                </div>
            </motion.div>
        </motion.div >
    );
}

/**
 * Render layout preview SVG/visual representation
 */
function renderLayoutPreview(layoutId, isSelected) {
    const baseColor = isSelected ? 'var(--color-primary)' : '#64748B';
    const bgColor = isSelected ? 'rgba(79, 70, 229, 0.1)' : 'rgba(255, 255, 255, 0.05)';

    switch (layoutId) {
        case 'single':
            return (
                <svg viewBox="0 0 200 150" className="preview-svg">
                    <rect x="10" y="10" width="180" height="130" rx="8" fill={bgColor} stroke={baseColor} strokeWidth="2" />
                    <rect x="20" y="20" width="160" height="20" rx="4" fill={baseColor} opacity="0.5" />
                    <rect x="20" y="50" width="160" height="15" rx="4" fill={baseColor} opacity="0.3" />
                    <rect x="20" y="75" width="160" height="15" rx="4" fill={baseColor} opacity="0.3" />
                    <rect x="20" y="100" width="160" height="15" rx="4" fill={baseColor} opacity="0.3" />
                </svg>
            );

        case 'sidebar':
            return (
                <svg viewBox="0 0 200 150" className="preview-svg">
                    <rect x="10" y="10" width="60" height="130" rx="8" fill={baseColor} opacity="0.3" />
                    <rect x="80" y="10" width="110" height="130" rx="8" fill={bgColor} stroke={baseColor} strokeWidth="2" />
                    <rect x="15" y="15" width="50" height="10" rx="2" fill={baseColor} opacity="0.6" />
                    <rect x="15" y="30" width="50" height="8" rx="2" fill={baseColor} opacity="0.4" />
                    <rect x="15" y="43" width="50" height="8" rx="2" fill={baseColor} opacity="0.4" />
                    <rect x="90" y="20" width="90" height="15" rx="4" fill={baseColor} opacity="0.5" />
                    <rect x="90" y="45" width="90" height="10" rx="4" fill={baseColor} opacity="0.3" />
                </svg>
            );

        case 'dashboard':
            return (
                <svg viewBox="0 0 200 150" className="preview-svg">
                    <rect x="10" y="10" width="85" height="60" rx="6" fill={baseColor} opacity="0.3" />
                    <rect x="105" y="10" width="85" height="60" rx="6" fill={baseColor} opacity="0.3" />
                    <rect x="10" y="80" width="85" height="60" rx="6" fill={baseColor} opacity="0.3" />
                    <rect x="105" y="80" width="85" height="60" rx="6" fill={bgColor} stroke={baseColor} strokeWidth="2" />
                    <rect x="15" y="15" width="75" height="8" rx="2" fill={baseColor} opacity="0.6" />
                    <rect x="110" y="15" width="75" height="8" rx="2" fill={baseColor} opacity="0.6" />
                </svg>
            );

        case 'minimal':
            return (
                <svg viewBox="0 0 200 150" className="preview-svg">
                    <rect x="40" y="40" width="120" height="70" rx="8" fill={bgColor} stroke={baseColor} strokeWidth="2" />
                    <rect x="50" y="50" width="100" height="12" rx="4" fill={baseColor} opacity="0.5" />
                    <rect x="50" y="70" width="100" height="8" rx="4" fill={baseColor} opacity="0.3" />
                    <rect x="50" y="85" width="100" height="8" rx="4" fill={baseColor} opacity="0.3" />
                </svg>
            );

        default:
            return null;
    }
}

export default LayoutSelector;
