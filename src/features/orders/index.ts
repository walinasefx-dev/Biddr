export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'escrow_held'
  | 'shipped'
  | 'delivered'
  | 'released'
  | 'cancelled';

export interface OrderItem {
  id: string;
  dropId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: OrderStatus;
  createdAt: string;
}
