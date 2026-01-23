/**
 * Funções utilitárias
 */

/**
 * Verifica se está rodando no Electron
 */
export function isElectron() {
    return typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
}

/**
 * Carrega valor do localStorage com fallback
 */
export function loadFromStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;

        // Tentar parsear como JSON
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    } catch {
        return defaultValue;
    }
}

/**
 * Salva valor no localStorage
 */
export function saveToStorage(key, value) {
    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
    } catch (err) {
        console.error('Error saving to storage:', err);
    }
}

/**
 * Formata markdown para HTML
 */
export function formatMarkdown(text) {
    if (!text) return '';

    return text
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Code inline
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Line breaks
        .replace(/\n/g, '<br>')
        // Emojis for ESPRO format
        .replace(/🎯/g, '<span class="emoji-badge">🎯</span>')
        .replace(/📌/g, '<span class="emoji-badge">📌</span>')
        .replace(/📝/g, '<span class="emoji-badge">📝</span>')
        .replace(/💡/g, '<span class="emoji-badge">💡</span>');
}

/**
 * Gera ID único
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
