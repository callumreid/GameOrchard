import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";

export function usePermissions() {
  const requestMicrophonePermission =
    useCallback(async (): Promise<boolean> => {
      // Only handle permissions on mobile platforms
      if (Capacitor.isNativePlatform()) {
        try {
          // On Capacitor, permissions are handled automatically when getUserMedia is called
          // We can check if mediaDevices is available
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("getUserMedia is not available in this context");
            return false;
          }

          console.log("[Permissions] Requesting microphone access...");

          // Test if we can access the microphone
          // This will trigger the native permission request
          const testStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });

          // If we got here, permission was granted.  Enumerate devices to help debugging.
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter((d) => d.kind === "audioinput");

          console.group("[Permissions] Available audio input devices");
          audioInputs.forEach((d, idx) => {
            console.log(`#${idx}`, {
              deviceId: d.deviceId,
              label: d.label,
            });
          });
          console.groupEnd();

          // Test the audio stream to see if it's actually working
          console.log("[Permissions] Testing audio stream...");
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(testStream);
          const analyser = audioContext.createAnalyser();
          source.connect(analyser);

          // Check for audio activity for 3 seconds
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let maxVolume = 0;

          for (let i = 0; i < 30; i++) {
            // 30 * 100ms = 3 seconds
            await new Promise((resolve) => setTimeout(resolve, 100));
            analyser.getByteFrequencyData(dataArray);
            const volume = Math.max(...dataArray);
            maxVolume = Math.max(maxVolume, volume);
          }

          console.log("[Permissions] Max audio volume detected:", maxVolume);
          audioContext.close();

          // Attempt to pick the Fire TV remote microphone if present.
          const preferred = audioInputs.find((d) =>
            /remote|bluetooth|sco|amazon/i.test(d.label)
          );

          if (preferred) {
            console.log(
              "[Permissions] Preferring remote mic deviceId:",
              preferred.deviceId,
              preferred.label
            );

            // Monkey-patch getUserMedia to force using preferred mic when audio=true is requested.
            const originalGetUserMedia =
              navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

            navigator.mediaDevices.getUserMedia = (constraints: any) => {
              // If caller just requested {audio:true} or bare true, inject deviceId.
              if (
                constraints === true ||
                (constraints &&
                  (constraints.audio === true ||
                    constraints.audio === undefined))
              ) {
                constraints = {
                  ...((typeof constraints === "object"
                    ? constraints
                    : {}) as any),
                  audio: { deviceId: { exact: preferred.deviceId } },
                } as MediaStreamConstraints;
              }
              return originalGetUserMedia(constraints);
            };
          } else {
            console.warn(
              "[Permissions] No remote mic detected – default device should now have SCO audio"
            );
          }

          // Stop temp stream (we only needed it to prompt permissions).
          testStream.getTracks().forEach((track) => track.stop());

          return true;
        } catch (error) {
          console.error("Error requesting microphone permission:", error);
          if (error instanceof Error) {
            if (error.name === "NotAllowedError") {
              console.warn("Microphone permission was denied by user");
            } else if (error.name === "NotFoundError") {
              console.warn("No microphone device found");
            }
          }
          return false;
        }
      }

      // On web, permissions are handled by getUserMedia
      return true;
    }, []);

  const checkSecureContext = useCallback((): boolean => {
    if (typeof window === "undefined") return true;

    const isSecure = window.isSecureContext;
    if (!isSecure) {
      console.error(
        "App is not running in a secure context. getUserMedia will fail."
      );
      console.error("Current origin:", window.location.origin);
    }

    return isSecure;
  }, []);

  return {
    requestMicrophonePermission,
    checkSecureContext,
  };
}
