import webpush, { PushSubscription } from "web-push";

const globalForPush = globalThis as unknown as {
  __vitalPulseSubs?: Map<string, PushSubscription>;
  __vitalPulseEphemeralVapid?: { publicKey: string; privateKey: string };
};

export const pushSubscriptions: Map<string, PushSubscription> =
  globalForPush.__vitalPulseSubs ?? new Map<string, PushSubscription>();

if (!globalForPush.__vitalPulseSubs) {
  globalForPush.__vitalPulseSubs = pushSubscriptions;
}

export function configureWebPush(): {
  configured: boolean;
  publicKey: string;
} {
  let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  let privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@maison-mercier.com";

  if (!publicKey || !privateKey) {
    if (!globalForPush.__vitalPulseEphemeralVapid) {
      globalForPush.__vitalPulseEphemeralVapid = webpush.generateVAPIDKeys();
    }
    publicKey = globalForPush.__vitalPulseEphemeralVapid.publicKey;
    privateKey = globalForPush.__vitalPulseEphemeralVapid.privateKey;
  }

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return { configured: true, publicKey };
  }
  return { configured: false, publicKey };
}

export { webpush };
