import {
  createCipheriv,
  createDecipheriv,
  createECDH,
  createHash,
  createHmac,
  randomBytes,
} from "crypto";
import webpush, { PushSubscription } from "web-push";
import { getBillingHmacSecret } from "@/lib/billing-server";

const globalForPush = globalThis as unknown as {
  __vitalPulseSubs?: Map<string, PushSubscription>;
};

export const pushSubscriptions: Map<string, PushSubscription> =
  globalForPush.__vitalPulseSubs ?? new Map<string, PushSubscription>();

if (!globalForPush.__vitalPulseSubs) {
  globalForPush.__vitalPulseSubs = pushSubscriptions;
}

export function deriveDeterministicVapidKeys(seedSecret: string): {
  publicKey: string;
  privateKey: string;
} {
  const seed = seedSecret.trim() || "followeight-default-vapid-seed-v1";
  const privBuf = Buffer.from(
    createHmac("sha256", seed)
      .update("followeight-vapid-p256-keypair-v1")
      .digest()
  );
  // Garantit un scalaire valide 1 <= d < ordre de prime256v1 (MSB < 0x80 et != 0)
  privBuf[0] &= 0x7f;
  privBuf[31] |= 0x01;

  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(privBuf);
  const publicKey = ecdh.getPublicKey(undefined, "uncompressed").toString("base64url");
  const privateKey = privBuf.toString("base64url");

  return { publicKey, privateKey };
}

export function configureWebPush(): {
  configured: boolean;
  publicKey: string;
} {
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:contact@maison-mercier.com";
  const envPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
  const envPrivate = process.env.VAPID_PRIVATE_KEY?.trim() || "";

  let publicKey = envPublic;
  let privateKey = envPrivate;

  // En production Vercel ou si les clés ENV manquent, dériver de manière déterministe
  // afin d'éviter toute dérive éphémère entre instances serverless.
  if (process.env.VERCEL === "1" || !publicKey || !privateKey) {
    const derived = deriveDeterministicVapidKeys(getBillingHmacSecret());
    publicKey = derived.publicKey;
    privateKey = derived.privateKey;
  }

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return { configured: true, publicKey };
  }
  return { configured: false, publicKey };
}

export function getSupabaseRpcGateToken(secretOverride?: string): string {
  return createHmac("sha256", getBillingHmacSecret(secretOverride))
    .update("followeight-supabase-rpc-gate-v1")
    .digest("hex");
}

export function getPushCronGateToken(secretOverride?: string): string {
  return createHmac("sha256", getBillingHmacSecret(secretOverride))
    .update("followeight-cron-trigger-v1")
    .digest("hex");
}

export function computeDeviceId(endpoint: string): string {
  return createHash("sha256").update(endpoint.trim(), "utf8").digest("hex");
}

function getSubscriptionEncryptionKey(secretOverride?: string): Buffer {
  return createHmac("sha256", getBillingHmacSecret(secretOverride))
    .update("followeight-sub-aes256gcm-v1")
    .digest();
}

export function encryptPushSubscription(
  sub: PushSubscription,
  secretOverride?: string
): string {
  const key = getSubscriptionEncryptionKey(secretOverride);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(sub), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptPushSubscription(
  token: string,
  secretOverride?: string
): PushSubscription {
  if (!token || typeof token !== "string") {
    throw new Error("ENCRYPTED_SUBSCRIPTION_MISSING");
  }
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("ENCRYPTED_SUBSCRIPTION_MALFORMED");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const cipherText = Buffer.from(parts[3], "base64url");
  if (iv.length !== 12 || tag.length !== 16 || cipherText.length === 0) {
    throw new Error("ENCRYPTED_SUBSCRIPTION_INVALID_PARTS");
  }

  const key = getSubscriptionEncryptionKey(secretOverride);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(cipherText), decipher.final()]).toString(
    "utf8"
  );
  const parsed = JSON.parse(plain) as PushSubscription;
  if (!parsed?.endpoint || !parsed?.keys?.p256dh || !parsed?.keys?.auth) {
    throw new Error("DECRYPTED_SUBSCRIPTION_INVALID");
  }
  return parsed;
}

export { webpush };
