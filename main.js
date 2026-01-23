const { app, BrowserWindow, ipcMain, screen, desktopCapturer } = require('electron');
const path = require('path');

// Manter referência global das janelas
let mainWindow = null;
let chatWindow = null;

function createMainWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: Math.min(1400, width - 100),
        height: Math.min(900, height - 100),
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'src/assets/icon.png'),
        title: 'Screen Vision AI - ESPRO',
        backgroundColor: '#0a0a0f',
        show: false
    });

    mainWindow.loadFile('src/index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (chatWindow) {
            chatWindow.close();
        }
        app.quit();
    });
}

function createChatWindow() {
    if (chatWindow) {
        chatWindow.focus();
        return;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    chatWindow = new BrowserWindow({
        width: 420,
        height: 600,
        x: width - 450,
        y: 50,
        minWidth: 350,
        minHeight: 400,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        frame: true,
        transparent: false,
        alwaysOnTop: true,  // SEMPRE NO TOPO!
        skipTaskbar: false,
        resizable: true,
        title: 'Chat - Screen Vision AI',
        backgroundColor: '#0a0a0f'
    });

    chatWindow.loadFile('src/chat-window.html');

    // Manter sempre no topo mesmo quando perde foco
    chatWindow.setAlwaysOnTop(true, 'floating', 1);

    chatWindow.on('closed', () => {
        chatWindow = null;
    });
}

// IPC Handlers
ipcMain.handle('open-chat-window', () => {
    createChatWindow();
    return true;
});

ipcMain.handle('close-chat-window', () => {
    if (chatWindow) {
        chatWindow.close();
    }
    return true;
});

ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 0, height: 0 }
    });
    return sources.map(source => ({
        id: source.id,
        name: source.name
    }));
});

// Comunicação entre janelas
ipcMain.on('chat-message', (event, message) => {
    if (mainWindow) {
        mainWindow.webContents.send('chat-message', message);
    }
});

ipcMain.on('chat-update', (event, data) => {
    if (chatWindow) {
        chatWindow.webContents.send('chat-update', data);
    }
});

ipcMain.on('ai-response', (event, data) => {
    if (chatWindow) {
        chatWindow.webContents.send('ai-response', data);
    }
});

// Análise sob demanda (da janela de chat para a janela principal)
ipcMain.on('request-analysis', (event) => {
    if (mainWindow) {
        mainWindow.webContents.send('trigger-analysis');
    }
});

// App lifecycle
app.whenReady().then(() => {
    createMainWindow();
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});
