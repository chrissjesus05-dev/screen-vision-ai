/**
 * Audio Recording and Processing Service
 * Handles microphone capture and preparation for ffmpeg processing
 */

class AudioService {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.recordingStartTime = null;
        this.onRecordingStateChange = null;
    }

    /**
     * Check if browser supports audio recording
     */
    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Get audio quality constraints
     */
    getQualityConstraints(quality = 'medium') {
        const qualities = {
            low: { sampleRate: 8000, channelCount: 1 },
            medium: { sampleRate: 16000, channelCount: 1 },
            high: { sampleRate: 44100, channelCount: 2 }
        };
        return qualities[quality] || qualities.medium;
    }

    /**
     * Start audio recording
     */
    async startRecording(quality = 'medium', existingStream = null) {
        if (!this.isSupported()) {
            throw new Error('Audio recording not supported in this browser');
        }

        if (this.isRecording) {
            throw new Error('Already recording');
        }

        try {
            // Use existing stream or request new one
            if (existingStream) {
                this.stream = existingStream;
            } else {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    audio: this.getQualityConstraints(quality)
                });
            }

            // Create MediaRecorder
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                this.notifyStateChange();
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.notifyStateChange();

            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            throw new Error('Failed to access microphone: ' + error.message);
        }
    }

    /**
     * Stop recording and return audio data
     */
    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return null;
        }

        return new Promise((resolve) => {
            this.mediaRecorder.onstop = async () => {
                // Create blob from chunks
                const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });

                // Convert to base64 data URL
                const dataUrl = await this.blobToDataUrl(audioBlob);

                // Stop all tracks
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }

                this.isRecording = false;
                this.notifyStateChange();

                resolve({
                    dataUrl,
                    blob: audioBlob,
                    duration: Date.now() - this.recordingStartTime,
                    mimeType: this.mediaRecorder.mimeType
                });
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Convert blob to base64 data URL
     */
    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Process audio with ffmpeg (via Electron IPC)
     */
    async processAudio(dataUrl, speedMultiplier = 3.0) {
        if (!window.electronAPI || !window.electronAPI.speedUpAudio) {
            throw new Error('ffmpeg processing only available in Electron');
        }

        try {
            const result = await window.electronAPI.speedUpAudio(dataUrl, speedMultiplier);
            if (!result.success) {
                throw new Error(result.error || 'Unknown ffmpeg error');
            }
            return result.dataUrl;
        } catch (error) {
            console.error('ffmpeg processing error:', error);
            throw error;
        }
    }

    /**
     * Get current recording duration
     */
    getRecordingDuration() {
        if (!this.isRecording || !this.recordingStartTime) {
            return 0;
        }
        return Date.now() - this.recordingStartTime;
    }

    /**
     * Cancel recording without saving
     */
    cancelRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.audioChunks = [];
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.isRecording = false;
        this.notifyStateChange();
    }

    /**
     * Set callback for recording state changes
     */
    setOnRecordingStateChange(callback) {
        this.onRecordingStateChange = callback;
    }

    /**
     * Notify state change
     */
    notifyStateChange() {
        if (this.onRecordingStateChange) {
            this.onRecordingStateChange(this.isRecording);
        }
    }
}

export const audioService = new AudioService();
export default audioService;
