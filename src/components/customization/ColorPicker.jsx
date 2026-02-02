import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { motion } from 'framer-motion';
import { useCustomization } from '../../hooks/useCustomization';
import './ColorPicker.css';

const PRESET_PALETTES = [
    {
        name: 'Professional',
        icon: '🔵',
        primary: '#4F46E5', // Indigo
        description: 'Trust and confidence'
    },
    {
        name: 'Energetic',
        icon: '🟠',
        primary: '#F97316', // Orange
        description: 'Bold and dynamic'
    },
    {
        name: 'Calm',
        icon: '🟢',
        primary: '#10B981', // Green
        description: 'Growth and balance'
    },
    {
        name: 'Minimal',
        icon: '⚫',
        primary: '#64748B', // Slate
        description: 'Clean and modern'
    },
    {
        name: 'Creative',
        icon: '🟣',
        primary: '#8B5CF6', // Purple
        description: 'Innovation and imagination'
    }
];

function ColorPicker({ isOpen, onClose }) {
    const { settings, setTheme } = useCustomization();
    const [selectedColor, setSelectedColor] = useState(settings.theme.primary);
    const [previewTheme, setPreviewTheme] = useState(null);

    if (!isOpen) return null;

    const handleColorChange = (color) => {
        setSelectedColor(color);
        // Generate palette based on selected color
        const newTheme = generatePaletteFromColor(color, settings.theme.mode);
        setPreviewTheme(newTheme);
    };

    const handlePresetClick = (preset) => {
        setSelectedColor(preset.primary);
        const newTheme = generatePaletteFromColor(preset.primary, settings.theme.mode);
        setPreviewTheme(newTheme);
    };

    const handleApply = () => {
        if (previewTheme) {
            setTheme(previewTheme);
        }
        onClose();
    };

    const handleCancel = () => {
        setPreviewTheme(null);
        setSelectedColor(settings.theme.primary);
        onClose();
    };

    return (
        <motion.div
            className="color-picker-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
        >
            <motion.div
                className="color-picker-dialog"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="color-picker-header">
                    <h2>🎨 Choose Your Theme Color</h2>
                    <button className="close-btn" onClick={handleCancel}>&times;</button>
                </div>

                <div className="color-picker-content">
                    {/* Color Wheel */}
                    <div className="color-wheel-section">
                        <HexColorPicker color={selectedColor} onChange={handleColorChange} />
                        <div className="color-value">
                            <input
                                type="text"
                                value={selectedColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                                placeholder="#000000"
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="color-preview-section">
                        <h3>Preview</h3>
                        <div
                            className="theme-preview"
                            style={{
                                '--preview-primary': previewTheme?.primary || selectedColor,
                                '--preview-secondary': previewTheme?.secondary || settings.theme.secondary,
                                '--preview-accent': previewTheme?.accent || settings.theme.accent
                            }}
                        >
                            <div className="preview-header" style={{ backgroundColor: 'var(--preview-primary)' }}>
                                Screen Vision AI
                            </div>
                            <div className="preview-body">
                                <p>This is how your app will look</p>
                                <button style={{ backgroundColor: 'var(--preview-primary)' }}>
                                    📸 Analyze
                                </button>
                                <button style={{ backgroundColor: 'var(--preview-accent)' }}>
                                    🎤 Record
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preset Palettes */}
                <div className="preset-palettes">
                    <h3>Quick Presets</h3>
                    <div className="presets-grid">
                        {PRESET_PALETTES.map((preset) => (
                            <button
                                key={preset.name}
                                className={`preset-card ${selectedColor === preset.primary ? 'active' : ''}`}
                                onClick={() => handlePresetClick(preset)}
                                style={{ '--preset-color': preset.primary }}
                            >
                                <span className="preset-icon">{preset.icon}</span>
                                <div className="preset-info">
                                    <div className="preset-name">{preset.name}</div>
                                    <div className="preset-desc">{preset.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="color-picker-actions">
                    <button className="btn-secondary" onClick={handleCancel}>
                        Cancel
                    </button>
                    <button className="btn-primary" onClick={handleApply}>
                        Apply Theme
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

/**
 * Generate complementary colors from primary using 60-30-10 rule
 * Simplified version - can be enhanced with proper HSL manipulation
 */
function generatePaletteFromColor(primary, mode) {
    // Convert hex to HSL, adjust hue/saturation, convert back
    // For now, using simplified approach
    const hsl = hexToHSL(primary);

    return {
        primary: primary,
        secondary: hslToHex(adjustHSL(hsl, 30, 0, -10)), // Shift hue +30, darken 10%
        accent: hslToHex(adjustHSL(hsl, 60, 10, 0)),     // Shift hue +60, increase saturation
        mode: mode
    };
}

// HSL color manipulation utilities
function hexToHSL(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 50 };

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(hsl) {
    let { h, s, l } = hsl;
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function adjustHSL(hsl, hShift = 0, sShift = 0, lShift = 0) {
    return {
        h: (hsl.h + hShift + 360) % 360,
        s: Math.max(0, Math.min(100, hsl.s + sShift)),
        l: Math.max(0, Math.min(100, hsl.l + lShift))
    };
}

export default ColorPicker;
