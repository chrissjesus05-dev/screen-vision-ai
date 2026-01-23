const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Janela de chat
    openChatWindow: () => ipcRenderer.invoke('open-chat-window'),
    closeChatWindow: () => ipcRenderer.invoke('close-chat-window'),

    // Captura de tela
    getSources: () => ipcRenderer.invoke('get-sources'),

    // Comunicação entre janelas
    sendChatMessage: (message) => ipcRenderer.send('chat-message', message),
    sendChatUpdate: (data) => ipcRenderer.send('chat-update', data),
    sendAIResponse: (data) => ipcRenderer.send('ai-response', data),

    // Análise sob demanda
    requestAnalysis: () => ipcRenderer.send('request-analysis'),

    // Listeners
    onChatMessage: (callback) => ipcRenderer.on('chat-message', (_, data) => callback(data)),
    onChatUpdate: (callback) => ipcRenderer.on('chat-update', (_, data) => callback(data)),
    onAIResponse: (callback) => ipcRenderer.on('ai-response', (_, data) => callback(data)),
    onTriggerAnalysis: (callback) => ipcRenderer.on('trigger-analysis', (_, data) => callback(data)),

    // Remover listeners
    removeChatMessageListener: () => ipcRenderer.removeAllListeners('chat-message'),
    removeChatUpdateListener: () => ipcRenderer.removeAllListeners('chat-update'),
    removeAIResponseListener: () => ipcRenderer.removeAllListeners('ai-response')
});

