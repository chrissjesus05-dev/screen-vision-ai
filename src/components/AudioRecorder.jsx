import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { audioService } from '../services/audioService';
import { useCustomization } from '../hooks/useCustomization';
import './AudioRecorder.css';

const AudioRecorder = forwardRef(({ onAudioReady, onRecordingStateChange, audioQuality, speedMultiplier }, ref) => {
    const { settings } = useCustomization();

    const config = {
        quality: audioQuality || settings.audio?.quality || 'medium',
        speed: speedMultiplier !== undefined ? speedMultiplier : (settings.audio?.speed || 1.0),
        reviewBeforeSend: settings.audio?.reviewBeforeSend ?? true
    };

    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Audio State
    const [audioDevices, setAudioDevices] = useState([]);
    const [outputDevices, setOutputDevices] = useState([]); // Speakers
    const [primaryDeviceId, setPrimaryDeviceId] = useState('');
    const [secondaryDeviceId, setSecondaryDeviceId] = useState(''); // For System/Cable
    const [monitorDeviceId, setMonitorDeviceId] = useState(''); // Target for monitoring
    const [monitorSystem, setMonitorSystem] = useState(false);

    // Gain State (Volume)
    const [micGain, setMicGain] = useState(1.0);
    const [systemGain, setSystemGain] = useState(1.0);

    // Levels
    const [primaryLevel, setPrimaryLevel] = useState(0);
    const [secondaryLevel, setSecondaryLevel] = useState(0);

    // Review State
    const [reviewMode, setReviewMode] = useState(false);
    const [audioBlobUrl, setAudioBlobUrl] = useState(null);
    const [recordedData, setRecordedData] = useState(null);
    const [duration, setDuration] = useState(0);

    const durationIntervalRef = useRef(null);
    const audioContextRef = useRef(null);
    const animationFrameRef = useRef(null);
    const audioRef = useRef(null);
    const monitoringAudioRef = useRef(new Audio()); // Hidden audio for monitoring

    // Gain Refs (for real-time updates)
    const micGainNodeRef = useRef(null);
    const systemGainNodeRef = useRef(null);

    // Visualizer Refs
    const visualizerRef1 = useRef(null);
    const visualizerRef2 = useRef(null);

    // Monitoring Dest Ref
    const monitorDestRef = useRef(null);

    // Expose toggle function
    useImperativeHandle(ref, () => ({
        toggleRecording: handleToggleRecording
    }));

    // --- Effects ---

    // 1. Fetch Devices (Run Once)
    useEffect(() => {
        const init = async () => {
            try {
                // Initial permission request
                const s = await navigator.mediaDevices.getUserMedia({ audio: true });
                s.getTracks().forEach(t => t.stop());

                const devices = await navigator.mediaDevices.enumerateDevices();

                // Inputs
                const inputs = devices.filter(d => d.kind === 'audioinput');
                setAudioDevices(inputs);
                if (inputs.length > 0 && !primaryDeviceId) {
                    const defaultDevice = inputs.find(d => d.deviceId === 'default');
                    setPrimaryDeviceId(defaultDevice ? defaultDevice.deviceId : inputs[0].deviceId);
                }

                // Outputs
                const outputs = devices.filter(d => d.kind === 'audiooutput');
                setOutputDevices(outputs);
                if (outputs.length > 0 && !monitorDeviceId) {
                    const defaultOut = outputs.find(d => d.deviceId === 'default');
                    setMonitorDeviceId(defaultOut ? defaultOut.deviceId : outputs[0].deviceId);
                }

            } catch (e) { console.error(e); }
        };
        init();
    }, []);

    // Gain Updates (Low-cost)
    useEffect(() => {
        if (micGainNodeRef.current && audioContextRef.current) {
            micGainNodeRef.current.gain.setTargetAtTime(micGain, audioContextRef.current.currentTime, 0.1);
        }
    }, [micGain]);

    useEffect(() => {
        if (systemGainNodeRef.current && audioContextRef.current) {
            systemGainNodeRef.current.gain.setTargetAtTime(systemGain, audioContextRef.current.currentTime, 0.1);
        }
    }, [systemGain]);

    // Monitoring Output Device Change
    useEffect(() => {
        if (monitoringAudioRef.current && monitorDeviceId) {
            if (typeof monitoringAudioRef.current.setSinkId === 'function') {
                monitoringAudioRef.current.setSinkId(monitorDeviceId)
                    .catch(e => console.warn("Failed to set sinkId", e));
            }
        }
    }, [monitorDeviceId]);

    // 2. Main Audio Graph Mix (Separated from Monitor Toggle)
    useEffect(() => {
        let activeContext = null;
        let animationId = null;
        let localStream1 = null;
        let localStream2 = null;
        let currentVol1 = 0;
        let currentVol2 = 0;

        const startAudioGraph = async () => {
            if (!primaryDeviceId) return;
            console.log('[Audio] Building Graph for:', primaryDeviceId);

            try {
                // Audio Context Setup
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                const ctx = new AudioContextClass();
                activeContext = ctx;
                audioContextRef.current = ctx; // Store for gain updates

                if (ctx.state === 'suspended') await ctx.resume();

                // 1. Primary Stream (Mic)
                const constraints1 = {
                    audio: {
                        deviceId: { exact: primaryDeviceId },
                        echoCancellation: false, noiseSuppression: false, autoGainControl: false
                    }
                };
                localStream1 = await navigator.mediaDevices.getUserMedia(constraints1);

                const source1 = ctx.createMediaStreamSource(localStream1);
                const gain1 = ctx.createGain();
                gain1.gain.value = micGain;
                micGainNodeRef.current = gain1;

                const analyser1 = ctx.createAnalyser();
                analyser1.fftSize = 512;
                analyser1.smoothingTimeConstant = 0.4; // Smoother

                source1.connect(gain1);
                gain1.connect(analyser1);

                // 2. Secondary Stream (System/Cable)
                let analyser2 = null;
                let gain2 = null;
                let source2 = null;

                if (secondaryDeviceId && secondaryDeviceId !== primaryDeviceId) {
                    try {
                        localStream2 = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                deviceId: { exact: secondaryDeviceId },
                                echoCancellation: false, noiseSuppression: false, autoGainControl: false
                            }
                        });
                        source2 = ctx.createMediaStreamSource(localStream2);

                        gain2 = ctx.createGain();
                        gain2.gain.value = systemGain;
                        systemGainNodeRef.current = gain2;

                        analyser2 = ctx.createAnalyser();
                        analyser2.fftSize = 512;
                        analyser2.smoothingTimeConstant = 0.4;

                        source2.connect(gain2);
                        gain2.connect(analyser2);

                        // Setup Monitoring Destination (Always connected, managed by srcObject logic)
                        const mDest = ctx.createMediaStreamDestination();
                        gain2.connect(mDest);
                        monitorDestRef.current = mDest;

                    } catch (e) {
                        console.warn("Sec stream error", e);
                    }
                } else {
                    monitorDestRef.current = null;
                }

                // 3. Merging (Main Recording Destination)
                const dest = ctx.createMediaStreamDestination();
                gain1.connect(dest);
                if (gain2) gain2.connect(dest);

                audioRef.current = { stream: dest.stream };
                console.log('[Audio] Graph Ready. Stream active.');

                // 4. Visualizer Loop
                const dataArray1 = new Uint8Array(analyser1.frequencyBinCount);
                const dataArray2 = analyser2 ? new Uint8Array(analyser2.frequencyBinCount) : null;

                const updateLevels = () => {
                    if (!activeContext) return;

                    // --- Mic Visualizer ---
                    analyser1.getByteFrequencyData(dataArray1);
                    const avg1 = dataArray1.reduce((a, b) => a + b, 0) / dataArray1.length;
                    const target1 = Math.min(100, (avg1 / 48) * 100);
                    currentVol1 += (target1 - currentVol1) * 0.2;

                    if (visualizerRef1.current) {
                        visualizerRef1.current.style.width = `${Math.max(2, currentVol1)}%`;
                        const hue = Math.max(0, 120 - currentVol1);
                        visualizerRef1.current.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;
                        visualizerRef1.current.style.boxShadow = currentVol1 > 10 ? `0 0 ${currentVol1 / 5}px hsl(${hue}, 80%, 50%)` : 'none';
                    }

                    // --- System Visualizer ---
                    if (analyser2 && dataArray2) {
                        analyser2.getByteFrequencyData(dataArray2);
                        const avg2 = dataArray2.reduce((a, b) => a + b, 0) / dataArray2.length;
                        const target2 = Math.min(100, (avg2 / 48) * 100);
                        currentVol2 += (target2 - currentVol2) * 0.2;

                        if (visualizerRef2.current) {
                            visualizerRef2.current.style.width = `${Math.max(2, currentVol2)}%`;
                            const lightness = 50 + (currentVol2 / 4);
                            visualizerRef2.current.style.backgroundColor = `hsl(210, 90%, ${lightness}%)`;
                            visualizerRef2.current.style.boxShadow = currentVol2 > 10 ? `0 0 ${currentVol2 / 5}px hsl(210, 90%, ${lightness}%)` : 'none';
                        }
                    } else if (visualizerRef2.current) {
                        visualizerRef2.current.style.width = '2%';
                        visualizerRef2.current.style.backgroundColor = '#475569';
                    }

                    animationId = requestAnimationFrame(updateLevels);
                };
                updateLevels();

            } catch (error) {
                console.error("Monitoring error:", error);
            }
        };

        startAudioGraph();

        return () => {
            console.log('[Audio] Cleaning up Graph');
            if (animationId) cancelAnimationFrame(animationId);
            if (activeContext) activeContext.close();
            if (localStream1) localStream1.getTracks().forEach(t => t.stop());
            if (localStream2) localStream2.getTracks().forEach(t => t.stop());
            monitorDestRef.current = null;
        };
    }, [primaryDeviceId, secondaryDeviceId]); // Does NOT depend on monitorSystem!

    // 3. Monitor Toggle Effect (Dynamic, cheap)
    useEffect(() => {
        if (!monitorSystem) {
            if (monitoringAudioRef.current) {
                monitoringAudioRef.current.pause();
                monitoringAudioRef.current.srcObject = null;
            }
            return;
        }

        // Enable
        if (monitorSystem && monitorDestRef.current && monitoringAudioRef.current) {
            console.log('[Audio] Enabling Monitor Passthrough');
            monitoringAudioRef.current.srcObject = monitorDestRef.current.stream;
            monitoringAudioRef.current.play().catch(e => console.warn("Monitor Play Error", e));
        } else {
            // Retry if graph is rebuilding? Generally graph effect runs first.
        }
    }, [monitorSystem, secondaryDeviceId]); // Re-check if graph likely changed

    // 4. Recording Timer
    useEffect(() => {
        if (isRecording) {
            durationIntervalRef.current = setInterval(() => {
                setDuration(audioService.getRecordingDuration());
            }, 100);
        } else {
            clearInterval(durationIntervalRef.current);
        }
        return () => clearInterval(durationIntervalRef.current);
    }, [isRecording]);

    // --- Audio Logic ---

    const handleToggleRecording = async () => {
        if (!isRecording) {
            try {
                if (!audioRef.current || !audioRef.current.stream) {
                    // Retry logic? or just warn.
                    console.warn('[Audio] Stream not ready. Ref:', audioRef.current);
                    if (primaryDeviceId) {
                        // Wait 500ms and try again? 
                        // For now, let's just throw, but the logs will help.
                        throw new Error("Inicializando áudio... Aguarde 2 segundos e tente novamente.");
                    }
                    throw new Error("Selecione um dispositivo de áudio primeiro.");
                }

                const mixedStream = audioRef.current.stream;

                await audioService.startRecording(config.quality, mixedStream);
                setIsRecording(true);
                onRecordingStateChange?.(true);

            } catch (error) {
                console.error('Failed to start recording:', error);
                alert('Erro: ' + error.message);
            }
        } else {
            // Stop
            try {
                const audioData = await audioService.stopRecording();
                setIsRecording(false);
                onRecordingStateChange?.(false);

                if (audioData) {
                    if (config.reviewBeforeSend) {
                        setAudioBlobUrl(URL.createObjectURL(audioData.blob));
                        setRecordedData(audioData);
                        setReviewMode(true);
                        setDuration(audioData.duration);
                    } else {
                        await processAndSend(audioData);
                    }
                }
            } catch (error) {
                console.error('Failed to stop recording:', error);
                alert('Erro: ' + error.message);
            }
        }
    };

    const processAndSend = async (data) => {
        setIsProcessing(true);
        try {
            let finalData = data;
            if (config.speed > 1.0) {
                const processedDataUrl = await audioService.processAudio(data.dataUrl, config.speed);
                const res = await fetch(processedDataUrl);
                const blob = await res.blob();

                finalData = {
                    ...data,
                    dataUrl: processedDataUrl,
                    blob: blob,
                    isProcessed: true
                };
            }
            onAudioReady?.(finalData);
        } catch (error) {
            alert(`Falha ao processar: ${error.message}`);
        } finally {
            setIsProcessing(false);
            if (reviewMode) handleDiscard();
        }
    };

    const handleSend = () => recordedData && processAndSend(recordedData);

    const handleDiscard = () => {
        if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
        setAudioBlobUrl(null);
        setRecordedData(null);
        setReviewMode(false);
        setDuration(0);
    };

    const formatDuration = (ms) => {
        const secs = Math.floor(ms / 1000);
        const mins = Math.floor(secs / 60);
        return `${mins}:${(secs % 60).toString().padStart(2, '0')}`;
    };

    // --- Render ---

    if (reviewMode) {
        return (
            <div className="audio-recorder review-mode">
                <div className="review-mode-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>🎧 Review</h4>
                        <span className="duration-display" style={{ fontSize: '1rem' }}>{formatDuration(duration)}</span>
                    </div>

                    <audio
                        ref={audioRef}
                        src={audioBlobUrl}
                        controls
                        style={{ width: '100%', height: '40px' }}
                        onLoadedMetadata={(e) => { e.target.playbackRate = config.speed; }}
                    />

                    <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
                        Velocidade de envio: <b>{config.speed}x</b>
                    </div>

                    <div className="recorder-controls">
                        <button className="btn-cancel" onClick={handleDiscard}>Descartar</button>
                        <button className="btn-record" onClick={handleSend} disabled={isProcessing} style={{ background: '#10B981', boxShadow: 'none' }}>
                            {isProcessing ? 'Processando...' : 'Enviar Áudio'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="audio-recorder">
            {/* Visualizer */}
            <div className="dual-visualizer-container">
                {/* Primary Track (Mic) */}
                <div className="visualizer-track">
                    <span className="visualizer-label">Mic</span>
                    <div
                        ref={visualizerRef1}
                        className="visualizer-bar"
                        style={{ width: '2%' }}
                    />
                </div>

                {/* Secondary Track (System) */}
                <div className="visualizer-track" style={{ marginTop: '16px' }}>
                    <span className="visualizer-label">System / Cable</span>
                    <div
                        ref={visualizerRef2}
                        className="visualizer-bar secondary"
                        style={{ width: '2%' }}
                    />
                </div>
            </div>

            {/* Inputs Grid */}
            <div className="device-selection-grid">

                {/* Row 1: Inputs */}
                <div className="device-input-group">
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>🎙️ Voz (Mic)</span>
                        <span style={{ fontSize: '0.7em', color: '#94a3b8' }}>Vol: {Math.round(micGain * 100)}%</span>
                    </label>
                    <select
                        className="modern-select"
                        value={primaryDeviceId}
                        onChange={(e) => setPrimaryDeviceId(e.target.value)}
                        disabled={isRecording}
                    >
                        {audioDevices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 4)}`}</option>
                        ))}
                    </select>
                    {/* Gain Control */}
                    <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={micGain}
                        onChange={(e) => setMicGain(parseFloat(e.target.value))}
                        style={{
                            width: '100%',
                            height: '4px',
                            background: '#334155',
                            outline: 'none',
                            marginTop: '8px',
                            cursor: 'pointer'
                        }}
                    />
                </div>

                <div className="device-input-group">
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>💻 Sistema (Cable)</span>
                        <span style={{ fontSize: '0.7em', color: '#94a3b8' }}>Vol: {Math.round(systemGain * 100)}%</span>
                    </label>
                    <select
                        className="modern-select"
                        value={secondaryDeviceId}
                        onChange={(e) => setSecondaryDeviceId(e.target.value)}
                        disabled={isRecording}
                    >
                        <option value="">(Nenhum)</option>
                        {audioDevices.map(d => (
                            <option key={`sec-${d.deviceId}`} value={d.deviceId}>{d.label || `Dev ${d.deviceId.slice(0, 4)}`}</option>
                        ))}
                    </select>
                    {/* Gain Control */}
                    <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={systemGain}
                        onChange={(e) => setSystemGain(parseFloat(e.target.value))}
                        style={{
                            width: '100%',
                            height: '4px',
                            background: '#334155',
                            outline: 'none',
                            marginTop: '8px',
                            cursor: 'pointer'
                        }}
                    />
                </div>

                {/* Row 2: Monitoring - Full Width */}
                <div className="device-input-group" style={{ gridColumn: '1 / -1', marginTop: '4px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                id="monitorToggle"
                                checked={monitorSystem}
                                onChange={(e) => setMonitorSystem(e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: '#3B82F6', cursor: 'pointer' }}
                            />
                            <label htmlFor="monitorToggle" style={{ cursor: 'pointer', fontSize: '0.9rem', color: monitorSystem ? '#fff' : '#94a3b8', margin: 0 }}>
                                Ouvir Retorno do Sistema
                            </label>
                        </div>
                    </div>

                    {monitorSystem && (
                        <div className="fade-in">
                            <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>
                                Saída de Áudio (Onde você quer escutar?)
                            </label>
                            <select
                                className="modern-select"
                                value={monitorDeviceId}
                                onChange={(e) => setMonitorDeviceId(e.target.value)}
                                style={{ fontSize: '0.85rem', padding: '6px', background: '#1e293b' }}
                            >
                                {outputDevices.length === 0 && <option>Padrão (System Default)</option>}
                                {outputDevices.map(d => (
                                    <option key={`out-${d.deviceId}`} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 4)}`}</option>
                                ))}
                            </select>
                            <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                                Selecione seu fone de ouvido real aqui para ouvir o som do Virtual Cable.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="recorder-controls">
                {isRecording ? (
                    <>
                        <div className="recording-status">
                            <span className="recording-dot"></span>
                            Gravando duas fontes...
                        </div>
                        <span className="duration-display">{formatDuration(duration)}</span>
                        <button
                            className="btn-record recording"
                            onClick={handleToggleRecording}
                            title="Parar Gravação"
                        >
                            II PAUSE / STOP
                        </button>
                    </>
                ) : (
                    <button className="btn-record" onClick={handleToggleRecording}>
                        ● INICIAR GRAVAÇÃO
                    </button>
                )}
            </div>
        </div>
    );
});

export default AudioRecorder;
