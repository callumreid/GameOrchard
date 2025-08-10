import { useCallback } from "react";

export function usePermissions() {
  const requestMicrophonePermission =
    useCallback(async (): Promise<boolean> => {
      // Web-only: permissions are requested by getUserMedia where needed
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
