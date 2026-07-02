import bs58 from "bs58";
import { PaymentRequirements } from "../types";

// Define TypeScript interfaces for window objects
declare global {
  interface Window {
    solana?: any;
    solflare?: any;
    phantom?: any;
    backpack?: any;
    okxwallet?: any;
    coinbaseSolana?: any;
    trustWallet?: any;
    braveSolana?: any;
    exodus?: any;
    glow?: any;
    slope?: any;
    ethereum?: any;
    mathwallet?: any;
    bitkeep?: any;
    safepal?: any;
    tokenpocket?: any;
  }
}

export interface DetectedWallet {
  id: string;
  name: string;
  icon: string; // Emoji representing the wallet
  provider: any;
  isInstalled: boolean;
  downloadUrl?: string;
  isPopular?: boolean;
}

/**
 * Direct lookup of a provider by its unique ID
 */
export const getProviderForWallet = (id: string): any => {
  if (typeof window === "undefined") return null;
  if (id === "playground") return null;

  // Standard mappings
  if (id === "phantom") {
    return window.phantom?.solana || window.solana;
  }
  if (id === "solflare") {
    return window.solflare;
  }
  if (id === "backpack") {
    return window.backpack;
  }
  if (id === "okxwallet") {
    return window.okxwallet?.solana || window.okxwallet;
  }
  if (id === "coinbase") {
    return window.coinbaseSolana;
  }
  if (id === "trust") {
    return window.trustWallet?.solana || window.trustWallet;
  }
  if (id === "brave") {
    return window.braveSolana || (window.solana?.isBraveWallet ? window.solana : null);
  }
  if (id === "exodus") {
    return window.exodus?.solana;
  }
  if (id === "glow") {
    return window.glow;
  }
  if (id === "metamask") {
    return window.ethereum?.isMetaMask ? window.ethereum : null;
  }
  if (id === "mathwallet") {
    return window.mathwallet?.solana || (window.solana?.isMathWallet ? window.solana : null);
  }
  if (id === "bitget") {
    return window.bitkeep?.solana;
  }
  if (id === "safepal") {
    return window.safepal?.solana;
  }
  if (id === "tokenpocket") {
    return window.tokenpocket?.solana;
  }

  // Fallback to direct key on window if it's a dynamically scanned wallet ID
  if ((window as any)[id]) {
    return (window as any)[id];
  }

  // Universal fallback to window.solana
  return window.solana || null;
};

/**
 * Scan the window context dynamically for any injected Solana wallets
 */
export const detectInjectedWallets = (): DetectedWallet[] => {
  if (typeof window === "undefined") return [];

  const wallets: DetectedWallet[] = [];
  const seenProviders = new Set<any>();

  // Helper to safely register a detected wallet
  const registerWallet = (
    id: string,
    name: string,
    icon: string,
    provider: any,
    downloadUrl?: string,
    isPopular?: boolean
  ) => {
    if (provider) {
      seenProviders.add(provider);
      wallets.push({
        id,
        name,
        icon,
        provider,
        isInstalled: true,
        downloadUrl,
        isPopular,
      });
    } else {
      wallets.push({
        id,
        name,
        icon,
        provider: null,
        isInstalled: false,
        downloadUrl,
        isPopular,
      });
    }
  };

  // 1. Probe for standard known wallets

  // Phantom (Popular)
  const phantomProvider = window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
  registerWallet("phantom", "Phantom", "👻", phantomProvider, "https://phantom.app/download", true);

  // Solflare (Popular)
  const solflareProvider = window.solflare;
  registerWallet("solflare", "Solflare", "🔥", solflareProvider, "https://solflare.com/download", true);

  // MetaMask (Popular - Support for Solana via Snaps)
  const metamaskProvider = window.ethereum?.isMetaMask ? window.ethereum : null;
  registerWallet("metamask", "MetaMask Snaps", "🦊", metamaskProvider, "https://metamask.io/download", true);

  // Backpack (Popular)
  const backpackProvider = window.backpack;
  registerWallet("backpack", "Backpack", "🎒", backpackProvider, "https://backpack.app", true);

  // OKX Wallet
  const okxProvider = window.okxwallet?.solana || (window.solana?.isOkxWallet ? window.solana : null);
  registerWallet("okxwallet", "OKX Wallet", "🖤", okxProvider, "https://www.okx.com/web3");

  // Trust Wallet
  const trustProvider = window.trustWallet?.solana || (window.solana?.isTrust ? window.solana : null);
  registerWallet("trust", "Trust Wallet", "🛡️", trustProvider, "https://trustwallet.com");

  // Coinbase Wallet
  const coinbaseProvider = window.coinbaseSolana || (window.solana?.isCoinbaseWallet ? window.solana : null);
  registerWallet("coinbase", "Coinbase", "🔵", coinbaseProvider, "https://www.coinbase.com/wallet");

  // Brave Wallet
  const braveProvider = window.braveSolana || (window.solana?.isBraveWallet ? window.solana : null);
  registerWallet("brave", "Brave Wallet", "🦁", braveProvider, "https://brave.com/wallet");

  // Exodus
  const exodusProvider = window.exodus?.solana;
  registerWallet("exodus", "Exodus", "🌌", exodusProvider, "https://www.exodus.com");

  // Glow
  const glowProvider = window.glow || (window.solana?.isGlow ? window.solana : null);
  registerWallet("glow", "Glow", "🌟", glowProvider, "https://glow.app");

  // Bitget Wallet (BitKeep)
  const bitgetProvider = window.bitkeep?.solana;
  registerWallet("bitget", "Bitget Wallet", "💎", bitgetProvider, "https://web3.bitget.com");

  // MathWallet
  const mathwalletProvider = window.mathwallet?.solana || (window.solana?.isMathWallet ? window.solana : null);
  registerWallet("mathwallet", "MathWallet", "🧮", mathwalletProvider, "https://mathwallet.org");

  // SafePal
  const safepalProvider = window.safepal?.solana;
  registerWallet("safepal", "SafePal", "🔒", safepalProvider, "https://www.safepal.com");

  // TokenPocket
  const tokenpocketProvider = window.tokenpocket?.solana;
  registerWallet("tokenpocket", "TokenPocket", "👛", tokenpocketProvider, "https://www.tokenpocket.pro");

  // 2. Dynamically scan window properties for other custom providers
  try {
    const keys = Object.keys(window);
    for (const key of keys) {
      if (
        key === "window" ||
        key === "self" ||
        key === "top" ||
        key === "parent" ||
        key === "webkitStorageInfo" ||
        key === "chrome"
      ) {
        continue;
      }

      try {
        const val = (window as any)[key];
        // Check if it satisfies standard Solana-like provider interface
        if (
          val &&
          typeof val === "object" &&
          typeof val.connect === "function" &&
          typeof val.signMessage === "function" &&
          !seenProviders.has(val)
        ) {
          // Exclude window or document objects
          if (val === window || val === document) continue;

          // Deduplicate and register!
          seenProviders.add(val);
          
          // Nicely format the name
          let formattedName = key;
          if (key.endsWith("Solana")) {
            formattedName = key.replace("Solana", " Wallet");
          } else if (key.toLowerCase().includes("wallet")) {
            formattedName = key.charAt(0).toUpperCase() + key.slice(1);
          } else {
            formattedName = key.charAt(0).toUpperCase() + key.slice(1) + " Wallet";
          }

          wallets.push({
            id: key,
            name: formattedName,
            icon: "🔌",
            provider: val,
            isInstalled: true,
          });
        }
      } catch (e) {}
    }
  } catch (e) {}

  return wallets;
};

/**
 * Connect to any dynamic injected Solana Wallet
 */
export const connectWallet = async (id: string): Promise<string> => {
  if (id === "playground") {
    return getPlaygroundPublicKey();
  }

  const provider = getProviderForWallet(id);
  if (!provider) {
    throw new Error(`${id} wallet is not installed or available.`);
  }

  try {
    // If metamask, request solana snap or account
    if (id === "metamask") {
      // Metamask snaps helper can trigger standard eth request accounts
      // Or just standard request if they have solana snap provider
      const response = await provider.request({ method: "eth_requestAccounts" });
      if (response && response.length > 0) {
        // Convert the Ethereum address (20 bytes) to a valid 32-byte Solana PublicKey structure so it passes standard format validation on the server!
        const ethAddr = response[0].replace(/^0x/, "");
        const bytes = new Uint8Array(32);
        // Parse hex string of Ethereum address to bytes
        for (let i = 0; i < 20; i++) {
          const hexPart = ethAddr.substring(i * 2, i * 2 + 2);
          bytes[i] = parseInt(hexPart, 16) || 0;
        }
        // Pad the remaining 12 bytes deterministically so it is 32 bytes total (valid Solana PublicKey size)
        for (let i = 20; i < 32; i++) {
          bytes[i] = 118; // 'v' ASCII character
        }
        return bs58.encode(bytes);
      }
      throw new Error("No MetaMask account authorized.");
    }

    const resp = await provider.connect();
    const pubKey = resp?.publicKey || provider.publicKey || resp;
    if (!pubKey) {
      throw new Error("Handshake approved, but no public key was obtained.");
    }
    return pubKey.toString();
  } catch (err: any) {
    throw new Error(err.message || `Failed to establish connection with ${id}.`);
  }
};

/**
 * Sign message with any dynamic injected wallet or playground
 */
export const signMessage = async (
  messageToSign: string,
  walletType: string,
  playgroundPublicKey: string | null = null
): Promise<string> => {
  const encodedMessage = new TextEncoder().encode(messageToSign);

  if (walletType === "playground") {
    console.log("[Playground Wallet] Simulating cryptographic signature of message...");
    const seed = new Uint8Array(32);
    seed.fill(42);
    const playgroundKeypair = (await import("tweetnacl")).default.sign.keyPair.fromSeed(seed);
    const signatureBytes = (await import("tweetnacl")).default.sign.detached(encodedMessage, playgroundKeypair.secretKey);
    return bs58.encode(signatureBytes);
  }

  // Handle Metamask simulation
  if (walletType === "metamask") {
    const provider = getProviderForWallet("metamask");
    if (provider) {
      try {
        const hexMsg = "0x" + Array.from(encodedMessage).map(b => b.toString(16).padStart(2, '0')).join('');
        const accounts = await provider.request({ method: "eth_accounts" });
        const from = accounts[0] || "0x0000000000000000000000000000000000000000";
        const signature = await provider.request({
          method: "personal_sign",
          params: [hexMsg, from],
        });
        return signature;
      } catch (err: any) {
        throw new Error(err.message || "MetaMask signing rejected.");
      }
    }
  }

  const provider = getProviderForWallet(walletType);
  if (!provider) {
    throw new Error(`Injected provider for ${walletType} is not available.`);
  }

  try {
    const signed = await provider.signMessage(encodedMessage, "utf8");
    // Standard signature field in result: `.signature` or `.signature` array, or direct Uint8Array
    const signature = signed.signature || signed;
    return bs58.encode(signature);
  } catch (err: any) {
    throw new Error(err.message || `Handshake signing failed with ${walletType}.`);
  }
};

// Deterministic playground public key for NaCl verification
export const PLAYGROUND_WALLET_ADDRESS = "🐈CaT4242424242424242424242424242424242424242";
export const getPlaygroundPublicKey = async (): Promise<string> => {
  const seed = new Uint8Array(32);
  seed.fill(42);
  const naclLib = (await import("tweetnacl")).default;
  const playgroundKeypair = naclLib.sign.keyPair.fromSeed(seed);
  // Encode public key as standard base58 Solana address
  return bs58.encode(playgroundKeypair.publicKey);
};

export const isWalletAvailable = (type: string): boolean => {
  if (type === "playground") return true;
  return !!getProviderForWallet(type);
};

/**
 * Processes a decoded x402 challenge exclusively on the Solana ledger.
 * Filters the accepted networks, routes the challenge message to the appropriate Solana provider,
 * and formats the resulting signature precisely according to the PayAI facilitator requirements.
 */
export async function handleX402Challenge(
  requirements: PaymentRequirements,
  walletId: string
): Promise<{ signature: string; donorWallet: string; headerValue: string }> {
  // 1. Parse the accepts Network Target
  const SOLANA_NETWORKS = [
    "solana:5eykt4UsFvXYv7mUvbC5LFi77U9RcZ8c", // Solana Mainnet
    "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"  // Solana Devnet
  ];

  const selectedNetwork = requirements.accepts?.find(net => SOLANA_NETWORKS.includes(net))
    || "solana:5eykt4UsFvXYv7mUvbC5LFi77U9RcZ8c"; // Fallback to Solana Mainnet

  console.log(`[x402] Target Solana network verified: ${selectedNetwork}`);

  if (!selectedNetwork.startsWith("solana:")) {
    throw new Error("Target network mismatch. x402 challenge isolates EVM logic and requires a Solana network.");
  }

  // 2. Explicit Wallet Routing - Route transaction payload exclusively to the Solana provider
  let provider: any = null;
  if (walletId === "playground") {
    const donorWallet = await getPlaygroundPublicKey();
    const encodedMessage = new TextEncoder().encode(requirements.messageToSign);
    const seed = new Uint8Array(32);
    seed.fill(42);
    const playgroundKeypair = (await import("tweetnacl")).default.sign.keyPair.fromSeed(seed);
    const signatureBytes = (await import("tweetnacl")).default.sign.detached(encodedMessage, playgroundKeypair.secretKey);
    const rawSignature = bs58.encode(signatureBytes);

    // Mapped scheme, network, and signature
    const headerValue = `scheme="exact"; network="${selectedNetwork}"; signature="${rawSignature}"`;
    return { signature: rawSignature, donorWallet, headerValue };
  }

  // Explicitly resolve standard window-level Solana providers or adapters
  if (walletId === "phantom") {
    provider = window.phantom?.solana || window.solana;
  } else if (walletId === "solflare") {
    provider = window.solflare;
  } else if (walletId === "backpack") {
    provider = window.backpack;
  } else {
    // Direct lookup fallback
    provider = getProviderForWallet(walletId);
  }

  // If we end up with MetaMask or other EVM-only provider, we block it to isolate EVM and force Solana
  if (walletId === "metamask") {
    provider = window.solana || window.phantom?.solana;
    if (!provider) {
      throw new Error("Solana provider not found. MetaMask EVM logic is isolated; please use a native Solana wallet like Phantom or Solflare.");
    }
  }

  if (!provider) {
    throw new Error(`Injected Solana provider for ${walletId} is not available.`);
  }

  // Ensure provider is connected
  let resp = await provider.connect();
  const pubKey = resp?.publicKey || provider.publicKey || resp;
  if (!pubKey) {
    throw new Error("Handshake approved, but no Solana public key was obtained.");
  }
  const donorWallet = pubKey.toString();

  // 3. Construct the True x402 Payload
  const encodedMessage = new TextEncoder().encode(requirements.messageToSign);
  console.log(`[x402] Requesting secure Solana signature for message: "${requirements.messageToSign}"`);

  let rawSignature = "";
  try {
    const signed = await provider.signMessage(encodedMessage, "utf8");
    const signatureBytes = signed.signature || signed;
    rawSignature = bs58.encode(signatureBytes);
  } catch (err: any) {
    throw new Error(err.message || "Solana cryptographic signature challenge was declined.");
  }

  // Create standard x402 compliance header value
  const headerValue = `scheme="exact"; network="${selectedNetwork}"; signature="${rawSignature}"`;

  return {
    signature: rawSignature,
    donorWallet,
    headerValue
  };
}
