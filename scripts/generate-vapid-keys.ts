/**
 * Generate VAPID keys for Web Push (iOS PWA notifications).
 * Usage: npx tsx scripts/generate-vapid-keys.ts
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("Add these to .env.local / Vercel env:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
