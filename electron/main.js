const { app, BrowserWindow, ipcMain, screen, desktopCapturer, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

// [Backend Specialist] FFmpeg for audio processing
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

// [Backend Specialist] Improved Error Handling
process.on('uncaughtException', (error) => {
    console.error('CRITICAL: Uncaught Exception in Main Process:', error);
});

// Manter referência global das janelas
let mainWindow = null;
let chatWindow = null;

// Determinar se está em desenvolvimento
const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

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
        icon: path.join(__dirname, '../public/icon.png'),
        title: 'Screen Vision AI - ESPRO',
        backgroundColor: '#0a0a0f',
        show: false
    });

    // Carregar URL do Vite em dev ou arquivo local em produção
    // [Backend Specialist] Secure loading
    try {
        if (isDev) {
            mainWindow.loadURL('http://localhost:5173');
            mainWindow.webContents.openDevTools();
        } else {
            mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        }
    } catch (e) {
        console.error('Failed to load window content:', e);
    }

    // Handle external links safely
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

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
        alwaysOnTop: true,
        skipTaskbar: false,
        resizable: true,
        title: 'Chat - Screen Vision AI',
        backgroundColor: '#0a0a0f'
    });

    // Carregar janela de chat
    if (isDev) {
        chatWindow.loadURL('http://localhost:5173/#/chat');
    } else {
        chatWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/chat' });
    }

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
    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen', 'window'],
            thumbnailSize: { width: 0, height: 0 }
        });
        return sources.map(source => ({
            id: source.id,
            name: source.name
        }));
    } catch (error) {
        console.error('Error fetching sources:', error);
        return [];
    }
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

ipcMain.on('request-analysis', (event) => {
    if (mainWindow) {
        mainWindow.webContents.send('trigger-analysis');
    }
});

// [Backend Specialist] Audio Speed-Up Handler (ffmpeg)
ipcMain.handle('speed-up-audio', async (event, dataUrl, speedMultiplier = 3.0) => {
    try {
        // Extract base64 and mime type from data URL
        const match = /^data:(.+);base64,(.+)$/.exec(dataUrl);
        if (!match) throw new Error('Invalid data URL');

        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // Extract extension from mimeType (remove codec parameters)
        // Example: "audio/webm;codecs=opus" -> "webm"
        const formatPart = mimeType.split('/')[1] || 'webm';
        const ext = formatPart.split(';')[0]; // Remove everything after semicolon

        // Create temp directory
        const tempDir = app.getPath('temp');
        const timestamp = Date.now();
        const input = path.join(tempDir, `audio_in_${timestamp}.${ext}`);
        const output = path.join(tempDir, `audio_out_${timestamp}.${ext}`);

        // Write input file
        await fs.writeFile(input, buffer);

        // Process with ffmpeg
        await new Promise((resolve, reject) => {
            // atempo only supports 0.5-2.0, so we need to chain filters for higher speeds
            let filterComplex;
            if (speedMultiplier <= 2.0) {
                filterComplex = `atempo=${speedMultiplier}`;
            } else {
                // Chain multiple atempo=2.0 filters
                const numFilters = Math.ceil(Math.log2(speedMultiplier));
                const filters = [];
                let remaining = speedMultiplier;

                for (let i = 0; i < numFilters; i++) {
                    if (remaining > 2.0) {
                        filters.push('atempo=2.0');
                        remaining /= 2.0;
                    } else {
                        filters.push(`atempo=${remaining.toFixed(2)}`);
                        break;
                    }
                }
                filterComplex = filters.join(',');
            }

            const args = [
                '-y',
                '-i', input,
                '-filter:a', filterComplex,
                output
            ];

            const ff = spawn(ffmpegPath, args);

            ff.stderr.on('data', d => console.log('[FFMPEG]', d.toString()));
            ff.on('error', reject);
            ff.on('close', code => {
                if (code === 0) resolve();
                else reject(new Error(`ffmpeg exited with code ${code}`));
            });
        });

        // Read output file
        const outBuffer = await fs.readFile(output);
        const outBase64 = outBuffer.toString('base64');
        const outDataUrl = `data:${mimeType};base64,${outBase64}`;

        // Cleanup
        await fs.unlink(input).catch(() => { });
        await fs.unlink(output).catch(() => { });

        return { success: true, dataUrl: outDataUrl };
    } catch (error) {
        console.error('ffmpeg error:', error);
        return { success: false, error: error.message };
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
