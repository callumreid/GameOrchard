package com.microgamis.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.util.Base64;
import android.util.Log;
import androidx.core.app.ActivityCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "AudioInput")
public class AudioInputPlugin extends Plugin {
    private static final String TAG = "AudioInputPlugin";
    private static final int SAMPLE_RATE = 24000;
    private static final int CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO;
    private static final int AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;
    private static final int BUFFER_SIZE_MEDIUM = 2048;
    private static final int BUFFER_SIZE_LARGE = 4096;

    private AudioRecord audioRecord;
    private ExecutorService recordingExecutor;
    private AtomicBoolean isRecording = new AtomicBoolean(false);
    private int bufferSize;

    @PluginMethod
    public void start(PluginCall call) {
        // Check if already recording
        if (isRecording.get()) {
            Log.w(TAG, "Audio recording already in progress, ignoring start request");
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("sampleRate", SAMPLE_RATE);
            ret.put("bufferSize", bufferSize);
            call.resolve(ret);
            return;
        }

        // Check permission
        if (ActivityCompat.checkSelfPermission(getContext(),
                Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "RECORD_AUDIO permission not granted");
            call.reject("RECORD_AUDIO permission not granted");
            return;
        }
        Log.d(TAG, "RECORD_AUDIO permission is granted");

        Integer sampleRate = call.getInt("sampleRate", SAMPLE_RATE);
        Log.d(TAG, "Starting audio recording with sample rate: " + sampleRate);

        // Ensure any existing recording is properly stopped
        stopRecordingInternal();

        try {
            // Calculate buffer size
            int minBufferSize = AudioRecord.getMinBufferSize(sampleRate, CHANNEL_CONFIG, AUDIO_FORMAT);
            if (minBufferSize == AudioRecord.ERROR || minBufferSize == AudioRecord.ERROR_BAD_VALUE) {
                Log.e(TAG, "Failed to get minimum buffer size: " + minBufferSize);
                call.reject("Failed to get buffer size");
                return;
            }

            // Match React Native app buffer logic exactly
            int bufferLength = (minBufferSize > BUFFER_SIZE_MEDIUM) ? BUFFER_SIZE_LARGE : BUFFER_SIZE_MEDIUM;
            bufferSize = bufferLength; // Store for later use

            Log.d(TAG, "MinBufferSize: " + minBufferSize + ", Using bufferLength: " + bufferLength);

            // Try different audio sources for Fire TV compatibility
            int[] audioSources = {
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    MediaRecorder.AudioSource.MIC,
                    MediaRecorder.AudioSource.DEFAULT
            };

            for (int audioSource : audioSources) {
                try {
                    Log.d(TAG, "Trying audio source: " + audioSource);
                    audioRecord = new AudioRecord(
                            audioSource,
                            sampleRate,
                            CHANNEL_CONFIG,
                            AUDIO_FORMAT,
                            bufferLength);

                    if (audioRecord.getState() == AudioRecord.STATE_INITIALIZED) {
                        Log.d(TAG, "Successfully initialized AudioRecord with source: " + audioSource);
                        break;
                    } else {
                        Log.w(TAG, "Failed to initialize with audio source: " + audioSource + ", state: "
                                + audioRecord.getState());
                        audioRecord.release();
                        audioRecord = null;
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Exception with audio source " + audioSource + ": " + e.getMessage());
                    if (audioRecord != null) {
                        audioRecord.release();
                        audioRecord = null;
                    }
                }
            }

            Log.d(TAG, "AudioRecord created, state: " + audioRecord.getState() +
                    " (UNINITIALIZED=" + AudioRecord.STATE_UNINITIALIZED +
                    ", INITIALIZED=" + AudioRecord.STATE_INITIALIZED + ")");

            if (audioRecord == null || audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "AudioRecord initialization failed, state: "
                        + (audioRecord != null ? audioRecord.getState() : "null"));
                call.reject("AudioRecord initialization failed with all audio sources");
                return;
            }

            // Start recording
            Log.d(TAG, "Starting AudioRecord recording...");
            audioRecord.startRecording();

            Log.d(TAG, "AudioRecord recording state: " + audioRecord.getRecordingState() +
                    " (STOPPED=" + AudioRecord.RECORDSTATE_STOPPED +
                    ", RECORDING=" + AudioRecord.RECORDSTATE_RECORDING + ")");

            isRecording.set(true);

            // Start audio capture thread
            recordingExecutor = Executors.newSingleThreadExecutor();
            recordingExecutor.submit(() -> captureAudio());

            Log.i(TAG, "Audio recording started with sample rate: " + sampleRate);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("sampleRate", sampleRate);
            ret.put("bufferSize", bufferSize);
            call.resolve(ret);

        } catch (Exception e) {
            Log.e(TAG, "Error starting audio recording", e);
            call.reject("Failed to start recording: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (!isRecording.get()) {
            Log.w(TAG, "No recording in progress, ignoring stop request");
            call.resolve();
            return;
        }

        stopRecordingInternal();
        Log.i(TAG, "Audio recording stopped");
        call.resolve();
    }

    private void stopRecordingInternal() {
        isRecording.set(false);

        if (audioRecord != null) {
            try {
                if (audioRecord.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
                    audioRecord.stop();
                }
                audioRecord.release();
                audioRecord = null;
            } catch (Exception e) {
                Log.e(TAG, "Error in stopRecordingInternal", e);
            }
        }

        if (recordingExecutor != null) {
            recordingExecutor.shutdown();
            recordingExecutor = null;
        }
    }

    private void captureAudio() {
        short[] audioBuffer = new short[bufferSize / 2]; // 16-bit samples
        byte[] audioData = new byte[bufferSize];
        int chunkCount = 0;

        while (isRecording.get() && audioRecord != null) {
            int samplesRead = audioRecord.read(audioBuffer, 0, audioBuffer.length);
            chunkCount++;

            if (samplesRead > 0) {
                // Debug: Check if we're capturing actual sound
                short maxAmplitude = 0;
                for (int i = 0; i < samplesRead; i++) {
                    if (Math.abs(audioBuffer[i]) > Math.abs(maxAmplitude)) {
                        maxAmplitude = audioBuffer[i];
                    }
                }

                Log.d(TAG, "Chunk " + chunkCount + ": " + samplesRead + " samples, max amplitude: " + maxAmplitude);

                // Convert short array to byte array (PCM 16-bit little endian)
                for (int i = 0; i < samplesRead; i++) {
                    short sample = audioBuffer[i];
                    audioData[i * 2] = (byte) (sample & 0xFF); // Low byte
                    audioData[i * 2 + 1] = (byte) ((sample >> 8) & 0xFF); // High byte
                }

                // Encode to base64 and send to JS
                String base64Audio = Base64.encodeToString(audioData, 0, samplesRead * 2, Base64.NO_WRAP);

                JSObject data = new JSObject();
                data.put("base64", base64Audio);
                data.put("samplesRead", samplesRead);

                Log.d(TAG, "Sending audio event to JS: " + base64Audio.length() + " chars base64, " + samplesRead
                        + " samples");
                notifyListeners("audio", data);

                // Clear the buffer for next iteration
                for (int i = 0; i < samplesRead; i++) {
                    audioBuffer[i] = 0;
                }
            } else if (samplesRead == AudioRecord.ERROR_INVALID_OPERATION) {
                Log.e(TAG, "AudioRecord read error: invalid operation");
                break;
            } else if (samplesRead == AudioRecord.ERROR_BAD_VALUE) {
                Log.e(TAG, "AudioRecord read error: bad value");
                break;
            } else {
                Log.w(TAG, "AudioRecord.read returned: " + samplesRead);
            }
        }

        Log.i(TAG, "Audio capture thread ended");
    }

    @Override
    protected void handleOnDestroy() {
        stopRecordingInternal();
        super.handleOnDestroy();
    }
}
