import './ScreenPreview.css';

function ScreenPreview({
    videoRef,
    canvasRef,
    isCapturing,
    isAnalyzing,
    onStartCapture,
    onStopCapture,
    onAnalyze
}) {
    return (
        <section className="screen-section">
            <div className="section-header">
                <h2>🖥️ Sua Tela</h2>
                <div className="screen-controls">
                    {!isCapturing ? (
                        <button className="btn-secondary" onClick={onStartCapture}>
                            ▶ Compartilhar
                        </button>
                    ) : (
                        <>
                            <button className="btn-danger" onClick={onStopCapture}>
                                ⏹ Parar
                            </button>
                            <button
                                className="btn-analyze"
                                onClick={onAnalyze}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? '⏳ Analisando...' : '🔍 Analisar'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="screen-preview">
                {!isCapturing ? (
                    <div className="preview-placeholder">
                        <div className="placeholder-icon">🖥️</div>
                        <p>Clique em "Compartilhar" para começar</p>
                        <p className="placeholder-hint">
                            O Gemini irá analisar sua tela quando você clicar em "Analisar"
                        </p>
                    </div>
                ) : null}
                <video
                    ref={videoRef}
                    className={isCapturing ? 'active' : ''}
                    muted
                    playsInline
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        </section>
    );
}

export default ScreenPreview;
