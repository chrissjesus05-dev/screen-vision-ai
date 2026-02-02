/**
 * Customization Service
 * Central hub for managing user preferences: themes, layouts, features
 */

// Default theme configuration
const DEFAULT_THEME = {
    primary: '#4F46E5',      // Indigo (professional)
    secondary: '#06B6D4',    // Cyan
    accent: '#F59E0B',       // Amber
    background: '#0F172A',   // Dark slate
    surface: '#1E293B',      // Lighter slate
    text: '#F1F5F9',         // Light text
    textSecondary: '#94A3B8', // Gray text
    mode: 'dark'             // 'light' | 'dark'
};

// Default customization settings
const DEFAULT_SETTINGS = {
    theme: DEFAULT_THEME,
    layout: {
        type: 'single',        // 'single' | 'sidebar' | 'dashboard' | 'minimal' | 'custom'
        customConfig: null
    },
    features: {
        audioRecording: true,
        screenAnalysis: true,
        gemSelector: true,
        subjectSelector: 'auto', // 'auto' | 'manual' | 'hidden'
        keyboardShortcuts: true,
        keyboardShortcuts: true,
        animations: true
    },
    audio: {
        quality: 'medium',      // 'low' | 'medium' | 'high'
        speed: 3.0,            // 1.0 - 5.0
        reviewBeforeSend: true // true | false
    },
    advanced: {
        showTechnicalDetails: false,
        enableGemEditor: false,
        developerMode: false
    },
    accessibility: {
        fontSize: 'medium',     // 'small' | 'medium' | 'large'
        contrast: 'normal',     // 'normal' | 'high'
        reduceMotion: false
    }
};

class CustomizationService {
    constructor() {
        this.settings = this.loadSettings();
        this.listeners = [];
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('screen-vision-customization');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure new settings are added
                return this.mergeSettings(DEFAULT_SETTINGS, parsed);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * Deep merge settings (ensures backward compatibility)
     */
    mergeSettings(defaults, saved) {
        const merged = { ...defaults };

        // Ensure critical sections exist
        merged.audio = { ...defaults.audio };
        merged.layout = { ...defaults.layout };
        merged.features = { ...defaults.features };
        merged.advanced = { ...defaults.advanced };
        merged.accessibility = { ...defaults.accessibility };

        for (const key in saved) {
            if (typeof defaults[key] === 'object' && defaults[key] !== null) {
                // If saved has this key, merge it carefully
                if (saved[key]) {
                    merged[key] = { ...merged[key], ...saved[key] };
                }
            } else {
                merged[key] = saved[key];
            }
        }

        return merged;
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('screen-vision-customization', JSON.stringify(this.settings));
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Update theme
     */
    setTheme(theme) {
        this.settings.theme = { ...this.settings.theme, ...theme };
        this.applyTheme();
        this.saveSettings();
    }

    /**
     * Apply theme to CSS variables
     */
    applyTheme() {
        const { theme } = this.settings;
        const root = document.documentElement;

        // Apply all theme colors
        root.style.setProperty('--color-primary', theme.primary);
        root.style.setProperty('--color-secondary', theme.secondary);
        root.style.setProperty('--color-accent', theme.accent);

        // Apply background and text colors based on mode
        const bgColors = this.getBackgroundColors(theme.mode);
        root.style.setProperty('--color-background', bgColors.background);
        root.style.setProperty('--color-surface', bgColors.surface);
        root.style.setProperty('--color-text', bgColors.text);
        root.style.setProperty('--color-text-secondary', bgColors.textSecondary);

        // Calculate and apply derived variables (replaces CSS color-mix() for compatibility)
        root.style.setProperty('--bg-primary', bgColors.background);
        root.style.setProperty('--bg-secondary', bgColors.surface);
        root.style.setProperty('--bg-tertiary', this.lightenColor(bgColors.surface, 0.05));
        root.style.setProperty('--bg-hover', this.lightenColor(bgColors.surface, 0.10));

        root.style.setProperty('--text-primary', bgColors.text);
        root.style.setProperty('--text-secondary', bgColors.textSecondary);
        root.style.setProperty('--text-muted', this.addAlpha(bgColors.textSecondary, 0.6));

        root.style.setProperty('--accent-primary', theme.primary);
        root.style.setProperty('--accent-secondary', theme.secondary);
        root.style.setProperty('--accent-glow', this.addAlpha(theme.primary, 0.3));

        root.style.setProperty('--border-color', this.addAlpha(bgColors.text, 0.08));

        // Add dark/light mode class
        root.setAttribute('data-theme', theme.mode);

        console.log('[CustomizationService] Theme applied:', theme);
        console.log('[CustomizationService] Computed --bg-tertiary:', this.lightenColor(bgColors.surface, 0.05));
    }

    /**
     * Lighten a hex color by a percentage
     */
    lightenColor(hex, amount) {
        // Convert hex to RGB
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        // Mix with white
        const r = Math.round(rgb.r + (255 - rgb.r) * amount);
        const g = Math.round(rgb.g + (255 - rgb.g) * amount);
        const b = Math.round(rgb.b + (255 - rgb.b) * amount);

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Add alpha channel to hex color
     */
    addAlpha(hex, alpha) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse hex
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        if (hex.length !== 6) {
            console.warn('[CustomizationService] Invalid hex color:', hex);
            return null;
        }

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return { r, g, b };
    }

    /**
     * Generate complementary colors using 60-30-10 rule
     */
    generatePalette(primaryColor) {
        // This will be enhanced with HSL calculations
        // For now, returns a basic palette
        return {
            primary: primaryColor,
            secondary: this.adjustColor(primaryColor, 30),
            accent: this.adjustColor(primaryColor, 60),
            ...this.getBackgroundColors(this.settings.theme.mode)
        };
    }

    /**
     * Adjust color hue (simplified for now)
     */
    adjustColor(color, hueShift) {
        // TODO: Implement proper HSL color manipulation
        return color;
    }

    /**
     * Get background colors based on mode
     * NOW derives from primary color instead of hardcoded values
     */
    getBackgroundColors(mode) {
        const { theme } = this.settings;
        const primaryColor = theme.primary || '#4F46E5';

        if (mode === 'dark') {
            // Dark mode: derive dark backgrounds from primary
            const hsl = this.hexToHSL(primaryColor);

            return {
                background: this.hslToHex({ h: hsl.h, s: Math.max(hsl.s - 20, 10), l: 12 }), // Very dark
                surface: this.hslToHex({ h: hsl.h, s: Math.max(hsl.s - 20, 10), l: 18 }),    // Dark
                text: '#F1F5F9',
                textSecondary: '#94A3B8'
            };
        } else {
            // Light mode: derive light backgrounds from primary
            const hsl = this.hexToHSL(primaryColor);

            return {
                background: '#FFFFFF',
                surface: this.hslToHex({ h: hsl.h, s: Math.max(hsl.s - 40, 5), l: 97 }), // Very light tint
                text: '#0F172A',
                textSecondary: '#64748B'
            };
        }
    }

    /**
     * Convert hex to HSL
     */
    hexToHSL(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return { h: 0, s: 0, l: 50 };

        let r = rgb.r / 255;
        let g = rgb.g / 255;
        let b = rgb.b / 255;

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

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    /**
     * Convert HSL to hex
     */
    hslToHex(hsl) {
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

    /**
     * Set layout type
     */
    setLayout(layoutType, customConfig = null) {
        this.settings.layout = {
            type: layoutType,
            customConfig
        };
        this.applyLayout();
        this.saveSettings();
        console.log('[CustomizationService] Layout changed to:', layoutType);
    }

    /**
     * Set custom layout with specific columns and gap
     */
    setCustomLayout(columns, gap) {
        this.settings.layout = {
            type: 'custom',
            customConfig: { columns, gap }
        };
        this.applyLayout();
        this.saveSettings();
        console.log('[CustomizationService] Custom layout applied:', { columns, gap });
    }

    /**
     * Save custom layout with name
     */
    saveCustomLayout(name, columns, gap) {
        if (!this.settings.customLayouts) {
            this.settings.customLayouts = [];
        }

        const id = Date.now().toString();
        this.settings.customLayouts.push({
            id,
            name,
            columns,
            gap
        });

        this.saveSettings();
        console.log('[CustomizationService] Custom layout saved:', name);
        return id;
    }

    /**
     * Load custom layout by ID
     */
    loadCustomLayout(id) {
        const layout = this.settings.customLayouts?.find(l => l.id === id);
        if (layout) {
            this.setCustomLayout(layout.columns, layout.gap);
            console.log('[CustomizationService] Custom layout loaded:', layout.name);
            return layout;
        }
        return null;
    }

    /**
     * Delete custom layout
     */
    deleteCustomLayout(id) {
        if (this.settings.customLayouts) {
            this.settings.customLayouts = this.settings.customLayouts.filter(l => l.id !== id);
            this.saveSettings();
            console.log('[CustomizationService] Custom layout deleted:', id);
        }
    }

    /**
     * Get all saved custom layouts
     */
    getCustomLayouts() {
        return this.settings.customLayouts || [];
    }

    /**
     * Apply layout configuration
     */
    applyLayout() {
        const { layout } = this.settings;

        // Remove all layout classes
        document.body.classList.remove('layout-single', 'layout-sidebar', 'layout-dashboard', 'layout-minimal', 'layout-custom');

        // Add current layout class
        document.body.classList.add(`layout-${layout.type}`);

        // Apply layout styles via JavaScript (bypasses CSS specificity issues)
        this.applyLayoutStyles(layout.type);

        console.log(`[CustomizationService] Applied layout class: layout-${layout.type}`);
        console.log(`[CustomizationService] Layout changed to: ${layout.type}`);
    }

    /**
     * Apply layout styles directly via JavaScript
     * This bypasses CSS specificity/cache issues
     */
    applyLayoutStyles(layoutType) {
        const contentGrid = document.querySelector('.content-grid');
        if (!contentGrid) {
            console.warn('[CustomizationService] .content-grid not found!');
            return;
        }

        // Reset styles
        contentGrid.style.removeProperty('grid-template-columns');
        contentGrid.style.removeProperty('gap');
        contentGrid.style.removeProperty('max-width');
        contentGrid.style.removeProperty('margin');

        // Custom layout
        if (layoutType === 'custom' && this.settings.layout.customConfig) {
            const { columns, gap, sectionOrder, previewHeight, chatHeight } = this.settings.layout.customConfig;
            contentGrid.style.setProperty('grid-template-columns', columns, 'important');
            contentGrid.style.setProperty('gap', `${gap}px`, 'important');

            // Get containers
            const preview = document.querySelector('.screen-preview-container');
            const chat = document.querySelector('.chat-window-container');

            // Apply section order if provided
            if (sectionOrder) {
                if (preview && sectionOrder.preview) {
                    preview.style.setProperty('order', sectionOrder.preview, 'important');
                }
                if (chat && sectionOrder.chat) {
                    chat.style.setProperty('order', sectionOrder.chat, 'important');
                }
            }

            // Apply individual heights if provided
            if (previewHeight && preview) {
                preview.style.setProperty('min-height', `${previewHeight}px`, 'important');
                preview.style.setProperty('max-height', `${previewHeight}px`, 'important');
                console.log(`[CustomizationService] Applied Preview height: ${previewHeight}px`);
            }
            if (chatHeight && chat) {
                chat.style.setProperty('min-height', `${chatHeight}px`, 'important');
                chat.style.setProperty('max-height', `${chatHeight}px`, 'important');
                console.log(`[CustomizationService] Applied Chat height: ${chatHeight}px`);
            }

            console.log(`[CustomizationService] Full custom layout applied:`, { columns, gap, sectionOrder, previewHeight, chatHeight });
            return;
        }


        // Reset order and heights for predefined layouts
        const preview = document.querySelector('.screen-preview-container');
        const chat = document.querySelector('.chat-window-container');
        if (preview) {
            preview.style.removeProperty('order');
            preview.style.removeProperty('min-height');
            preview.style.removeProperty('max-height');
        }
        if (chat) {
            chat.style.removeProperty('order');
            chat.style.removeProperty('min-height');
            chat.style.removeProperty('max-height');
        }

        // Apply layout-specific styles with !important to override CSS
        switch (layoutType) {
            case 'single':
                contentGrid.style.setProperty('grid-template-columns', '1fr 1fr', 'important');
                contentGrid.style.setProperty('gap', '16px', 'important');
                break;

            case 'sidebar':
                contentGrid.style.setProperty('grid-template-columns', '1fr 400px', 'important');
                contentGrid.style.setProperty('gap', '20px', 'important');
                break;

            case 'dashboard':
                contentGrid.style.setProperty('grid-template-columns', 'repeat(2, 1fr)', 'important');
                contentGrid.style.setProperty('gap', '16px', 'important');
                break;

            case 'minimal':
                contentGrid.style.setProperty('grid-template-columns', '1fr', 'important');
                contentGrid.style.setProperty('gap', '12px', 'important');
                contentGrid.style.setProperty('max-width', '900px', 'important');
                contentGrid.style.setProperty('margin', '0 auto', 'important');
                break;

            default:
                contentGrid.style.setProperty('grid-template-columns', '1fr 1fr', 'important');
                contentGrid.style.setProperty('gap', '16px', 'important');
        }

        console.log(`[CustomizationService] Applied ${layoutType} styles with !important:`, {
            gridTemplateColumns: contentGrid.style.gridTemplateColumns,
            gap: contentGrid.style.gap
        });
    }

    /**
     * Toggle feature
     */
    toggleFeature(featureName, enabled) {
        if (this.settings.features.hasOwnProperty(featureName)) {
            this.settings.features[featureName] = enabled;
            this.saveSettings();
            console.log('[CustomizationService] Feature toggled:', featureName, '=', enabled);
        }
    }

    /**
     * Update advanced setting
     */
    setAdvanced(settingName, value) {
        if (this.settings.advanced.hasOwnProperty(settingName)) {
            this.settings.advanced[settingName] = value;
            this.saveSettings();
            console.log('[CustomizationService] Advanced setting changed:', settingName, '=', value);
        }
    }

    /**
     * Update accessibility setting
     */
    setAccessibility(settingName, value) {
        if (this.settings.accessibility.hasOwnProperty(settingName)) {
            this.settings.accessibility[settingName] = value;

            // Apply font size immediately
            if (settingName === 'fontSize') {
                this.applyFontSize(value);
            }

            // Apply reduce motion preference
            if (settingName === 'reduceMotion') {
                this.applyReduceMotion(value);
            }

            this.saveSettings();
            console.log('[CustomizationService] Accessibility setting changed:', settingName, '=', value);
        }
    }

    /**
     * Apply font size
     */
    applyFontSize(size) {
        const root = document.documentElement;
        const sizes = {
            small: '14px',
            medium: '16px',
            large: '18px'
        };
        root.style.setProperty('--base-font-size', sizes[size] || sizes.medium);
    }

    /**
     * Apply reduce motion preference
     */
    applyReduceMotion(reduce) {
        const root = document.documentElement;
        root.style.setProperty('--animation-duration', reduce ? '0s' : '0.3s');
    }

    /**
     * Update audio settings
     */
    setAudioConfig(name, value) {
        this.settings.audio = { ...this.settings.audio, [name]: value };
        this.saveSettings();
        console.log('[CustomizationService] Audio setting changed:', name, '=', value);
    }

    /**
     * Export settings as JSON
     */
    exportSettings() {
        return JSON.stringify(this.settings, null, 2);
    }

    /**
     * Import settings from JSON
     */
    importSettings(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.settings = this.mergeSettings(DEFAULT_SETTINGS, imported);
            this.applyTheme();
            this.saveSettings();
            return true;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    }

    /**
     * Reset to defaults
     */
    resetToDefaults() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.applyTheme();
        this.saveSettings();
    }

    /**
     * Subscribe to settings changes
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of changes
     * IMPORTANT: Spreads settings to create new object reference for React reconciliation
     */
    notifyListeners() {
        this.listeners.forEach(listener => listener({ ...this.settings }));
    }

    /**
     * Initialize (apply theme on load)
     */
    initialize() {
        this.applyTheme();
        this.applyLayout();
        this.applyFontSize(this.settings.accessibility.fontSize);
        this.applyReduceMotion(this.settings.accessibility.reduceMotion);
        console.log('[CustomizationService] Initialized with settings:', this.settings);
    }
}

// Singleton instance
const customizationService = new CustomizationService();
export default customizationService;
