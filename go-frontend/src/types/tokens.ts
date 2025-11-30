export interface TokenUsage {
  currentMonth: string;
  tokensUsed: number;
  limit: number;
  lastResetDate: string;
  overdraftAllowed: boolean;
}

export interface TokenPackage {
  _id?: string;
  id: string;
  name: string;
  description: string;
  tokens: number;
  price: number;
  currency: string;
  stripePriceId?: string;
  popular?: boolean;
  bonusPercentage?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherCode {
  _id?: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  minimumPurchase?: number;
  applicablePackages?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface TokenPurchase {
  _id?: string;
  userId: string;
  packageId: string;
  tokensAdded: number;
  amountPaid: number;
  currency: string;
  voucherCode?: string;
  stripePaymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequest {
  packageId: string;
  voucherCode?: string;
}

export interface VoucherValidation {
  valid: boolean;
  discount?: {
    type: 'percentage' | 'fixed_tokens' | 'fixed_amount';
    value: number;
    tokens?: number;
  };
  error?: string;
}