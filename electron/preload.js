const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer (React)
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

    // Audio processing
    speedUpAudio: (dataUrl, speedMultiplier) => ipcRenderer.invoke('speed-up-audio', dataUrl, speedMultiplier),

    // Listeners
    onChatMessage: (callback) => {
        ipcRenderer.on('chat-message', (_, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('chat-message');
    },
    onChatUpdate: (callback) => {
        ipcRenderer.on('chat-update', (_, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('chat-update');
    },
    onAIResponse: (callback) => {
        ipcRenderer.on('ai-response', (_, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('ai-response');
    },
    onTriggerAnalysis: (callback) => {
        ipcRenderer.on('trigger-analysis', (_, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('trigger-analysis');
    },

    // Verificar se está no Electron
    isElectron: true
});
