import { PaymentRequirements } from "../types";

type ChallengeHandler = (requirements: PaymentRequirements) => Promise<{ signature: string; donorWallet: string }>;

let activeChallengeHandler: ChallengeHandler | null = null;

/**
 * Register a React-level callback to handle the 402 payment challenge UI.
 */
export function registerChallengeHandler(handler: ChallengeHandler) {
  activeChallengeHandler = handler;
}

/**
 * Custom fetch wrapper that captures 402 status codes, invokes the Wallet Portal, and retries automatically.
 */
export async function securedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response = await window.fetch(input, init);

  // Check if the response matches x402 protocol specification
  if (response.status === 402) {
    console.log("[x402 Interceptor] Caught HTTP 402 Payment Required status. Extracting payment specifications...");

    // 1. Extract payment parameters from headers as required (support raw or base64 JSON)
    const paymentRequiredHeader = response.headers.get("PAYMENT-REQUIRED") || response.headers.get("payment-required");
    let requirements: PaymentRequirements | null = null;

    if (paymentRequiredHeader) {
      try {
        let rawJson = paymentRequiredHeader.trim();
        // Check if the header is base64 encoded
        if (!rawJson.startsWith("{") && !rawJson.startsWith("[")) {
          try {
            rawJson = atob(rawJson);
          } catch (b64Err) {
            console.warn("[x402 Interceptor] Header is not valid JSON and base64 decode failed. Treating as raw JSON...");
          }
        }

        const parsed = JSON.parse(rawJson);
        requirements = {
          paymentId: parsed.reference_id || parsed.paymentId || parsed.payment_id,
          amount: parseFloat(parsed.amount),
          currency: parsed.currency,
          receiver: parsed.pay_to_address || parsed.receiver,
          messageToSign: parsed.messageToSign || parsed.message_to_sign,
          accepts: parsed.accepts || [],
        };
        console.log("[x402 Interceptor] Parsed PAYMENT-REQUIRED header successfully:", requirements);
      } catch (e) {
        console.error("[x402 Interceptor] Failed to parse PAYMENT-REQUIRED header:", e);
      }
    }

    // 2. Fallback to parsing response body if header parsing was unavailable or restricted
    if (!requirements) {
      try {
        const clonedRes = response.clone();
        const body = await clonedRes.json();
        requirements = {
          paymentId: body.paymentId || body.reference_id || body.payment_id,
          amount: parseFloat(body.amount),
          currency: body.currency,
          receiver: body.receiver || body.pay_to_address,
          messageToSign: body.messageToSign || body.message_to_sign,
          accepts: body.accepts || [],
        };
        console.log("[x402 Interceptor] Parsed response body fallback:", requirements);
      } catch (e) {
        console.error("[x402 Interceptor] Failed to parse fallback response body for 402:", e);
      }
    }

    // 3. Trigger stateless Wallet Portal if handler is active
    if (requirements && activeChallengeHandler) {
      try {
        console.log("[x402 Interceptor] Launching stateless Custom Wallet Portal...");
        const { signature, donorWallet } = await activeChallengeHandler(requirements);

        // 4. Construct retry request payload with custom verification headers
        const newInit = { ...(init || {}) };
        const newHeaders = new Headers(newInit.headers || {});

        // Attach x402-compliant verification headers
        newHeaders.set("X-PAYMENT", signature);
        newHeaders.set("X-PAYMENT-SIGNATURE", signature);
        newHeaders.set("PAYMENT-SIGNATURE", signature);
        newHeaders.set("X-DONOR-WALLET", donorWallet);
        newHeaders.set("X-PAYMENT-ID", requirements.paymentId);
        newInit.headers = newHeaders;

        // Also update the body parameters if it's a JSON POST request
        if (newInit.body && typeof newInit.body === "string") {
          try {
            const bodyObj = JSON.parse(newInit.body);
            bodyObj.paymentId = requirements.paymentId;
            bodyObj.donorWallet = donorWallet;
            bodyObj.signature = signature;
            newInit.body = JSON.stringify(bodyObj);
          } catch (e) {
            // Body is not JSON or is invalid; fallback purely to headers
          }
        }

        console.log(`[x402 Interceptor] Retrying original request to ${input} with secure cryptographic payment proof...`);
        const retryRes = await window.fetch(input, newInit);
        return retryRes;
      } catch (err: any) {
        console.error("[x402 Interceptor] Interceptor retry aborted or failed:", err);
        throw err;
      }
    } else {
      console.warn("[x402 Interceptor] No active challenge handler registered or payment requirements failed parsing.");
    }
  }

  return response;
}
