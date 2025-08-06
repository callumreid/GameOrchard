import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.microgamis.app",
  appName: "Game Orchard",
  webDir: "out",
  server: {
    androidScheme: "http",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
    },
  },
};

export default config;
