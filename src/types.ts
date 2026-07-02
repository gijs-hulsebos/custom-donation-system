export interface SocialHandles {
  discord?: string;
  twitter?: string;
  telegram?: string;
}

export interface DonationPayload {
  amount: number;
  currency: "SOL" | "USDC";
  name?: string;
  socials?: SocialHandles;
  message?: string;
  donorWallet: string;
  paymentId?: string;
}

export interface PaymentRequirements {
  paymentId: string;
  messageToSign: string;
  receiver: string;
  amount: number;
  currency: "SOL" | "USDC";
  accepts?: string[];
}

export type WalletType = string | null;

export interface WalletState {
  publicKey: string | null;
  connected: boolean;
  type: WalletType;
  connecting: boolean;
}
