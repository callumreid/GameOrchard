import { useCallback, useRef } from "react";

// Web-only: no native audio input; expose a no-op interface
const _AudioInput = undefined;

export function useNativeAudioInput() {
  const isRecording = useRef(false);
  const _audioDataCallback = useRef<((audioData: ArrayBuffer) => void) | null>(
    null
  );
  const _listenerRef = useRef<any>(null);

  const startRecording = useCallback(
    async (
      _sampleRate: number = 44000,
      _onAudioData: (audioData: ArrayBuffer) => void
    ): Promise<boolean> => {
      // Web-only: no native audio recording available
      return false;
    },
    []
  );

  const stopRecording = useCallback(async (): Promise<void> => {
    // Web-only: no native audio recording to stop
    return;
  }, []);

  const isRecordingActive = useCallback(() => {
    return isRecording.current;
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecordingActive,
    isAvailable: false,
  };
}
