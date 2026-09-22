// PayPal Orders v2 integration — token-pack checkout via PayPal's on-page
// Smart Buttons.
//
// IMPORTANT — set this up on a PayPal account used ONLY for FestIQ, not an
// umbrella account shared with other businesses. PayPal's own policy
// prohibits "games of chance and games of skill... any activity with an
// entry fee and a prize, regardless of whether the outcome is determined by
// chance or skill" unless the merchant is pre-approved, and a policy flag
// freezes the WHOLE account's balance, not just the flagged transactions.
// A dedicated account contains that risk to FestIQ's own funds. PayPal's
// own gambling policy page also says they'll consider approving merchants
// who send them "contact information and a summary of their business" —
// worth pursuing directly rather than relying only on going unnoticed.
//
// Required env vars once you have a PayPal Developer app (developer.paypal.com):
//   PAYPAL_CLIENT_ID     — public, safe to expose to the browser (Smart Buttons need it client-side)
//   PAYPAL_CLIENT_SECRET — server-side only, never expose this
//   PAYPAL_WEBHOOK_ID    — from the app's Webhooks tab, used to verify webhook authenticity
//   PAYPAL_ENV           — "sandbox" (default, safe for testing with fake money) or "live"

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;
const PAYPAL_ENV = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();
const API_BASE = PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

function isConfigured() {
  return !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}

function publicClientId() {
  return PAYPAL_CLIENT_ID || null;
}

let cachedToken = null; // { token, expiresAt }
async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal OAuth error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

// Creates a PayPal order for one token-pack purchase. `referenceId` is our
// own token_purchases.id — stored as custom_id so capture/webhook handling
// can match the payment back to the exact pending purchase without trusting
// anything the client sends about price or token count.
async function createOrder({ referenceId, amountUsd, description }) {
  if (!isConfigured()) throw new Error("PayPal isn't configured — set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: String(referenceId),
          description,
          amount: { currency_code: "USD", value: amountUsd.toFixed(2) },
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`PayPal create-order error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { orderId: data.id };
}

// Captures an approved order. Returns the captured amount + custom_id so
// the caller can double-check both against what it expected before
// crediting anything — never trust the client's claim of what it paid.
async function captureOrder(orderId) {
  if (!isConfigured()) throw new Error("PayPal isn't configured — set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  if (!res.ok) throw new Error(`PayPal capture error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status, // 'COMPLETED' expected on success
    captureId: capture?.id,
    referenceId: data.purchase_units?.[0]?.custom_id,
    amountUsd: capture?.amount?.value ? Number(capture.amount.value) : null,
  };
}

// Real, documented PayPal API — unlike the SeamlessChex webhook (whose
// signing scheme wasn't publicly reachable while that was built), this one
// actually works: PayPal's own /verify-webhook-signature endpoint checks
// the transmission headers against the raw event body server-side, so
// there's no guessing at a signing algorithm.
async function verifyWebhookSignature(headers, rawBodyText) {
  if (!isConfigured() || !PAYPAL_WEBHOOK_ID) return false;
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBodyText),
    }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === "SUCCESS";
}

module.exports = { isConfigured, publicClientId, createOrder, captureOrder, verifyWebhookSignature };
