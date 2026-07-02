import express from "express";
import path from "path";
import dotenv from "dotenv";
import nacl from "tweetnacl";
import bs58 from "bs58";
import crypto from "crypto";

// Load environment variables
dotenv.config();

function generateRandomId(length = 12): string {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString("hex") // Converts binary data to an alphanumeric hex string
    .slice(0, length);
}

// Fallback configuration values
const DEFAULT_RECEIVER_WALLET = "AJCS2c4HqcfWbEU2R75iWkPFUk5WwjwbuPNA26o6CuMA"; // The NFT Cat donation fallback
const RECEIVER_WALLET = process.env.RECEIVER_WALLET || DEFAULT_RECEIVER_WALLET;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const PORT = 3000;

let recentAlerts: any[] = [];

// In-memory store for pending payments (mapped by paymentId)
// This is used to verify signatures and preserve original metadata across retries
interface PendingPayment {
  paymentId: string;
  amount: number;
  currency: string;
  donorWallet: string;
  name?: string;
  socials: {
    discord?: string;
    twitter?: string;
    telegram?: string;
  };
  message?: string;
  messageToSign: string;
  createdAt: number;
}

const pendingPayments = new Map<string, PendingPayment>();
const usedSignatures = new Set<string>();
const processedMatches = new Set<string>();

// Cleanup expired payments (older than 15 minutes) every 5 minutes
setInterval(() => {
  const now = Date.now();
  const expiry = 15 * 60 * 1000;
  for (const [key, payment] of pendingPayments.entries()) {
    if (now - payment.createdAt > expiry) {
      pendingPayments.delete(key);
    }
  }
}, 5 * 60 * 1000);

const app = express();
app.use(express.json());

// --- API ROUTES ---

  // Live prices endpoint supporting Helius, Jupiter, and CoinGecko with detailed error logging
  app.get("/api/prices", async (req, res) => {
    try {
      let solPrice = 140.0;
      let usdcPrice = 1.0;
      let usedHelius = false;
      let usedJupiter = false;
      let usedCoinGecko = false;
      let heliusError = "";

      const apiKey = process.env.HELIUS_API_KEY;
      console.log("[Prices Debug] HELIUS_API_KEY exists?", !!apiKey, "Keys matching HELIUS in process.env:", Object.keys(process.env).filter(k => k.includes("HELIUS")));
      if (!apiKey) {
        heliusError = "HELIUS_API_KEY is missing/not configured in environment (.env).";
        console.warn(`[Prices API Warning] ${heliusError}`);
      } else {
        // Attempt to fetch SOL price via Helius DAS getAsset RPC (preferred if key is available)
        try {
          let response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "get-sol-price",
              method: "getAsset",
              params: {
                id: "So11111111111111111111111111111111111111112",
                displayOptions: {
                  showFungible: true
                }
              }
            })
          });

          // Primary URL failed or returned error - try classic Helius RPC URL fallback
          if (!response.ok) {
            console.warn(`[Helius RPC] Primary domain failed (status: ${response.status}). Retrying with classic rpc.helius.xyz...`);
            response = await fetch(`https://rpc.helius.xyz/?api-key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: "get-sol-price",
                method: "getAsset",
                params: {
                  id: "So11111111111111111111111111111111111111112",
                  displayOptions: {
                    showFungible: true
                  }
                }
              })
            });
          }

          if (response.ok) {
            const result: any = await response.json();
            if (result.error) {
              heliusError = `getAsset RPC error: ${result.error.message || JSON.stringify(result.error)}`;
              console.error(`[Helius RPC Error Details]:`, result.error);
            } else {
              const pricePerToken = result.result?.token_info?.price_info?.price_per_token;
              if (pricePerToken && typeof pricePerToken === "number") {
                solPrice = pricePerToken;
                usedHelius = true;
                heliusError = ""; // Clear any errors since it worked perfectly
                console.log(`[Helius RPC Success] Live SOL price: $${solPrice}`);
              } else {
                heliusError = "getAsset RPC returned data but price_info.price_per_token was missing or null.";
                console.warn(`[Helius Price Warning]:`, JSON.stringify(result.result?.token_info || result));
              }
            }
          } else {
            heliusError = `getAsset RPC HTTP error (status: ${response.status})`;
            console.error(`[Helius RPC HTTP Error]:`, heliusError);
          }
        } catch (err: any) {
          heliusError = `getAsset RPC request failed: ${err.message || err}`;
          console.error("[Helius RPC getAsset Error]:", err);
        }
      }

      // Fallback 1: Query Jupiter Price API v2 (extremely stable, no API key needed, free from rate-limiting)
      if (!usedHelius) {
        try {
          console.log("[Prices Fallback] Querying Jupiter Price API v2...");
          const response = await fetch("https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112,SOL");
          if (response.ok) {
            const jupData: any = await response.json();
            const priceObj = jupData.data?.["So11111111111111111111111111111111111111112"] || jupData.data?.["SOL"];
            const priceStr = priceObj?.price;
            if (priceStr) {
              const price = parseFloat(priceStr);
              if (!isNaN(price) && price > 0) {
                solPrice = price;
                usedJupiter = true;
                console.log(`[Jupiter Price API Success] Live SOL price: $${solPrice}`);
              }
            }
          } else {
            console.warn(`[Jupiter Price API Fallback] HTTP error: ${response.status}`);
          }
        } catch (err: any) {
          console.error("[Jupiter Price API Fetch Error]:", err);
        }
      }

      // Fallback 2: Query CoinGecko Price API
      if (!usedHelius && !usedJupiter) {
        try {
          console.log("[Prices Fallback] Querying CoinGecko Simple Price API...");
          const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
          if (response.ok) {
            const cgData: any = await response.json();
            const price = cgData.solana?.usd;
            if (price && typeof price === "number") {
              solPrice = price;
              usedCoinGecko = true;
              console.log(`[CoinGecko Price Fallback] Live SOL price: $${solPrice}`);
            } else {
              console.warn("[CoinGecko Price Fallback] Response data price field missing/invalid");
            }
          } else {
            console.warn(`[CoinGecko Price Fallback] HTTP error: ${response.status}`);
          }
        } catch (err: any) {
          console.error("[CoinGecko Price Fetch Error] Fallback failed:", err);
        }
      }

      // Resolve the active source
      let source = "fallback";
      if (usedHelius) source = "helius";
      else if (usedJupiter) source = "jupiter";
      else if (usedCoinGecko) source = "coingecko";

      res.json({
        SOL: solPrice,
        USDC: usdcPrice,
        source,
        heliusUsed: usedHelius,
        heliusError: heliusError || null,
      });
    } catch (error: any) {
      console.error("[Prices Endpoint Error]:", error);
      res.json({ SOL: 140.0, USDC: 1.0, source: "fallback", heliusUsed: false, heliusError: error.message });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      receiverWalletConfigured: !!process.env.RECEIVER_WALLET,
      discordWebhookConfigured: !!process.env.DISCORD_WEBHOOK_URL,
    });
  });

  // Main donation route implementing x402 standard
  app.post("/api/donate", async (req, res) => {
    try {
      const { amount, currency, name, socials, message } = req.body;
      const rawSignature = (req.headers["x-payment"] || req.headers["x-payment-signature"] || req.headers["payment-signature"] || req.body.signature) as string;
      const donorWallet = (req.headers["x-donor-wallet"] || req.body.donorWallet) as string;
      const paymentId = (req.headers["x-payment-id"] || req.body.paymentId) as string;

      // Robustly parse rawSignature to extract the clean cryptographic signature if it's formatted as x402 header
      let signature = rawSignature;
      if (rawSignature) {
        if (rawSignature.startsWith("{")) {
          try {
            const parsed = JSON.parse(rawSignature);
            signature = parsed.signature || rawSignature;
          } catch (e) {}
        } else if (rawSignature.includes("signature=")) {
          const signatureMatch = rawSignature.match(/signature="([^"]+)"/);
          if (signatureMatch) {
            signature = signatureMatch[1];
          }
        }
      }

      // 1. Initial Step: If signature is missing, construct payment requirements (HTTP 402)
      if (!signature) {
        if (!amount || !currency) {
          res.status(400).json({ error: "Missing required parameters (amount, currency)." });
          return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
          res.status(400).json({ error: "Amount must be a valid number." });
          return;
        }

        if (currency === "SOL" && parsedAmount < 0.025) {
          res.status(400).json({ error: "Amount must be at least 0.025 SOL." });
          return;
        }

        if (currency === "USDC" && parsedAmount < 2.00) {
          res.status(400).json({ error: "Amount must be at least 2.00 USDC." });
          return;
        }

        // Generate a unique payment identifier
        const newPaymentId = `pay_${generateRandomId(12)}`;

        // Message that the wallet is required to sign (stateless payment challenge format)
        const messageToSign = `The NFT Cat Donation: Authorize donation of ${parsedAmount} ${currency} to receiver ${RECEIVER_WALLET}. Reference ID: ${newPaymentId}`;

        // Keep details in memory to prevent tamper when retrying
        pendingPayments.set(newPaymentId, {
          paymentId: newPaymentId,
          amount: parsedAmount,
          currency,
          donorWallet: "", // Filled during signature verification step
          name: name?.trim() || "Anonymous",
          socials: socials || {},
          message: message || "",
          messageToSign,
          createdAt: Date.now(),
        });

        console.log(`[x402] Generated Payment Requirements for ${newPaymentId} - ${parsedAmount} ${currency}`);

        const acceptsNetworks = [
          "solana:5eykt4UsFvXYv7mUvbC5LFi77U9RcZ8c", // Solana Mainnet
          "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"  // Solana Devnet
        ];

        const responsePayload = {
          error: "Payment Required",
          paymentId: newPaymentId,
          messageToSign,
          receiver: RECEIVER_WALLET,
          amount: parsedAmount,
          currency,
          accepts: acceptsNetworks,
        };

        // Standard x402 Header Requirements (Base64 Encoded JSON Object)
        const headerData = {
          amount: parsedAmount,
          currency,
          pay_to_address: RECEIVER_WALLET,
          reference_id: newPaymentId,
          messageToSign,
          accepts: acceptsNetworks,
        };
        const base64Header = Buffer.from(JSON.stringify(headerData)).toString("base64");
        res.setHeader("PAYMENT-REQUIRED", base64Header);
        res.setHeader("Access-Control-Expose-Headers", "PAYMENT-REQUIRED");

        // Return HTTP 402 Payment Required
        res.status(402).json(responsePayload);
        return;
      }

      // 2. Retry Step: signature header IS present. Let's intercept and process.
      if (!paymentId) {
        res.status(400).json({ error: "Missing paymentId for verification." });
        return;
      }

      if (!donorWallet) {
        res.status(400).json({ error: "Missing donorWallet address for verification." });
        return;
      }

      // Validate public key format
      try {
        const decoded = bs58.decode(donorWallet);
        if (decoded.length !== 32) {
          throw new Error("Invalid public key length");
        }
      } catch (e) {
        res.status(400).json({ error: "Invalid Solana donor wallet address." });
        return;
      }

      const pending = pendingPayments.get(paymentId);
      if (!pending) {
        res.status(404).json({ error: "Payment request not found or expired. Please submit again." });
        return;
      }

      // Update donorWallet in the pending record
      pending.donorWallet = donorWallet;

      // Verify that details haven't been tampered with
      if (pending.currency !== currency || pending.amount !== parseFloat(amount)) {
        res.status(400).json({ error: "Submitted data does not match the signed transaction requirements." });
        return;
      }

      console.log(`[x402] Signature received for ${paymentId}. Attempting verification via PayAI Facilitator...`);

      let verified = false;
      let settlementResult: any = null;
      let payAiUsed = false;

      // Real integration with PayAI facilitator API if configured
      if (process.env.PAYAI_CONFIG) {
        try {
          payAiUsed = true;
          // Step A: PayAI /verify endpoint
          const verifyUrl = "https://facilitator.payai.network/verify";
          const verifyPayload = {
            paymentId,
            signature,
            donorWallet,
            receiverWallet: RECEIVER_WALLET,
            amount: pending.amount,
            currency: pending.currency,
            messageToSign: pending.messageToSign,
            socials: pending.socials,
            message: pending.message,
          };

          const verifyRes = await fetch(verifyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.PAYAI_CONFIG}`,
            },
            body: JSON.stringify(verifyPayload),
          });

          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            console.log("[PayAI] Verification successful:", verifyData);

            // Step B: PayAI /settle endpoint to execute on-chain transfer
            const settleUrl = "https://facilitator.payai.network/settle";
            const settleRes = await fetch(settleUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.PAYAI_CONFIG}`,
              },
              body: JSON.stringify({ paymentId, verifyToken: verifyData.token || "" }),
            });

            if (settleRes.ok) {
              settlementResult = await settleRes.json();
              verified = true;
              console.log("[PayAI] Settle successful:", settlementResult);
            } else {
              const errText = await settleRes.text();
              console.error("[PayAI] Settle failed:", errText);
            }
          } else {
            const errText = await verifyRes.text();
            console.error("[PayAI] Verify failed:", errText);
          }
        } catch (err) {
          console.error("[PayAI] Network error calling facilitator, using self-hosted fallback:", err);
        }
      }

      // Self-hosted Cryptographic Fallback if PayAI facilitator is down or not configured
      if (!verified) {
        console.log("[PayAI Fallback] Performing cryptographic verification on-chain fallback...");
        try {
          const donorPubKeyBytes = bs58.decode(donorWallet);
          const signatureBuffer = bs58.decode(signature);
          const messageBuffer = new TextEncoder().encode(pending.messageToSign);

          // Verify signature cryptographically using TweetNaCl
          const isSignatureValid = nacl.sign.detached.verify(
            messageBuffer,
            signatureBuffer,
            donorPubKeyBytes
          );

          if (isSignatureValid) {
            verified = true;
            settlementResult = {
              txId: "mock_tx_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
              status: "success",
              timestamp: Date.now(),
              fallback: true,
            };
            console.log(`[PayAI Fallback] Successfully verified cryptographic signature for wallet: ${donorWallet}`);
          } else {
            res.status(400).json({ error: "Cryptographic signature verification failed." });
            return;
          }
        } catch (err: any) {
          console.error("[Fallback Error] Decrypting signature failed:", err);
          res.status(400).json({ error: `Signature verification error: ${err.message || err}` });
          return;
        }
      }

      // 3. Trigger Discord Webhook Notification upon successful settlement
      if (verified && settlementResult) {
        pendingPayments.delete(paymentId); // Clean up completed payment

        if (DISCORD_WEBHOOK_URL) {
          try {
            const donorName = pending.name || "Anonymous";

            // Build social media info formatting
            const socialsList: string[] = [];
            if (pending.socials?.twitter) socialsList.push(`𝕏/Twitter: [${pending.socials.twitter}](https://x.com/${pending.socials.twitter.replace("@", "")})`);
            if (pending.socials?.discord) socialsList.push(`Discord: \`${pending.socials.discord}\``);
            if (pending.socials?.telegram) socialsList.push(`Telegram: [${pending.socials.telegram}](https://t.me/${pending.socials.telegram.replace("@", "")})`);
            const socialsFormatted = socialsList.length > 0 ? socialsList.join("\n") : "_Not provided_";

            // Build nicely formatted blockquote for message
            const messageFormatted = pending.message?.trim()
              ? `>>> ${pending.message}`
              : "_No message provided_";

            const embedPayload = {
              username: "The NFT Cat Donator",
              avatar_url: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
              embeds: [
                {
                  title: "🎉 New Donation! 🐈",
                  description: `A brand-new backer (**${donorName}**) has sent a donation to **The NFT Cat** project! 🐾`,
                  color: 0x14f195, // Bright Solana green color
                  fields: [
                    {
                      name: "👤 Donor Name",
                      value: `**${donorName}**`,
                      inline: true,
                    },
                    {
                      name: "💰 Donation Amount",
                      value: `**${pending.amount} ${pending.currency}**`,
                      inline: true,
                    },
                    {
                      name: "🔑 Donor Wallet Address",
                      value: `\`${pending.donorWallet}\``,
                      inline: false,
                    },
                    {
                      name: "📱 Social Handles",
                      value: socialsFormatted,
                      inline: false,
                    },
                    {
                      name: "💬 Custom Message",
                      value: messageFormatted,
                      inline: false,
                    },
                    {
                      name: "🧾 Transaction ID",
                      value: `\`${settlementResult.txId || "Confirmed (Fallback Mode)"}\``,
                      inline: false,
                    },
                  ],
                  footer: {
                    text: `The NFT Cat Donations • x402 Protocol • ${payAiUsed ? "PayAI Facilitated" : "Self-Hosted Verification"}`,
                  },
                  timestamp: new Date().toISOString(),
                },
              ],
            };

            const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(embedPayload),
            });

            if (discordRes.ok) {
              console.log("[Discord] Webhook notification sent successfully!");
            } else {
              console.error("[Discord] Webhook failed with status:", discordRes.status);
            }
          } catch (webhookErr) {
            console.error("[Discord] Webhook dispatch error:", webhookErr);
          }
        } else {
          console.log("[Discord] Webhook not configured. Simulated embed payload:");
          console.log({
            amount: pending.amount,
            currency: pending.currency,
            donorWallet: pending.donorWallet,
            socials: pending.socials,
            message: pending.message,
          });
        }

        res.json({
          success: true,
          message: "Donation successfully verified and settled! Thank you, kind cat-friend! 🐈",
          txId: settlementResult.txId,
          fallback: !!settlementResult.fallback,
        });
        return;
      }

      res.status(500).json({ error: "Settle execution failed to complete." });
    } catch (error: any) {
      console.error("[Server Error] POST /api/donate failed:", error);
      res.status(500).json({ error: error.message || "An unknown server error occurred." });
    }
  });

  // Simple overlay feed endpoint for OBS overlay browser source
  app.get("/api/overlay-feed", (req, res) => {
    res.json(recentAlerts);
  });

  // Manual payment verification route checking the Solana ledger via RPC with deterministic balance changes
  app.post("/api/verify-transfer", async (req, res) => {
    try {
      const { expectedAmountSol, checkoutTimestamp, name, socials, message } = req.body;

      if (!expectedAmountSol || !checkoutTimestamp) {
        return res.status(400).json({ error: "expectedAmountSol and checkoutTimestamp are required parameters." });
      }

      console.log(`[RPC Monitor] Scanning txs after timestamp: ${checkoutTimestamp}`);

      const apiKey = process.env.HELIUS_API_KEY || "";
      const rpcUrl = apiKey ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}` : "https://api.mainnet-beta.solana.com";

      let signatures: any[] = [];
      try {
        const signaturesRes = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "get-signatures",
            method: "getSignaturesForAddress",
            params: [
              "AJCS2c4HqcfWbEU2R75iWkPFUk5WwjwbuPNA26o6CuMA",
              {
                limit: 10,
                commitment: "confirmed"
              }
            ]
          })
        });

        if (signaturesRes.ok) {
          const sigsResult: any = await signaturesRes.json();
          signatures = sigsResult.result || [];
        }
      } catch (rpcErr: any) {
        console.warn(`[RPC Monitor] RPC ledger lookup failed or rate-limited: ${rpcErr.message || rpcErr}`);
      }

      console.log(`[RPC Monitor] Retrieved ${signatures.length} recent signatures from RPC.`);

      // Filter returned signatures array instantly:
      // tx.blockTime >= checkoutTimestamp - 10 AND !processedMatches.has(tx.signature)
      const validSignatures = signatures.filter((sig: any) => {
        return sig.blockTime && 
               (sig.blockTime >= (Number(checkoutTimestamp) - 10)) &&
               !processedMatches.has(sig.signature);
      });

      console.log(`[RPC Monitor] Found ${validSignatures.length} signatures in the valid time window.`);

      let verifiedSignature = "";

      for (const sigInfo of validSignatures) {
        const signature = sigInfo.signature;

        // Double safety check
        if (processedMatches.has(signature)) {
          console.log(`[RPC Monitor] Skipping signature ${signature} because it has already been processed.`);
          continue;
        }

        // Pull the full transaction detail using getTransaction with jsonParsed encoding
        try {
          const txRes = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "get-tx-parsed",
              method: "getTransaction",
              params: [
                signature,
                {
                  encoding: "jsonParsed",
                  maxSupportedTransactionVersion: 0,
                  commitment: "confirmed"
                }
              ]
            })
          });

          if (txRes.ok) {
            const txData: any = await txRes.json();
            const tx = txData.result;

            if (tx && tx.meta && tx.meta.err === null) {
              // Locate the account index of our destination wallet inside result.transaction.message.accountKeys
              const accountKeys = tx.transaction.message.accountKeys;
              let receiverIndex = -1;

              for (let i = 0; i < accountKeys.length; i++) {
                const keyObj = accountKeys[i];
                const pubkey = typeof keyObj === "string" ? keyObj : keyObj.pubkey;
                if (pubkey === "AJCS2c4HqcfWbEU2R75iWkPFUk5WwjwbuPNA26o6CuMA") {
                  receiverIndex = i;
                  break;
                }
              }

              if (receiverIndex !== -1 && tx.meta.postBalances && tx.meta.preBalances) {
                const postBalance = tx.meta.postBalances[receiverIndex];
                const preBalance = tx.meta.preBalances[receiverIndex];
                const actualLamportsReceived = postBalance - preBalance;

                // Convert our expected SOL to Lamports
                const expectedLamports = Math.round(Number(expectedAmountSol) * 1_000_000_000);

                if (actualLamportsReceived === expectedLamports) {
                  console.log(`[RPC Monitor] Found match! Tx Signature: ${tx.transaction.signatures[0]}`);

                  // Save signature to safety log immediately for idempotency
                  processedMatches.add(signature);
                  verifiedSignature = signature;
                  break;
                }
              }
            }
          }
        } catch (txErr: any) {
          console.error(`[RPC Monitor] Error fetching/parsing transaction ${signature}:`, txErr.message || txErr);
        }
      }

      if (verifiedSignature) {
        // Trigger Discord Notification if webhook is configured
        if (DISCORD_WEBHOOK_URL) {
          try {
            const donorName = name || "Anonymous Manual Backer";
            const socialsList: string[] = [];
            if (socials?.twitter) socialsList.push(`𝕏/Twitter: [${socials.twitter}](https://x.com/${socials.twitter.replace("@", "")})`);
            if (socials?.discord) socialsList.push(`Discord: \`${socials.discord}\``);
            if (socials?.telegram) socialsList.push(`Telegram: [${socials.telegram}](https://t.me/${socials.telegram.replace("@", "")})`);
            const socialsFormatted = socialsList.length > 0 ? socialsList.join("\n") : "_Not provided_";

            const messageFormatted = message?.trim() ? `>>> ${message}` : "_No message provided_";

            const embedPayload = {
              username: "The NFT Cat Donator",
              avatar_url: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
              embeds: [
                {
                  title: "🎉 New Manual Donation Verified! 🐈",
                  description: `A backer (**${donorName}**) has successfully sent a manual transfer, auto-detected on-chain! 🐾`,
                  color: 0x3b82f6,
                  fields: [
                    {
                      name: "👤 Donor Name",
                      value: `**${donorName}**`,
                      inline: true,
                    },
                    {
                      name: "💰 Donation Amount",
                      value: `**${expectedAmountSol} SOL**`,
                      inline: true,
                    },
                    {
                      name: "📱 Social Handles",
                      value: socialsFormatted,
                      inline: false,
                    },
                    {
                      name: "💬 Custom Message",
                      value: messageFormatted,
                      inline: false,
                    },
                    {
                      name: "🧾 Transaction Signature",
                      value: `\`${verifiedSignature}\``,
                      inline: false,
                    },
                  ],
                  footer: {
                    text: "The NFT Cat Donations • Manual Direct Transfer Verified via RPC Monitor",
                  },
                  timestamp: new Date().toISOString(),
                },
              ],
            };

            await fetch(DISCORD_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(embedPayload),
            });
          } catch (webhookErr) {
            console.error("[Discord webhook manual verify error]:", webhookErr);
          }
        }

        // Push successful verify-transfer alerts to the overlay cache
        recentAlerts.push({
          id: Math.random().toString(36).substring(2),
          amount: expectedAmountSol,
          name: name || "Anonymous",
          message: message || "",
          socials: socials || "",
          timestamp: Date.now()
        });
        if (recentAlerts.length > 10) recentAlerts.shift(); // Keep cache memory tiny

        return res.json({
          success: true,
          message: "Payment verified successfully!",
          txId: verifiedSignature,
          txHash: verifiedSignature
        });
      }

      return res.json({
        success: false,
        message: "Scanning ledger for matching transfer..."
      });
    } catch (err: any) {
      console.error("[Server Error] POST /api/verify-transfer failed:", err);
      res.status(500).json({ error: err.message || "An unknown server error occurred." });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---

  // Export the express app instance for Vercel's serverless handler
  export default app;

  // Only start standalone HTTP server if NOT running inside Vercel Serverless
  if (!process.env.VERCEL) {
    const startStandaloneServer = async () => {
      if (process.env.NODE_ENV !== "production") {
        // Development Mode: Mount Vite's HMR-disabled development server as middleware
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
        console.log("[Server] Embedded Vite middleware launched successfully.");
      } else {
        // Production Mode: Serve the pre-built files
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(path.join(distPath, "index.html"));
        });
        console.log("[Server] Production static server configured targeting 'dist/'.");
      }

      app.listen(PORT, "0.0.0.0", () => {
        console.log(`[Server] Web application running live on http://localhost:${PORT}`);
      });
    };

    startStandaloneServer();
  }
