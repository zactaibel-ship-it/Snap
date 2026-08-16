export async function sendExpoPushNotification(input: {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: input.to,
        title: input.title,
        body: input.body,
        data: input.data ?? {},
      }),
    });
  } catch (error) {
    // A failed push shouldn't fail the caller's larger job (import/poll) — log and move on.
    console.error('sendExpoPushNotification error:', error);
  }
}
