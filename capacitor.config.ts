import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.NEXT_PUBLIC_APP_URL || "https://followeight.com";

const config: CapacitorConfig = {
  appId: "com.followeight.app",
  appName: "FolloWeight",
  webDir: "capacitor-shell",
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_launcher",
      iconColor: "#10B981",
    },
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
