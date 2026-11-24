import type { ReviewRecord, DisputeRecord } from '@/types';

export type { ReviewRecord, DisputeRecord };

export interface CreateReviewInput {
  orderId: string;
  sellerId: string;
  rating: number;
  comment?: string;
}

export interface RaiseDisputeInput {
  orderId: string;
  reason: 'item_not_received' | 'item_damaged' | 'not_as_described' | 'unauthorized_charge' | 'other';
  description: string;
}
