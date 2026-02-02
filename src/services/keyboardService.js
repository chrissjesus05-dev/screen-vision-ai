/**
 * Keyboard Shortcut Service
 * Manages global and local keyboard shortcuts
 */

class KeyboardService {
    constructor() {
        this.shortcuts = new Map();
        this.isListening = false;
    }

    /**
     * Convert key combination to string key
     */
    getShortcutKey(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.shiftKey) parts.push('Shift');
        if (event.altKey) parts.push('Alt');
        if (event.metaKey) parts.push('Meta');

        // Add the main key (not modifier keys)
        if (event.key && !['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
            parts.push(event.key.toUpperCase());
        }

        return parts.join('+');
    }

    /**
     * Register a keyboard shortcut
     */
    register(combination, callback, description = '') {
        const key = combination.toUpperCase().replace(/\s/g, '');
        this.shortcuts.set(key, { callback, description });

        if (!this.isListening) {
            this.startListening();
        }
    }

    /**
     * Unregister a shortcut
     */
    unregister(combination) {
        const key = combination.toUpperCase().replace(/\s/g, '');
        this.shortcuts.delete(key);
    }

    /**
     * Start listening for keyboard events
     */
    startListening() {
        if (this.isListening) return;

        this.handleKeyDown = (event) => {
            const key = this.getShortcutKey(event).toUpperCase();
            const shortcut = this.shortcuts.get(key);

            if (shortcut) {
                event.preventDefault();
                event.stopPropagation();
                shortcut.callback(event);
            }
        };

        document.addEventListener('keydown', this.handleKeyDown);
        this.isListening = true;
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (!this.isListening) return;

        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
        this.isListening = false;
    }

    /**
     * Get all registered shortcuts
     */
    getAllShortcuts() {
        const shortcuts = [];
        this.shortcuts.forEach((value, key) => {
            shortcuts.push({
                combination: key,
                description: value.description
            });
        });
        return shortcuts;
    }

    /**
     * Clear all shortcuts
     */
    clearAll() {
        this.shortcuts.clear();
        this.stopListening();
    }
}

export const keyboardService = new KeyboardService();
export default keyboardService;
