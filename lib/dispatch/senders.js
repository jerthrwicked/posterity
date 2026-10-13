// The Communication Dispatch System's two channels: email through Postmark and
// text message through Twilio. Each takes a message and what was rendered for
// it, and either resolves with the provider's id for the send or throws.
//
// A thrown error carries `retryable: false` when no retry can succeed (an
// address or number the provider refuses outright), and the pass fails the
// message at once. Anything else, a provider outage, a rate limit, a network
// fault, or a key that is wrong until someone fixes it, is retried on the
// queue's schedule.
//
// Master Specification, Communication Dispatch System and Postmark: automated
// email sends from posterity@yourposterity.com, replies go to
// admin@yourposterity.com, and every email other than a delivery names
// Posterity alone. Texts send from Posterity's Twilio number, and Twilio sends
// no text over 1,600 characters.

export const EMAIL_FROM = 'posterity@yourposterity.com';
export const EMAIL_REPLY_TO = 'admin@yourposterity.com';
export const SMS_FROM = '+15043583544';
export const SMS_MAX_CHARS = 1600;

function failure(message, retryable, detail = {}) {
  const err = new Error(message);
  err.retryable = retryable;
  Object.assign(err, detail);
  return err;
}

async function readJson(res) {
  try { return await res.json(); } catch { return {}; }
}

// token: a Postmark server token. Postmark's documented token POSTMARK_API_TEST
//   accepts a send and delivers nothing.
export function postmarkSender({ token, from = EMAIL_FROM, replyTo = EMAIL_REPLY_TO, fetch: doFetch = fetch }) {
  if (!token) throw new Error('postmarkSender: a server token is required');
  return {
    async send({ message, rendered }) {
      // The display name is the caller's to set for a delivery (from_name);
      // every other email names Posterity alone.
      const name = (message.from_name || 'Posterity').replace(/["\\\r\n]/g, '');
      let res;
      try {
        res = await doFetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Postmark-Server-Token': token },
          body: JSON.stringify({
            From: `"${name}" <${from}>`,
            To: message.destination,
            ReplyTo: replyTo,
            Subject: rendered.subject,
            HtmlBody: rendered.html,
            TextBody: rendered.text,
            MessageStream: 'outbound',
            Tag: message.copy_key,
            Metadata: { dispatch_message_id: String(message.id) },
          }),
        });
      } catch (err) {
        throw failure(`postmark: ${err.message}`, true);
      }
      const body = await readJson(res);
      if (res.ok && body.ErrorCode === 0) return { providerMessageId: body.MessageID };

      const what = `postmark ${res.status}${body.ErrorCode ? ` (${body.ErrorCode})` : ''}: ${body.Message ?? 'no detail'}`;
      // 422 is Postmark refusing this email itself: an address it will not
      // send to, a recipient marked inactive after a bounce or complaint, or,
      // while the account awaits approval, any address off yourposterity.com.
      throw failure(what, res.status !== 422, { providerCode: body.ErrorCode });
    },
  };
}

// Twilio errors that mean this number will never take this text: not a valid
// number, a landline, a number that replied STOP, a region not enabled.
const TWILIO_FINAL = new Set([21211, 21214, 21217, 21219, 21408, 21610, 21612, 21614, 21617]);

// accountSid, authToken: the Twilio account's, or its test credentials, which
//   accept a send and deliver nothing (sent from +15005550006).
export function twilioSender({ accountSid, authToken, from = SMS_FROM, statusCallback = null, fetch: doFetch = fetch }) {
  if (!accountSid || !authToken) throw new Error('twilioSender: the account SID and auth token are required');
  const auth = `Basic ${btoa(`${accountSid}:${authToken}`)}`;
  return {
    async send({ message, rendered }) {
      if (!rendered?.body) throw failure('twilio: nothing to send', false);
      if (rendered.body.length > SMS_MAX_CHARS) {
        throw failure(`twilio: ${rendered.body.length} characters, over the ${SMS_MAX_CHARS} a text can carry`, false);
      }
      const form = new URLSearchParams({ To: message.destination, From: from, Body: rendered.body });
      if (statusCallback) form.set('StatusCallback', statusCallback);
      let res;
      try {
        res = await doFetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        });
      } catch (err) {
        throw failure(`twilio: ${err.message}`, true);
      }
      const body = await readJson(res);
      if (res.ok && body.sid) return { providerMessageId: body.sid };

      const what = `twilio ${res.status}${body.code ? ` (${body.code})` : ''}: ${body.message ?? 'no detail'}`;
      throw failure(what, !TWILIO_FINAL.has(body.code), { providerCode: body.code });
    },
  };
}
