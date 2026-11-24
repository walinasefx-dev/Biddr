import type { PaymentRecord } from '@/types';

export type PaymentMethod = 'card' | 'bank_transfer' | 'mobile_money' | 'test_mode';

export interface PaymentIntentParams {
  orderId: string;
  amount: number;
  currency?: string;
  buyerId: string;
  sellerId: string;
  paymentMethod?: PaymentMethod;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionReference: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  amount: number;
  currency: string;
  provider: string;
  error?: string;
  paymentRecord?: PaymentRecord;
}

export interface PaymentConfirmation {
  success: boolean;
  transactionReference: string;
  paidAt: string;
  amount: number;
  orderId: string;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundReference: string;
  amount: number;
  orderId: string;
  error?: string;
}

/**
 * Provider-independent payment interface.
 * Any real or simulated payment gateway (Stripe, Mobile Money, PayPal, etc.)
 * implements this contract.
 */
export interface PaymentProvider {
  name: string;
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentResult>;
  confirmPayment(transactionReference: string): Promise<PaymentConfirmation>;
  refundPayment(transactionReference: string, amount: number, reason?: string): Promise<RefundResult>;
}
