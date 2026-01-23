// ===== Funções Utilitárias =====

/**
 * Escapa HTML para prevenir XSS
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formata texto com markdown básico para HTML
 */
export function formatMarkdown(text) {
    let formatted = escapeHtml(text);

    // Code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Headers (h3, h4)
    formatted = formatted.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h3>$1</h3>');

    // Bullet points
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Emojis de destaque
    formatted = formatted.replace(/📌/g, '<span class="emoji-badge">📌</span>');
    formatted = formatted.replace(/📝/g, '<span class="emoji-badge">📝</span>');
    formatted = formatted.replace(/✅/g, '<span class="emoji-success">✅</span>');
    formatted = formatted.replace(/❌/g, '<span class="emoji-error">❌</span>');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Limpar BRs extras dentro de listas
    formatted = formatted.replace(/<\/li><br>/g, '</li>');
    formatted = formatted.replace(/<ul><br>/g, '<ul>');

    return formatted;
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

/**
 * Throttle function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Formata timestamp para horário legível
 */
export function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Gera ID único
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep utility
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Copia texto para clipboard
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Erro ao copiar:', error);
        return false;
    }
}

/**
 * Verifica se está rodando no Electron
 */
export function isElectron() {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
}

/**
 * Salva dados no localStorage com tratamento de erro
 */
export function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Erro ao salvar no storage:', error);
        return false;
    }
}

/**
 * Carrega dados do localStorage
 */
export function loadFromStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
        console.error('Erro ao carregar do storage:', error);
        return defaultValue;
    }
}
