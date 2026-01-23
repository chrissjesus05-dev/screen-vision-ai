import { useState } from 'react';
import { saveToStorage } from '../services/utils';
import './ApiKeyScreen.css';

function ApiKeyScreen({ onSave }) {
    const [apiKey, setApiKey] = useState('');
    const [workerUrl, setWorkerUrl] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [useWorker, setUseWorker] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (useWorker && !workerUrl) {
            alert('Por favor, insira a URL do Worker.');
            return;
        }

        if (!useWorker && !apiKey) {
            alert('Por favor, insira a API Key.');
            return;
        }

        // Salvar no localStorage
        if (apiKey) saveToStorage('gemini_api_key', apiKey);
        if (workerUrl) saveToStorage('worker_url', workerUrl);

        onSave(apiKey, workerUrl);
    };

    return (
        <div className="api-screen">
            <div className="api-card">
                <div className="api-icon">🔑</div>
                <h1>Screen Vision AI</h1>
                <p className="api-subtitle">Assistente Visual com IA</p>

                <form onSubmit={handleSubmit}>
                    <div className="toggle-mode">
                        <button
                            type="button"
                            className={`toggle-btn ${!useWorker ? 'active' : ''}`}
                            onClick={() => setUseWorker(false)}
                        >
                            API Key Direta
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn ${useWorker ? 'active' : ''}`}
                            onClick={() => setUseWorker(true)}
                        >
                            Cloudflare Worker
                        </button>
                    </div>

                    {!useWorker ? (
                        <div className="input-group">
                            <label>API Key do Gemini</label>
                            <div className="input-with-toggle">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Cole sua API Key aqui..."
                                />
                                <button
                                    type="button"
                                    className="toggle-visibility"
                                    onClick={() => setShowKey(!showKey)}
                                >
                                    {showKey ? '🙈' : '👁️'}
                                </button>
                            </div>
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="api-link"
                            >
                                Obter API Key gratuita →
                            </a>
                        </div>
                    ) : (
                        <div className="input-group">
                            <label>URL do Cloudflare Worker</label>
                            <input
                                type="text"
                                value={workerUrl}
                                onChange={(e) => setWorkerUrl(e.target.value)}
                                placeholder="https://seu-worker.workers.dev"
                            />
                            <p className="input-hint">
                                O Worker gerencia a API Key de forma segura no servidor.
                            </p>
                        </div>
                    )}

                    <button type="submit" className="btn-primary">
                        <span>Conectar</span>
                        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ApiKeyScreen;
