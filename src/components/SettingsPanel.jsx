import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomization } from '../hooks/useCustomization';
import ColorPicker from './customization/ColorPicker';
import LayoutSelector from './customization/LayoutSelector';
import './SettingsPanel.css';

const TABS = [
    { id: 'appearance', icon: '🎨', label: 'Appearance' },
    { id: 'layout', icon: '📐', label: 'Layout' },
    { id: 'audio', icon: '🎤', label: 'Audio' },
    { id: 'behavior', icon: '⚡', label: 'Behavior' },
    { id: 'advanced', icon: '🔧', label: 'Advanced' },
    { id: 'export', icon: '📤', label: 'Export/Import' }
];

function SettingsPanel({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('appearance');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showLayoutSelector, setShowLayoutSelector] = useState(false);
    const { settings, setTheme, setAccessibility, toggleFeature, setAdvanced, exportSettings, importSettings, resetToDefaults } = useCustomization();

    if (!isOpen) return null;

    const handleExport = () => {
        const json = exportSettings();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screen-vision-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const success = importSettings(event.target.result);
                    if (success) {
                        alert('Settings imported successfully!');
                    } else {
                        alert('Failed to import settings. Invalid file format.');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            resetToDefaults();
            alert('Settings reset to defaults');
        }
    };

    return (
        <>
            <motion.div
                className="settings-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="settings-dialog"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="settings-header">
                        <h2>⚙️ Settings</h2>
                        <button className="close-btn" onClick={onClose}>&times;</button>
                    </div>

                    {/* Tabs */}
                    <div className="settings-tabs">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="tab-icon">{tab.icon}</span>
                                <span className="tab-label">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="settings-content">
                        <AnimatePresence mode="wait">
                            {activeTab === 'appearance' && (
                                <AppearanceTab
                                    key="appearance"
                                    settings={settings}
                                    setTheme={setTheme}
                                    setAccessibility={setAccessibility}
                                    onOpenColorPicker={() => setShowColorPicker(true)}
                                />
                            )}
                            {activeTab === 'layout' && (
                                <LayoutTab
                                    key="layout"
                                    settings={settings}
                                    onOpenLayoutSelector={() => setShowLayoutSelector(true)}
                                />
                            )}
                            {activeTab === 'audio' && (
                                <AudioTab key="audio" settings={settings} />
                            )}
                            {activeTab === 'behavior' && (
                                <BehaviorTab
                                    key="behavior"
                                    settings={settings}
                                    toggleFeature={toggleFeature}
                                />
                            )}
                            {activeTab === 'advanced' && (
                                <AdvancedTab
                                    key="advanced"
                                    settings={settings}
                                    setAdvanced={setAdvanced}
                                />
                            )}
                            {activeTab === 'export' && (
                                <ExportTab
                                    key="export"
                                    onExport={handleExport}
                                    onImport={handleImport}
                                    onReset={handleReset}
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Close Button */}
                    <div className="settings-actions">
                        <button className="btn-primary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </motion.div>
            </motion.div>

            {/* Modals */}
            {showColorPicker && (
                <ColorPicker
                    isOpen={showColorPicker}
                    onClose={() => setShowColorPicker(false)}
                />
            )}
            {showLayoutSelector && (
                <LayoutSelector
                    isOpen={showLayoutSelector}
                    onClose={() => setShowLayoutSelector(false)}
                />
            )}
        </>
    );
}

// Tab Components
function AppearanceTab({ settings, setTheme, setAccessibility, onOpenColorPicker }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="tab-content"
        >
            <h3>Theme & Colors</h3>
            <div className="setting-group">
                <button className="btn-secondary" onClick={onOpenColorPicker}>
                    🎨 Customize Colors
                </button>
                <p className="setting-hint">Choose your theme color and generate palette</p>
            </div>

            <div className="setting-group">
                <label>Color Mode</label>
                <div className="radio-group">
                    <div
                        className={`custom-radio-option ${settings.theme.mode === 'dark' ? 'selected' : ''}`}
                        onClick={() => setTheme({ mode: 'dark' })}
                    >
                        <div className="radio-circle"></div>
                        <span>🌙 Dark</span>
                    </div>
                    <div
                        className={`custom-radio-option ${settings.theme.mode === 'light' ? 'selected' : ''}`}
                        onClick={() => setTheme({ mode: 'light' })}
                    >
                        <div className="radio-circle"></div>
                        <span>☀️ Light</span>
                    </div>
                </div>
            </div>

            <h3>Accessibility</h3>
            <div className="setting-group">
                <label>Font Size</label>
                <div className="radio-group">
                    <div
                        className={`custom-radio-option ${settings.accessibility.fontSize === 'small' ? 'selected' : ''}`}
                        onClick={() => setAccessibility('fontSize', 'small')}
                    >
                        <div className="radio-circle"></div>
                        <span>Small</span>
                    </div>
                    <div
                        className={`custom-radio-option ${settings.accessibility.fontSize === 'medium' ? 'selected' : ''}`}
                        onClick={() => setAccessibility('fontSize', 'medium')}
                    >
                        <div className="radio-circle"></div>
                        <span>Medium</span>
                    </div>
                    <div
                        className={`custom-radio-option ${settings.accessibility.fontSize === 'large' ? 'selected' : ''}`}
                        onClick={() => setAccessibility('fontSize', 'large')}
                    >
                        <div className="radio-circle"></div>
                        <span>Large</span>
                    </div>
                </div>
            </div>

            <div className="setting-group">
                <ToggleSwitch
                    label="Reduce Animations"
                    checked={settings.accessibility.reduceMotion}
                    onChange={(checked) => setAccessibility('reduceMotion', checked)}
                    hint="Minimize motion for accessibility"
                />
            </div>
        </motion.div>
    );
}

function LayoutTab({ settings, onOpenLayoutSelector }) {
    const layoutNames = {
        single: '📱 Single Column',
        sidebar: '📊 Sidebar',
        dashboard: '🎛️ Dashboard',
        minimal: '✨ Minimal'
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="tab-content"
        >
            <h3>Current Layout</h3>
            <div className="setting-group">
                <div className="current-layout-display">
                    <span className="layout-name">{layoutNames[settings.layout.type]}</span>
                </div>
                <button className="btn-secondary" onClick={onOpenLayoutSelector}>
                    📐 Change Layout
                </button>
                <p className="setting-hint">Choose from 4 preset layouts or create custom</p>
            </div>
        </motion.div>
    );
}

function AudioTab() {
    // DO NOT accept settings as prop. Use hook directly to ensure fresh state.
    const { settings, setAudioConfig } = useCustomization();

    console.log('[AudioTab] Rendered with settings:', settings);

    // Initial check to ensure structure exists
    if (!settings.audio) {
        console.warn('[AudioTab] settings.audio is missing, waiting for init...');
        return <div className="p-4">Loading audio settings...</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="tab-content"
        >
            <h3>Audio Settings</h3>

            <div className="setting-group">
                <label>Quality</label>
                <div className="radio-group" style={{ display: 'flex', gap: '12px' }}>
                    {['low', 'medium', 'high'].map(quality => {
                        const isSelected = settings.audio.quality === quality;
                        return (
                            <div
                                key={quality}
                                className={`custom-radio-option ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                    console.log('[AudioTab] Setting quality to:', quality);
                                    setAudioConfig('quality', quality);
                                }}
                                style={{
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--border-color)',
                                    background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-tertiary)',
                                }}
                            >
                                <div className="radio-circle" style={{
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    border: `2px solid ${isSelected ? 'var(--color-primary)' : '#94A3B8'}`,
                                    background: isSelected ? 'var(--color-primary)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
                                </div>
                                <span style={{ textTransform: 'capitalize' }}>{quality}</span>
                            </div>
                        );
                    })}
                </div>
                <p className="setting-hint">Higher quality uses more data and bandwidth</p>
            </div>

            <div className="setting-group">
                <label>Target Speed (for AI)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={settings.audio.speed || 1.0}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            console.log('[AudioTab] Setting speed to:', val);
                            setAudioConfig('speed', val);
                        }}
                        className="size-slider"
                        style={{ flex: 1 }}
                    />
                    <span style={{ minWidth: '40px', textAlign: 'right', fontWeight: 'bold' }}>
                        {settings.audio.speed || 1.0}x
                    </span>
                </div>
                <p className="setting-hint">Speed sent to AI to save tokens (does not affect your preview unless selected in recorder)</p>
            </div>

            <div className="setting-group">
                <ToggleSwitch
                    label="Review Before Sending"
                    checked={settings.audio.reviewBeforeSend ?? true}
                    onChange={(checked) => setAudioConfig('reviewBeforeSend', checked)}
                    hint="Listen to your recording before sending to AI"
                />
            </div>
        </motion.div>
    );
}

function BehaviorTab({ settings, toggleFeature }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="tab-content"
        >
            <h3>Features</h3>
            <div className="setting-group">
                <ToggleSwitch
                    label="Audio Recording"
                    checked={settings.features.audioRecording}
                    onChange={(checked) => toggleFeature('audioRecording', checked)}
                    hint="Enable/disable audio recording feature"
                />
            </div>
            <div className="setting-group">
                <ToggleSwitch
                    label="Screen Analysis"
                    checked={settings.features.screenAnalysis}
                    onChange={(checked) => toggleFeature('screenAnalysis', checked)}
                    hint="Enable/disable screen analysis feature"
                />
            </div>
            <div className="setting-group">
                <ToggleSwitch
                    label="Keyboard Shortcuts"
                    checked={settings.features.keyboardShortcuts}
                    onChange={(checked) => toggleFeature('keyboardShortcuts', checked)}
                    hint="Enable/disable keyboard shortcuts (Ctrl+Shift+A, etc.)"
                />
            </div>
            <div className="setting-group">
                <ToggleSwitch
                    label="Animations"
                    checked={settings.features.animations}
                    onChange={(checked) => toggleFeature('animations', checked)}
                    hint="Enable/disable UI animations"
                />
            </div>
        </motion.div>
    );
}

function AdvancedTab({ settings, setAdvanced }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="tab-content"
        >
            <h3>Advanced Settings</h3>
            <div className="setting-group">
                <ToggleSwitch
                    label="Show Technical Details"
                    checked={settings.advanced.showTechnicalDetails}
                    onChange={(checked) => setAdvanced('showTechnicalDetails', checked)}
                    hint="Display technical information and debug data"
                />
            </div>
            <div className="setting-group">
                <ToggleSwitch
                    label="Enable Gem Editor"
                    checked={settings.advanced.enableGemEditor}
                    onChange={(checked) => setAdvanced('enableGemEditor', checked)}
                    hint="Allow editing of Gem prompts and system instructions"
                />
            </div>
            <div className="setting-group">
                <ToggleSwitch
                    label="Developer Mode"
                    checked={settings.advanced.developerMode}
                    onChange={(checked) => setAdvanced('developerMode', checked)}
                    hint="Enable developer tools and debugging features"
                />
            </div>
        </motion.div>
    );
}

function ExportTab({ onExport, onImport, onReset }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="tab-content"
        >
            <h3>Backup & Restore</h3>
            <div className="setting-group">
                <button className="btn-secondary" onClick={onExport}>
                    📤 Export Settings
                </button>
                <p className="setting-hint">Save your current settings to a JSON file</p>
            </div>
            <div className="setting-group">
                <button className="btn-secondary" onClick={onImport}>
                    📥 Import Settings
                </button>
                <p className="setting-hint">Load settings from a previously exported file</p>
            </div>

            <h3 style={{ marginTop: '32px' }}>Reset</h3>
            <div className="setting-group">
                <button className="btn-danger" onClick={onReset}>
                    🔄 Reset to Defaults
                </button>
                <p className="setting-hint warning">This will reset ALL settings to factory defaults</p>
            </div>
        </motion.div>
    );
}

// Reusable Toggle Switch Component
function ToggleSwitch({ label, checked, onChange, hint }) {
    return (
        <div className="toggle-setting">
            <div className="toggle-info">
                <label>{label}</label>
                {hint && <p className="setting-hint">{hint}</p>}
            </div>
            <label className="toggle-switch">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
            </label>
        </div>
    );
}

export default SettingsPanel;
