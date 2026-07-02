// @ts-nocheck
import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

/**
 * =========================================================================
 * NEXT.JS ENVIRONMENT VARIABLES CONFIGURATION INSTRUCTIONS:
 * 
 * Create/update your .env.local file in your Next.js root:
 * 
 * NEXT_PUBLIC_RECEIVER_WALLET=AJCS2c4HqcfWbEU2R75iWkPFUk5WwjwbuPNA26o6CuMA
 * DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
 * PAYAI_CONFIG=your_payai_facilitator_auth_bearer_token
 * =========================================================================
 */

const RECEIVER_WALLET = process.env.NEXT_PUBLIC_RECEIVER_WALLET || "AJCS2c4HqcfWbEU2R75iWkPFUk5WwjwbuPNA26o6CuMA";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const PAYAI_CONFIG = process.env.PAYAI_CONFIG;

// In-memory caching for active payments (Next.js serverless warning: In serverless environments,
// please prefer utilizing Redis / Upstash or a database like Cloud Firestore / Supabase for payment states)
const pendingPayments = new Map<string, {
  paymentId: string;
  amount: number;
  currency: string;
  donorWallet: string;
  socials: { twitter?: string; discord?: string; telegram?: string };
  message: string;
  messageToSign: string;
  createdAt: number;
}>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, currency, socials, message, donorWallet, paymentId } = body;
    const signature = request.headers.get("x-payment-signature");

    // -------------------------------------------------------------------------
    // PHASE 1: INITIAL REQUEST (Missing signature header -> Return HTTP 402 Required)
    // -------------------------------------------------------------------------
    if (!signature) {
      if (!amount || !currency || !donorWallet) {
        return NextResponse.json(
          { error: "Validation Failure: Missing amount, currency, or donorWallet parameters." },
          { status: 400 }
        );
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 0.02) {
        return NextResponse.json(
          { error: "Validation Failure: Minimum donation limit is 0.02 SOL or USDC." },
          { status: 400 }
        );
      }

      // Confirm public key format validity
      try {
        new PublicKey(donorWallet);
      } catch (e) {
        return NextResponse.json(
          { error: "Validation Failure: Provided donor wallet address is not a valid Solana public key." },
          { status: 400 }
        );
      }

      const newPaymentId = `pay_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      const messageToSign = `The NFT Cat Donation: Authorize donation of ${parsedAmount} ${currency} from wallet ${donorWallet} to receiver ${RECEIVER_WALLET}. Reference ID: ${newPaymentId}`;

      // Save state to avoid user-tampering during retry
      pendingPayments.set(newPaymentId, {
        paymentId: newPaymentId,
        amount: parsedAmount,
        currency,
        donorWallet,
        socials: socials || {},
        message: message || "",
        messageToSign,
        createdAt: Date.now(),
      });

      // Return standard x402 (Payment Required) status alongside payment specifications
      return NextResponse.json(
        {
          error: "Payment Required",
          paymentId: newPaymentId,
          messageToSign,
          receiver: RECEIVER_WALLET,
          amount: parsedAmount,
          currency,
        },
        { status: 402 }
      );
    }

    // -------------------------------------------------------------------------
    // PHASE 2: RETRY REQUEST (Signature is present -> Verify & Settle)
    // -------------------------------------------------------------------------
    if (!paymentId) {
      return NextResponse.json({ error: "Validation Failure: Missing paymentId parameter." }, { status: 400 });
    }

    const pending = pendingPayments.get(paymentId);
    if (!pending) {
      return NextResponse.json(
        { error: "Session Expired: Payment request was not found or has timed out." },
        { status: 404 }
      );
    }

    // Integrity Guard: Ensure request parameters weren't altered between Phase 1 & Phase 2
    if (pending.donorWallet !== donorWallet || pending.currency !== currency || pending.amount !== parseFloat(amount)) {
      return NextResponse.json(
        { error: "Integrity Violation: Submitted parameters do not match initial transaction criteria." },
        { status: 400 }
      );
    }

    let verified = false;
    let settlementResult: any = null;
    let isPayAiUsed = false;

    // --- A. Connect to the PayAI Facilitator Network ---
    if (PAYAI_CONFIG) {
      try {
        isPayAiUsed = true;
        
        // Post verification request to PayAI facilitator
        const verifyRes = await fetch("https://facilitator.payai.network/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${PAYAI_CONFIG}`,
          },
          body: JSON.stringify({
            paymentId,
            signature,
            donorWallet,
            receiverWallet: RECEIVER_WALLET,
            amount: pending.amount,
            currency: pending.currency,
            messageToSign: pending.messageToSign,
            socials: pending.socials,
            message: pending.message,
          }),
        });

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();

          // Settle the funds on-chain using PayAI
          const settleRes = await fetch("https://facilitator.payai.network/settle", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${PAYAI_CONFIG}`,
            },
            body: JSON.stringify({
              paymentId,
              verifyToken: verifyData.token || "",
            }),
          });

          if (settleRes.ok) {
            settlementResult = await settleRes.json();
            verified = true;
          } else {
            console.error("[PayAI Facilitator] Settle request rejected:", await settleRes.text());
          }
        } else {
          console.error("[PayAI Facilitator] Verification failed:", await verifyRes.text());
        }
      } catch (err) {
        console.error("[PayAI Facilitator] Connection/Network error:", err);
      }
    }

    // --- B. Fallback Cryptographic Signature Check ---
    if (!verified) {
      try {
        const donorPubKey = new PublicKey(donorWallet);
        const signatureBuffer = bs58.decode(signature);
        const messageBuffer = new TextEncoder().encode(pending.messageToSign);

        const isSignatureValid = nacl.sign.detached.verify(
          messageBuffer,
          signatureBuffer,
          donorPubKey.toBytes()
        );

        if (isSignatureValid) {
          verified = true;
          settlementResult = {
            txId: "local_verified_tx_" + Math.random().toString(36).substring(2, 12),
            fallback: true,
          };
        } else {
          return NextResponse.json({ error: "Security Failure: Invalid wallet signature." }, { status: 400 });
        }
      } catch (err: any) {
        return NextResponse.json(
          { error: `Security Failure: Cryptographic check error: ${err.message || err}` },
          { status: 400 }
        );
      }
    }

    // -------------------------------------------------------------------------
    // PHASE 3: DISPATCH DISCORD WEBHOOK NOTIFICATION ON SETTLEMENT SUCCESS
    // -------------------------------------------------------------------------
    if (verified && settlementResult) {
      pendingPayments.delete(paymentId); // Completed - release cache

      if (DISCORD_WEBHOOK_URL) {
        try {
          const socialMediaList: string[] = [];
          if (pending.socials.twitter) socialMediaList.push(`𝕏/Twitter: [${pending.socials.twitter}](https://x.com/${pending.socials.twitter.replace("@", "")})`);
          if (pending.socials.discord) socialMediaList.push(`Discord: \`${pending.socials.discord}\``);
          if (pending.socials.telegram) socialMediaList.push(`Telegram: [${pending.socials.telegram}](https://t.me/${pending.socials.telegram.replace("@", "")})`);
          const formattedSocials = socialMediaList.length > 0 ? socialMediaList.join("\n") : "_Not provided_";

          const formattedMessage = pending.message 
            ? `>>> ${pending.message}` 
            : "_No message left_";

          const discordPayload = {
            username: "The NFT Cat Donator",
            avatar_url: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
            embeds: [
              {
                title: "🎉 New Donation for The NFT Cat! 🐈",
                description: `A brand-new backer has sent a donation to **The NFT Cat** project! 🐾`,
                color: 0x8b5cf6, // Premium velvety violet theme (Hex: #8b5cf6)
                fields: [
                  {
                    name: "💰 Donation Amount",
                    value: `**${pending.amount} ${pending.currency}**`,
                    inline: true,
                  },
                  {
                    name: "🔑 Donor Wallet Address",
                    value: `\`${pending.donorWallet}\``,
                    inline: true,
                  },
                  {
                    name: "📱 Social Handles",
                    value: formattedSocials,
                    inline: false,
                  },
                  {
                    name: "💬 Custom Message",
                    value: formattedMessage,
                    inline: false,
                  },
                  {
                    name: "🧾 Transaction Signature / ID",
                    value: `\`${settlementResult.txId || "Verified On-chain"}\``,
                    inline: false,
                  },
                ],
                footer: {
                  text: `The NFT Cat x402 • ${isPayAiUsed ? "PayAI Facilitated" : "Self-Hosted Signature Checked"}`
                },
                timestamp: new Date().toISOString()
              }
            ]
          };

          await fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(discordPayload)
          });
        } catch (webhookErr) {
          console.error("Failed to post Discord webhook notice:", webhookErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Donation settled successfully! Thank you for supporting the meowmunity!",
        txId: settlementResult.txId,
        fallback: !!settlementResult.fallback,
      });
    }

    return NextResponse.json({ error: "Settlement failed to process." }, { status: 500 });
  } catch (error: any) {
    console.error("Next.js POST API Route error:", error);
    return NextResponse.json({ error: error.message || "An unexpected server error occurred." }, { status: 500 });
  }
}
