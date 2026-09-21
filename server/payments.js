// SeamlessChex integration scaffolding.
//
// STATUS: the wallet/webhook/DB plumbing below is real and tested — a pack
// purchase creates a 'pending' row, nothing credits the wallet until a
// webhook confirms payment, and it's idempotent against retries. What is
// NOT yet filled in is the actual outbound call to SeamlessChex's API: their
// real API reference (developers-echeck.seamlesschex.com) is blocked to
// automated fetching (robots.txt) and wasn't reachable while building this,
// and a merchant account has to exist before real credentials or a
// concrete request/response shape exist anyway. createCheckoutLink() below
// is a clearly-marked placeholder — once you have a SeamlessChex dashboard
// login, pull the real "Create Payment Link" request shape from their docs
// (or ask your onboarding rep for a Node sample, most high-risk processors
// hand these out directly) and drop it in here; everything downstream
// (webhook handling, wallet crediting, purchase logging) doesn't need to
// change.
//
// Required once you have real credentials:
//   SEAMLESSCHEX_API_KEY        — from your dashboard
//   SEAMLESSCHEX_WEBHOOK_SECRET — for verifying webhook authenticity (exact
//                                  header/scheme TBD from their docs — see
//                                  verifyWebhookSignature below)
//   PUBLIC_BASE_URL             — e.g. https://festiq.com — used to build the
//                                  success/cancel redirect URLs SeamlessChex
//                                  sends the player back to after paying

const SEAMLESSCHEX_API_KEY = process.env.SEAMLESSCHEX_API_KEY;
const SEAMLESSCHEX_WEBHOOK_SECRET = process.env.SEAMLESSCHEX_WEBHOOK_SECRET;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";

function isConfigured() {
  return !!(SEAMLESSCHEX_API_KEY && SEAMLESSCHEX_WEBHOOK_SECRET && PUBLIC_BASE_URL);
}

// Creates a hosted checkout link for one token-pack purchase and returns its
// URL. `reference` is our own pending_token_purchases-style id — pass it
// through as metadata/a custom field so the webhook can match the payment
// back to this exact purchase attempt without guessing.
//
// TODO (blocked on real API docs — see file header): replace this body with
// an actual `fetch("https://<real SeamlessChex API host>/...", ...)` call
// once you can see their "Create Payment Link" endpoint, auth header format,
// and response field names. Everything else in this module already expects
// whatever comes back to be normalized into { checkoutUrl, providerReference }.
async function createCheckoutLink({ reference, amountCents, description, successPath, cancelPath }) {
  if (!isConfigured()) {
    throw new Error(
      "SeamlessChex isn't configured yet — set SEAMLESSCHEX_API_KEY, SEAMLESSCHEX_WEBHOOK_SECRET, and PUBLIC_BASE_URL once your merchant account is approved."
    );
  }

  throw new Error(
    "createCheckoutLink() is a placeholder — the real SeamlessChex request needs to be filled in from their API docs once you have dashboard access (see server/payments.js header comment). " +
      `Would have created a checkout for reference=${reference}, amountCents=${amountCents}, description="${description}", ` +
      `returning to ${PUBLIC_BASE_URL}${successPath} / ${PUBLIC_BASE_URL}${cancelPath}.`
  );

  // Expected shape once implemented:
  // const res = await fetch("<real endpoint>", {
  //   method: "POST",
  //   headers: { "content-type": "application/json", authorization: `Bearer ${SEAMLESSCHEX_API_KEY}` },
  //   body: JSON.stringify({
  //     amount: amountCents / 100,
  //     description,
  //     reference,
  //     success_url: `${PUBLIC_BASE_URL}${successPath}`,
  //     cancel_url: `${PUBLIC_BASE_URL}${cancelPath}`,
  //   }),
  // });
  // if (!res.ok) throw new Error(`SeamlessChex API error ${res.status}: ${await res.text()}`);
  // const data = await res.json();
  // return { checkoutUrl: data.url, providerReference: data.id };
}

// TODO (blocked on real API docs): SeamlessChex's actual webhook signing
// scheme (header name, HMAC algorithm, payload format) isn't documented
// anywhere publicly reachable — confirm it from their dashboard/docs once
// you have access, then implement the real signature check here. Until
// this returns true for a genuine SeamlessChex request, the webhook route
// below refuses everything (fails closed, not open) rather than trusting
// unverified input that could fabricate a "payment succeeded" event.
function verifyWebhookSignature(/* rawBody, headers */) {
  return false;
}

module.exports = { isConfigured, createCheckoutLink, verifyWebhookSignature };
