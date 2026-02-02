import { useEffect, useState } from 'react';
import customizationService from '../services/customizationService';

/**
 * Hook to access and update customization settings
 */
export function useCustomization() {
    const [settings, setSettings] = useState(customizationService.getSettings());

    useEffect(() => {
        // Subscribe to settings changes
        const unsubscribe = customizationService.subscribe(setSettings);
        return unsubscribe;
    }, []);

    return {
        settings,
        setTheme: (theme) => customizationService.setTheme(theme),
        setLayout: (type, config) => customizationService.setLayout(type, config),
        toggleFeature: (name, enabled) => customizationService.toggleFeature(name, enabled),
        setAdvanced: (name, value) => customizationService.setAdvanced(name, value),
        setAccessibility: (name, value) => customizationService.setAccessibility(name, value),
        setAudioConfig: (name, value) => customizationService.setAudioConfig(name, value),
        exportSettings: () => customizationService.exportSettings(),
        importSettings: (json) => customizationService.importSettings(json),
        resetToDefaults: () => customizationService.resetToDefaults()
    };
}

/**
 * Hook to access theme only (optimized for components that only need theme)
 */
export function useTheme() {
    const [theme, setTheme] = useState(customizationService.getSettings().theme);

    useEffect(() => {
        const unsubscribe = customizationService.subscribe((settings) => {
            setTheme(settings.theme);
        });
        return unsubscribe;
    }, []);

    return theme;
}
