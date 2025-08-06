import { useCallback, useRef } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

interface AudioInputPlugin {
  start(options: {
    sampleRate?: number;
  }): Promise<{ success: boolean; sampleRate: number; bufferSize: number }>;
  stop(): Promise<void>;
  addListener(
    eventName: string,
    listenerFunc: (data: any) => void
  ): Promise<any>;
  removeAllListeners(): Promise<void>;
}

const AudioInput = Capacitor.isNativePlatform()
  ? registerPlugin<AudioInputPlugin>("AudioInput")
  : undefined;

export function useNativeAudioInput() {
  const isRecording = useRef(false);
  const audioDataCallback = useRef<((audioData: ArrayBuffer) => void) | null>(
    null
  );
  const listenerRef = useRef<any>(null);

  const startRecording = useCallback(
    async (
      sampleRate: number = 44000,
      onAudioData: (audioData: ArrayBuffer) => void
    ): Promise<boolean> => {
      if (!AudioInput) {
        console.error(
          "[NativeAudioInput] Plugin not available on this platform"
        );
        return false;
      }

      if (isRecording.current) {
        console.warn("[NativeAudioInput] Already recording");
        return true;
      }

      try {
        audioDataCallback.current = onAudioData;

        console.log("[NativeAudioInput] Setting up audio listener...");
        // Set up audio data listener
        listenerRef.current = await AudioInput.addListener(
          "audio",
          (data: { base64: string; samplesRead: number }) => {
            console.log(
              "[NativeAudioInput] Received audio event from native side:",
              {
                base64Length: data.base64?.length || 0,
                samplesRead: data.samplesRead || 0,
              }
            );

            if (audioDataCallback.current) {
              // Convert base64 to ArrayBuffer
              const binaryString = atob(data.base64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              console.log(
                "[NativeAudioInput] Converted to ArrayBuffer, calling callback with",
                bytes.buffer.byteLength,
                "bytes"
              );
              // Pass the ArrayBuffer to the callback
              audioDataCallback.current(bytes.buffer);
            } else {
              console.warn(
                "[NativeAudioInput] Received audio data but no callback set"
              );
            }
          }
        );

        console.log(
          "[NativeAudioInput] Audio listener set up, starting recording..."
        );
        // Start recording
        const result = await AudioInput.start({ sampleRate });

        if (result.success) {
          isRecording.current = true;
          console.log(
            `[NativeAudioInput] Recording started at ${result.sampleRate}Hz, buffer size: ${result.bufferSize}`
          );
          return true;
        } else {
          console.error("[NativeAudioInput] Failed to start recording");
          return false;
        }
      } catch (error) {
        console.error("[NativeAudioInput] Error starting recording:", error);
        return false;
      }
    },
    []
  );

  const stopRecording = useCallback(async (): Promise<void> => {
    if (!AudioInput || !isRecording.current) {
      return;
    }

    try {
      await AudioInput.stop();
      isRecording.current = false;
      audioDataCallback.current = null;

      // Remove listener
      if (listenerRef.current) {
        await listenerRef.current.remove();
        listenerRef.current = null;
      }

      console.log("[NativeAudioInput] Recording stopped");
    } catch (error) {
      console.error("[NativeAudioInput] Error stopping recording:", error);
    }
  }, []);

  const isRecordingActive = useCallback(() => {
    return isRecording.current;
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecordingActive,
    isAvailable: !!AudioInput,
  };
}
