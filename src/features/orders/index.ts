import type { AuctionOrderRecord, OrderStatus, FulfillmentStatus, PaymentStatus, OrderType } from '@/types';

export type { OrderStatus, FulfillmentStatus, PaymentStatus, OrderType };
export type OrderItem = AuctionOrderRecord;

export interface OrderFilterState {
  status?: OrderStatus | 'all';
  searchQuery?: string;
}

export interface FulfillmentUpdateParams {
  orderId: string;
  carrier: string;
  trackingNumber: string;
}

export interface ShippingAddressInput {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
