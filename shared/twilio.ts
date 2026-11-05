export type TwilioSend = {
  accountSid: string;
  authToken: string;
  messagingServiceSid?: string;
  from?: string;
  to: string;
  body: string;
  callback: string;
};
export async function sendTwilio(
  input: TwilioSend,
  fetcher: typeof fetch = fetch,
): Promise<{
  state: "accepted" | "failed" | "unknown";
  sid: string | null;
  error: string | null;
}> {
  const form = new URLSearchParams({
    To: input.to,
    Body: input.body,
    StatusCallback: input.callback,
  });
  if (input.messagingServiceSid)
    form.set("MessagingServiceSid", input.messagingServiceSid);
  else if (input.from) form.set("From", input.from);
  else return { state: "failed", sid: null, error: "missing_sender" };
  try {
    const response = await fetcher(
      `https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + btoa(input.accountSid + ":" + input.authToken),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
        signal: AbortSignal.timeout(15000),
      },
    );
    let value: Record<string, unknown> = {};
    try {
      value = await response.json();
    } catch {}
    if (
      response.ok &&
      typeof value.sid === "string" &&
      /^SM[a-f0-9]{32}$/i.test(value.sid)
    )
      return { state: "accepted", sid: value.sid, error: null };
    if (response.status >= 400 && response.status < 500)
      return {
        state: "failed",
        sid: null,
        error: String(value.code || response.status),
      };
    return { state: "unknown", sid: null, error: "provider_result_uncertain" };
  } catch {
    return { state: "unknown", sid: null, error: "network_result_uncertain" };
  }
}
export async function validTwilioSignature(
  url: string,
  form: URLSearchParams,
  secret: string,
  supplied: string,
) {
  let material = url;
  for (const name of Array.from(new Set(form.keys())).sort())
    for (const value of Array.from(new Set(form.getAll(name))).sort())
      material += name + value;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(material)),
  );
  const signature = btoa(String.fromCharCode(...Array.from(digest)));
  let mismatch = signature.length ^ supplied.length;
  for (let i = 0; i < signature.length; i++)
    mismatch |= signature.charCodeAt(i) ^ (supplied.charCodeAt(i) || 0);
  return mismatch === 0;
}
export function responderPushPayload(to: string, eventId: string) {
  return {
    to,
    title: "Victim Voice",
    body: "A safety request is available in your service area.",
    data: { sosId: eventId },
    sound: "default",
    channelId: "safety-requests",
    ttl: 300,
    priority: "high",
  };
}
