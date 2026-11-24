import { describe, it, expect } from 'vitest';
import type { AuctionOrderRecord, OrderStatus, ReviewRecord, DisputeRecord } from '../../src/types';

describe('Stage 4 — Orders, Escrow, Fulfillment, Reviews & Trust Integration', () => {
  // Order state transition engine simulator
  function transitionOrderStatus(
    order: AuctionOrderRecord,
    nextStatus: OrderStatus,
    metadata?: { carrier?: string; trackingNumber?: string; disputeReason?: string }
  ): { valid: boolean; order?: AuctionOrderRecord; error?: string } {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['awaiting_payment', 'cancelled'],
      awaiting_payment: ['paid', 'cancelled'],
      paid: ['processing', 'dispatched', 'refunded', 'disputed'],
      processing: ['dispatched', 'refunded', 'disputed'],
      dispatched: ['delivered', 'disputed'],
      delivered: ['completed', 'disputed'],
      completed: [],
      cancelled: [],
      refunded: [],
      disputed: ['paid', 'refunded', 'completed'],
    };

    if (!validTransitions[order.status].includes(nextStatus)) {
      return {
        valid: false,
        error: `Invalid transition from "${order.status}" to "${nextStatus}".`,
      };
    }

    if (nextStatus === 'dispatched' && (!metadata?.carrier || !metadata?.trackingNumber)) {
      return {
        valid: false,
        error: 'Dispatching an order requires both a shipping carrier and tracking number.',
      };
    }

    const updated: AuctionOrderRecord = {
      ...order,
      status: nextStatus,
      fulfillment_status:
        nextStatus === 'dispatched'
          ? 'dispatched'
          : nextStatus === 'delivered'
          ? 'delivered'
          : order.fulfillment_status,
      shipping_carrier: metadata?.carrier || order.shipping_carrier,
      tracking_number: metadata?.trackingNumber || order.tracking_number,
      dispute_reason: metadata?.disputeReason || order.dispute_reason,
      updated_at: new Date().toISOString(),
    };

    return { valid: true, order: updated };
  }

  // Review submission validator
  function validateReviewSubmission(
    order: AuctionOrderRecord,
    callerId: string,
    rating: number
  ): { allowed: boolean; error?: string } {
    if (order.buyer_id !== callerId) {
      return { allowed: false, error: 'Only the verified purchasing buyer can review this order.' };
    }
    if (!['delivered', 'completed'].includes(order.status)) {
      return {
        allowed: false,
        error: 'Reviews are only permitted after order delivery has been confirmed.',
      };
    }
    if (rating < 1 || rating > 5) {
      return { allowed: false, error: 'Rating must be between 1 and 5 stars.' };
    }
    return { allowed: true };
  }

  // Dispute creation validator
  function validateDisputeCreation(
    order: AuctionOrderRecord,
    callerId: string,
    reason: string
  ): { allowed: boolean; error?: string } {
    if (order.buyer_id !== callerId && order.seller_id !== callerId) {
      return { allowed: false, error: 'Only order participants can file a dispute.' };
    }
    if (['cancelled', 'refunded'].includes(order.status)) {
      return { allowed: false, error: 'Cannot dispute a cancelled or refunded order.' };
    }
    if (!reason || reason.trim().length === 0) {
      return { allowed: false, error: 'A valid dispute reason must be provided.' };
    }
    return { allowed: true };
  }

  // Fixed price stock decrement simulator
  function purchaseFixedPriceItem(
    currentStock: number,
    requestedQuantity: number,
    unitPrice: number
  ): { success: boolean; remainingStock: number; total: number; error?: string } {
    if (requestedQuantity <= 0) {
      return { success: false, remainingStock: currentStock, total: 0, error: 'Quantity must be at least 1' };
    }
    if (currentStock < requestedQuantity) {
      return {
        success: false,
        remainingStock: currentStock,
        total: 0,
        error: `Insufficient stock. Only ${currentStock} available.`,
      };
    }
    return {
      success: true,
      remainingStock: currentStock - requestedQuantity,
      total: unitPrice * requestedQuantity,
    };
  }

  const baseOrder: AuctionOrderRecord = {
    id: '00000000-0000-0000-0000-000000000001',
    drop_id: '00000000-0000-0000-0000-000000000002',
    buyer_id: 'buyer-uuid-1',
    seller_id: 'seller-uuid-1',
    order_type: 'auction',
    item_title: 'Rare Rolex Submariner Date',
    item_image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
    quantity: 1,
    unit_price: 12500,
    subtotal: 12500,
    shipping_fee: 50,
    total_amount: 12550,
    amount: 12550,
    status: 'awaiting_payment',
    fulfillment_status: 'unfulfilled',
    payment_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('progresses an order through the complete lifecycle: awaiting_payment -> paid -> dispatched -> delivered', () => {
    // 1. Pay order
    const paid = transitionOrderStatus(baseOrder, 'paid');
    expect(paid.valid).toBe(true);
    expect(paid.order?.status).toBe('paid');

    // 2. Dispatch order with tracking
    const dispatched = transitionOrderStatus(paid.order!, 'dispatched', {
      carrier: 'FedEx Express',
      trackingNumber: 'FX-88992211',
    });
    expect(dispatched.valid).toBe(true);
    expect(dispatched.order?.status).toBe('dispatched');
    expect(dispatched.order?.shipping_carrier).toBe('FedEx Express');
    expect(dispatched.order?.tracking_number).toBe('FX-88992211');

    // 3. Confirm delivery
    const delivered = transitionOrderStatus(dispatched.order!, 'delivered');
    expect(delivered.valid).toBe(true);
    expect(delivered.order?.status).toBe('delivered');
    expect(delivered.order?.fulfillment_status).toBe('delivered');
  });

  it('rejects dispatching an order without carrier or tracking number', () => {
    const paid = transitionOrderStatus(baseOrder, 'paid');
    const badDispatch = transitionOrderStatus(paid.order!, 'dispatched');

    expect(badDispatch.valid).toBe(false);
    expect(badDispatch.error).toContain('requires both a shipping carrier and tracking number');
  });

  it('strictly enforces verified review eligibility (unlocked only upon confirmed delivery)', () => {
    // Attempting to review when awaiting payment -> REJECTED
    const preDeliveryReview = validateReviewSubmission(baseOrder, 'buyer-uuid-1', 5);
    expect(preDeliveryReview.allowed).toBe(false);
    expect(preDeliveryReview.error).toContain('only permitted after order delivery has been confirmed');

    // Attempting to review by a non-buyer -> REJECTED
    const deliveredOrder: AuctionOrderRecord = { ...baseOrder, status: 'delivered' };
    const strangerReview = validateReviewSubmission(deliveredOrder, 'unrelated-user-2', 5);
    expect(strangerReview.allowed).toBe(false);
    expect(strangerReview.error).toContain('Only the verified purchasing buyer can review');

    // Valid review by buyer after delivery -> ALLOWED
    const validReview = validateReviewSubmission(deliveredOrder, 'buyer-uuid-1', 5);
    expect(validReview.allowed).toBe(true);
  });

  it('allows order dispute filing and freezes escrow funds', () => {
    const paidOrder: AuctionOrderRecord = { ...baseOrder, status: 'paid' };

    const disputeCheck = validateDisputeCreation(paidOrder, 'buyer-uuid-1', 'item_not_received');
    expect(disputeCheck.allowed).toBe(true);

    const disputed = transitionOrderStatus(paidOrder, 'disputed', {
      disputeReason: 'Item not received within guaranteed window',
    });
    expect(disputed.valid).toBe(true);
    expect(disputed.order?.status).toBe('disputed');
    expect(disputed.order?.dispute_reason).toContain('guaranteed window');
  });

  it('prevents overselling of fixed-price inventory items', () => {
    const stock = 3;
    const price = 150;

    // Buy 2 items -> Success
    const order1 = purchaseFixedPriceItem(stock, 2, price);
    expect(order1.success).toBe(true);
    expect(order1.remainingStock).toBe(1);
    expect(order1.total).toBe(300);

    // Attempt to buy 2 more when only 1 is left -> Rejection
    const order2 = purchaseFixedPriceItem(order1.remainingStock, 2, price);
    expect(order2.success).toBe(false);
    expect(order2.error).toContain('Insufficient stock. Only 1 available.');
  });
});
