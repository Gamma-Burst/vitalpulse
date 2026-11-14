import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.NEXT_PUBLIC_APP_URL;

const config: CapacitorConfig = {
  appId: "com.followeight.app",
  appName: "FolloWeight",
  webDir: "capacitor-shell",
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ...(serverUrl && serverUrl.startsWith("https://")
    ? {
        server: {
          url: serverUrl,
          cleartext: false,
        },
      }
    : {}),
};

export default config;
