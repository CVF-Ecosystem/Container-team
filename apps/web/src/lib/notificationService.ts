"use client";

import { apiClient } from "./apiClient";
import { logger } from "./logger";

export type NotificationSetupStatus =
  | "unsupported"
  | "blocked"
  | "not-configured"
  | "subscribed"
  | "failed";

function urlBase64ToApplicationServerKey(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer.slice(0) as ArrayBuffer;
}

export async function enablePushNotifications(): Promise<NotificationSetupStatus> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }

  const keyResult = await apiClient.getVapidPublicKey();
  if (keyResult.error || !keyResult.data?.publicKey || !keyResult.data.configured) {
    return "not-configured";
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return "blocked";
  }

  try {
    const registration = await navigator.serviceWorker.register("/push-sw.js");
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToApplicationServerKey(
          keyResult.data.publicKey
        ),
      }));

    const result = await apiClient.registerPushSubscription(subscription.toJSON());
    return result.error ? "failed" : "subscribed";
  } catch (error) {
    logger.error("Failed to enable push notifications", error);
    return "failed";
  }
}
