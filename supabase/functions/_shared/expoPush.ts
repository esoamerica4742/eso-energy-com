export type PowerShieldIosSoundCritical = {
  critical: 1;
  name: "default";
  volume: 1.0;
};

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /**
   * Expo forwards this to iOS. For critical alerts we send a sound dictionary.
   * (Expo typings are stricter than the underlying push payload.)
   */
  sound?: "default" | null | PowerShieldIosSoundCritical;
  /**
   * iOS/Android channel routing for heads-up banners.
   * Android expects this to map to NotificationChannel id created on device.
   */
  channelId?: string;
  priority?: "default" | "normal" | "high";
  ios?: {
    interruptionLevel?: "passive" | "active" | "timeSensitive" | "critical";
    priority?: number;
    sound?: "default" | PowerShieldIosSoundCritical;
  };
  android?: {
    channelId?: string;
    priority?: "max" | "high" | "default";
    visibility?: "public" | "private";
    bypassDnd?: boolean;
  };
};

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (!messages.length) return;

  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Expo push request failed (${res.status}): ${body}`);
    }
  }
}
