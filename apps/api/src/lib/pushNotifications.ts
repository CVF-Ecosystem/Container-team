import webpush, { type PushSubscription } from "web-push";
import { query } from "../db/index.js";
import { env } from "../config/env.js";
import { logger } from "../middleware/logger.js";

interface StoredPushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

if (env.push.configured) {
  webpush.setVapidDetails(
    env.push.vapidSubject,
    env.push.vapidPublicKey!,
    env.push.vapidPrivateKey!
  );
}

export function getVapidPublicKey(): string | null {
  return env.push.vapidPublicKey ?? null;
}

export function isPushConfigured(): boolean {
  return env.push.configured;
}

export async function notifyRole(role: string, payload: PushPayload) {
  if (!env.push.configured) {
    logger.warn("Push notification skipped because VAPID keys are not configured");
    return { sent: 0, skipped: true };
  }

  try {
    const subscriptions = await query<StoredPushSubscription>(
      `SELECT id, endpoint, p256dh, auth
       FROM push_subscriptions
       WHERE enabled = true AND role = $1`,
      [role]
    );

    let sent = 0;
    await Promise.all(
      subscriptions.map(async (subscription) => {
        const pushSubscription: PushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              url: payload.url ?? "/dashboard",
              tag: payload.tag ?? "tan-thuan-port",
            })
          );
          sent += 1;
        } catch (error) {
          const statusCode =
            typeof error === "object" && error !== null && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode)
              : 0;

          if (statusCode === 404 || statusCode === 410) {
            await query(
              "UPDATE push_subscriptions SET enabled = false WHERE id = $1",
              [subscription.id]
            );
            return;
          }

          logger.warn({ err: error }, "Failed to send push notification");
        }
      })
    );

    return { sent, skipped: false };
  } catch (error) {
    logger.warn({ err: error }, "Push notification dispatch failed");
    return { sent: 0, skipped: false };
  }
}
