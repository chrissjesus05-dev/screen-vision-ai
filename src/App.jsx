import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MainScreen from './components/MainScreen';
import ChatWindow from './components/ChatWindow';
import ApiKeyScreen from './components/ApiKeyScreen';
import { isElectron, loadFromStorage } from './services/utils';
import './index.css';

function App() {
    const [apiKey, setApiKey] = useState(loadFromStorage('gemini_api_key', ''));
    const [workerUrl, setWorkerUrl] = useState(loadFromStorage('worker_url', ''));

    const isConfigured = apiKey || workerUrl;

    const handleApiKeySave = (key, worker) => {
        setApiKey(key);
        setWorkerUrl(worker);
    };

    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={
                        isConfigured ? (
                            <MainScreen apiKey={apiKey} workerUrl={workerUrl} />
                        ) : (
                            <ApiKeyScreen onSave={handleApiKeySave} />
                        )
                    }
                />
                <Route
                    path="/chat"
                    element={<ChatWindow />}
                />
            </Routes>
        </Router>
    );
}

export default App;
