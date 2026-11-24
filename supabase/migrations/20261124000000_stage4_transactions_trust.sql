-- ============================================================
-- BIDDR STAGE 4: TRANSACTIONS, ORDERS, PAYMENTS, AUCTION MODES & TRUST
-- Migration: 20261124000000_stage4_transactions_trust.sql
-- ============================================================

-- 1. EXTEND DROPS TABLE WITH FIXED-PRICE AND INVENTORY CAPABILITIES
ALTER TABLE public.drops
    ADD COLUMN IF NOT EXISTS is_fixed_price BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS fixed_price NUMERIC(12,2) CHECK (fixed_price >= 0),
    ADD COLUMN IF NOT EXISTS inventory_count INTEGER NOT NULL DEFAULT 1 CHECK (inventory_count >= 0);

-- 2. EXTEND ORDERS TABLE WITH COMPREHENSIVE FULFILLMENT & PAYMENT FIELDS
-- Drop foreign key NOT NULL on drop_id so orders can represent general items if needed
ALTER TABLE public.orders ALTER COLUMN drop_id DROP NOT NULL;

-- Expand order status constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders 
    ADD CONSTRAINT orders_status_check 
    CHECK (status IN (
        'pending',
        'awaiting_payment',
        'paid',
        'processing',
        'dispatched',
        'delivered',
        'completed',
        'cancelled',
        'refunded',
        'disputed'
    ));

-- Add columns for order metadata, shipping, and payment tracking
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'auction' CHECK (order_type IN ('auction', 'fixed_price')),
    ADD COLUMN IF NOT EXISTS item_title TEXT,
    ADD COLUMN IF NOT EXISTS item_image_url TEXT,
    ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS shipping_name TEXT,
    ADD COLUMN IF NOT EXISTS shipping_address TEXT,
    ADD COLUMN IF NOT EXISTS shipping_city TEXT,
    ADD COLUMN IF NOT EXISTS shipping_state TEXT,
    ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT,
    ADD COLUMN IF NOT EXISTS shipping_country TEXT DEFAULT 'US',
    ADD COLUMN IF NOT EXISTS shipping_carrier TEXT,
    ADD COLUMN IF NOT EXISTS tracking_number TEXT,
    ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' 
        CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'dispatched', 'delivered')),
    ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'test_mode',
    ADD COLUMN IF NOT EXISTS payment_reference TEXT,
    ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

-- Update existing orders to populate total_amount from amount if zero
UPDATE public.orders 
SET total_amount = amount, 
    unit_price = amount,
    item_title = COALESCE(item_title, 'Auction Item')
WHERE total_amount = 0.00;

-- 3. CREATE PAYMENTS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    provider TEXT NOT NULL DEFAULT 'test_mode',
    transaction_reference TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
    idempotency_key TEXT UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CREATE PERSISTENT NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'outbid',
        'auction_won',
        'payment_required',
        'payment_confirmed',
        'order_dispatched',
        'order_delivered',
        'order_received',
        'dispute_raised',
        'catalogue_next_lot',
        'system'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CREATE AUCTION SESSIONS TABLE (THE THREE AUCTION MODES)
-- Mode 1: catalogue_live (Catalogue + Live Host)
-- Mode 2: catalogue_automated (Catalogue Without Live Host)
-- Mode 3: host_controlled (Host-Controlled Live Auction)
CREATE TABLE IF NOT EXISTS public.auction_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    mode TEXT NOT NULL DEFAULT 'catalogue_automated' 
        CHECK (mode IN ('catalogue_live', 'catalogue_automated', 'host_controlled')),
    status TEXT NOT NULL DEFAULT 'scheduled' 
        CHECK (status IN ('draft', 'scheduled', 'live', 'paused', 'ended')),
    current_lot_index INTEGER NOT NULL DEFAULT 0,
    total_lots INTEGER NOT NULL DEFAULT 0,
    scheduled_start TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    stream_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CREATE AUCTION LOTS TABLE (SEQUENTIAL CATALOGUE ITEMS)
CREATE TABLE IF NOT EXISTS public.auction_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.auction_sessions(id) ON DELETE CASCADE,
    drop_id UUID NOT NULL REFERENCES public.drops(id) ON DELETE CASCADE,
    lot_number INTEGER NOT NULL CHECK (lot_number > 0),
    duration_seconds INTEGER NOT NULL DEFAULT 60 CHECK (duration_seconds > 0),
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'active', 'sold', 'unsold', 'skipped')),
    started_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_session_lot_number UNIQUE (session_id, lot_number)
);

-- 7. CREATE REVIEWS TABLE (BUYER RATINGS FOR SELLERS)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CREATE DISPUTES TABLE (ORDER ISSUE TRACKING & RESOLUTION)
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    raised_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('item_not_received', 'item_damaged', 'not_as_described', 'unauthorized_charge', 'other')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_buyer', 'resolved_seller', 'closed')),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Orders: Allow buyers and sellers to update their orders (e.g. tracking, address, delivery confirmation)
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders"
    ON public.orders FOR UPDATE
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Payments: Only buyer or seller involved can view payment records
DROP POLICY IF EXISTS "Participants can view their payments" ON public.payments;
CREATE POLICY "Participants can view their payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers can initiate payment" ON public.payments;
CREATE POLICY "Buyers can initiate payment"
    ON public.payments FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);

-- Notifications: Only the user can view and update (mark read) their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Auction Sessions: Public can view non-draft sessions; sellers manage their own
DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON public.auction_sessions;
CREATE POLICY "Sessions are viewable by everyone"
    ON public.auction_sessions FOR SELECT
    USING (status != 'draft' OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can manage their own sessions" ON public.auction_sessions;
CREATE POLICY "Sellers can manage their own sessions"
    ON public.auction_sessions FOR ALL
    USING (auth.uid() = seller_id);

-- Auction Lots: Public can view lots; session owner can manage lots
DROP POLICY IF EXISTS "Lots are viewable by everyone" ON public.auction_lots;
CREATE POLICY "Lots are viewable by everyone"
    ON public.auction_lots FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Sellers can manage lots for their sessions" ON public.auction_lots;
CREATE POLICY "Sellers can manage lots for their sessions"
    ON public.auction_lots FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.auction_sessions s
            WHERE s.id = auction_lots.session_id AND s.seller_id = auth.uid()
        )
    );

-- Reviews: Viewable by everyone; insertable only by the verified buyer of a delivered order
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone"
    ON public.reviews FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Buyers can review delivered orders" ON public.reviews;
CREATE POLICY "Buyers can review delivered orders"
    ON public.reviews FOR INSERT
    WITH CHECK (
        auth.uid() = buyer_id AND
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = reviews.order_id 
              AND o.buyer_id = auth.uid() 
              AND o.status IN ('delivered', 'completed')
        )
    );

-- Disputes: Viewable by buyer or seller involved; insertable by buyer or seller
DROP POLICY IF EXISTS "Order participants can view disputes" ON public.disputes;
CREATE POLICY "Order participants can view disputes"
    ON public.disputes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = disputes.order_id 
              AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Order participants can raise disputes" ON public.disputes;
CREATE POLICY "Order participants can raise disputes"
    ON public.disputes FOR INSERT
    WITH CHECK (
        auth.uid() = raised_by AND
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = disputes.order_id 
              AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        )
    );

-- ============================================================
-- STORED PROCEDURES & ATOMIC BUSINESS LOGIC
-- ============================================================

-- 1. ATOMIC FIXED-PRICE PURCHASE RPC
CREATE OR REPLACE FUNCTION public.purchase_fixed_price(
    p_drop_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_shipping_name TEXT DEFAULT '',
    p_shipping_address TEXT DEFAULT '',
    p_shipping_city TEXT DEFAULT '',
    p_shipping_state TEXT DEFAULT '',
    p_shipping_postal_code TEXT DEFAULT '',
    p_shipping_country TEXT DEFAULT 'US'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_id UUID;
    v_drop public.drops%ROWTYPE;
    v_order_id UUID;
    v_subtotal NUMERIC(12,2);
    v_total NUMERIC(12,2);
    v_now TIMESTAMPTZ := NOW();
BEGIN
    v_buyer_id := auth.uid();
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to make a purchase';
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be at least 1';
    END IF;

    -- Lock the listing row atomically to prevent overselling
    SELECT * INTO v_drop
    FROM public.drops
    WHERE id = p_drop_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF NOT v_drop.is_fixed_price THEN
        RAISE EXCEPTION 'This listing is an auction and cannot be purchased directly at fixed price';
    END IF;

    IF v_drop.inventory_count < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Only % items available.', v_drop.inventory_count;
    END IF;

    IF v_drop.seller_id = v_buyer_id THEN
        RAISE EXCEPTION 'Sellers cannot purchase their own products';
    END IF;

    v_subtotal := COALESCE(v_drop.fixed_price, v_drop.starting_price) * p_quantity;
    v_total := v_subtotal; -- shipping can be added separately

    -- Decrement inventory atomically
    UPDATE public.drops
    SET inventory_count = inventory_count - p_quantity,
        updated_at = v_now
    WHERE id = p_drop_id;

    -- Create order record
    INSERT INTO public.orders (
        drop_id,
        buyer_id,
        seller_id,
        order_type,
        item_title,
        item_image_url,
        quantity,
        unit_price,
        subtotal,
        total_amount,
        amount,
        shipping_name,
        shipping_address,
        shipping_city,
        shipping_state,
        shipping_postal_code,
        shipping_country,
        status,
        payment_status,
        payment_due_at,
        created_at,
        updated_at
    ) VALUES (
        p_drop_id,
        v_buyer_id,
        v_drop.seller_id,
        'fixed_price',
        v_drop.title,
        v_drop.image_url,
        p_quantity,
        COALESCE(v_drop.fixed_price, v_drop.starting_price),
        v_subtotal,
        v_total,
        v_total,
        p_shipping_name,
        p_shipping_address,
        p_shipping_city,
        p_shipping_state,
        p_shipping_postal_code,
        p_shipping_country,
        'awaiting_payment',
        'pending',
        v_now + INTERVAL '48 hours',
        v_now,
        v_now
    ) RETURNING id INTO v_order_id;

    -- Create notification for buyer
    INSERT INTO public.notifications (user_id, type, title, message, link_url, created_at)
    VALUES (
        v_buyer_id,
        'payment_required',
        'Order Placed — Payment Required',
        'Your order for "' || v_drop.title || '" has been registered. Please complete payment within 48 hours.',
        '/orders/' || v_order_id,
        v_now
    );

    -- Create notification for seller
    INSERT INTO public.notifications (user_id, type, title, message, link_url, created_at)
    VALUES (
        v_drop.seller_id,
        'order_received',
        'New Order Received!',
        'A buyer purchased ' || p_quantity || 'x "' || v_drop.title || '" ($' || v_total || '). Awaiting buyer payment.',
        '/seller/orders/' || v_order_id,
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'total_amount', v_total,
        'remaining_stock', v_drop.inventory_count - p_quantity
    );
END;
$$;

-- 2. REFINED AUCTION SETTLEMENT WITH NOTIFICATIONS & TIMEOUT WINDOW
CREATE OR REPLACE FUNCTION public.settle_auction(
    p_drop_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_drop public.drops%ROWTYPE;
    v_winning_bid public.bids%ROWTYPE;
    v_order_id UUID;
    v_now TIMESTAMPTZ := NOW();
    v_payment_deadline TIMESTAMPTZ := NOW() + INTERVAL '48 hours';
BEGIN
    -- 1. Lock drop row atomically to prevent race conditions
    SELECT * INTO v_drop
    FROM public.drops
    WHERE id = p_drop_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction drop not found';
    END IF;

    IF v_now < v_drop.ends_at THEN
        RAISE EXCEPTION 'Auction has not ended yet';
    END IF;

    IF v_drop.status IN ('settled', 'sold', 'unsold') THEN
        SELECT id INTO v_order_id FROM public.orders WHERE drop_id = p_drop_id LIMIT 1;
        RETURN jsonb_build_object(
            'success', true,
            'status', v_drop.status,
            'message', 'Auction has already been closed',
            'winner_id', v_drop.winner_id,
            'winning_bid', v_drop.winning_bid,
            'order_id', v_order_id
        );
    END IF;

    -- 2. Find highest winning bid (earliest timestamp breaks ties)
    SELECT * INTO v_winning_bid
    FROM public.bids
    WHERE drop_id = p_drop_id
    ORDER BY amount DESC, created_at ASC
    LIMIT 1;

    -- 3. If no bids placed, mark as unsold
    IF NOT FOUND THEN
        UPDATE public.drops
        SET status = 'unsold',
            updated_at = v_now
        WHERE id = p_drop_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'unsold',
            'has_winner', false
        );
    END IF;

    -- 4. Settle with winner -> set to sold
    UPDATE public.drops
    SET status = 'sold',
        winner_id = v_winning_bid.bidder_id,
        winning_bid = v_winning_bid.amount,
        updated_at = v_now
    WHERE id = p_drop_id;

    -- 5. Create or retrieve order record for post-auction escrow
    SELECT id INTO v_order_id
    FROM public.orders
    WHERE drop_id = p_drop_id;

    IF v_order_id IS NULL THEN
        INSERT INTO public.orders (
            drop_id,
            buyer_id,
            seller_id,
            order_type,
            item_title,
            item_image_url,
            quantity,
            unit_price,
            subtotal,
            total_amount,
            amount,
            status,
            payment_status,
            payment_due_at,
            created_at,
            updated_at
        ) VALUES (
            p_drop_id,
            v_winning_bid.bidder_id,
            v_drop.seller_id,
            'auction',
            v_drop.title,
            v_drop.image_url,
            1,
            v_winning_bid.amount,
            v_winning_bid.amount,
            v_winning_bid.amount,
            v_winning_bid.amount,
            'awaiting_payment',
            'pending',
            v_payment_deadline,
            v_now,
            v_now
        ) RETURNING id INTO v_order_id;

        -- Create notification for winner
        INSERT INTO public.notifications (user_id, type, title, message, link_url, created_at)
        VALUES (
            v_winning_bid.bidder_id,
            'auction_won',
            '🎉 You Won the Auction!',
            'Congratulations! You won "' || v_drop.title || '" for $' || v_winning_bid.amount || '. Please complete payment to arrange shipping.',
            '/orders/' || v_order_id,
            v_now
        );

        -- Create notification for seller
        INSERT INTO public.notifications (user_id, type, title, message, link_url, created_at)
        VALUES (
            v_drop.seller_id,
            'order_received',
            'Auction Sold!',
            'Your auction "' || v_drop.title || '" sold for $' || v_winning_bid.amount || '. The winning bidder has been sent payment instructions.',
            '/seller/orders/' || v_order_id,
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'sold',
        'has_winner', true,
        'winner_id', v_winning_bid.bidder_id,
        'winning_bid', v_winning_bid.amount,
        'order_id', v_order_id
    );
END;
$$;

-- 3. ADVANCE CATALOGUE LOT RPC (MODES 1 & 2 AUTOMATED PROGRESSION)
CREATE OR REPLACE FUNCTION public.advance_catalogue_lot(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session public.auction_sessions%ROWTYPE;
    v_current_lot public.auction_lots%ROWTYPE;
    v_next_lot public.auction_lots%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_next_ends TIMESTAMPTZ;
BEGIN
    -- Lock session row atomically
    SELECT * INTO v_session
    FROM public.auction_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction session not found';
    END IF;

    -- If a current lot is active, settle it first
    SELECT * INTO v_current_lot
    FROM public.auction_lots
    WHERE session_id = p_session_id AND status = 'active'
    LIMIT 1;

    IF FOUND THEN
        -- Settle underlying drop
        PERFORM public.settle_auction(v_current_lot.drop_id);

        UPDATE public.auction_lots
        SET status = 'sold',
            updated_at = v_now
        WHERE id = v_current_lot.id;
    END IF;

    -- Find next pending lot in order
    SELECT * INTO v_next_lot
    FROM public.auction_lots
    WHERE session_id = p_session_id AND status = 'pending'
    ORDER BY lot_number ASC
    LIMIT 1;

    -- If no more lots, complete the session
    IF NOT FOUND THEN
        UPDATE public.auction_sessions
        SET status = 'ended',
            ended_at = v_now,
            updated_at = v_now
        WHERE id = p_session_id;

        RETURN jsonb_build_object(
            'success', true,
            'session_status', 'ended',
            'message', 'All lots in catalogue completed'
        );
    END IF;

    -- Activate next lot
    v_next_ends := v_now + (v_next_lot.duration_seconds || ' seconds')::INTERVAL;

    UPDATE public.auction_lots
    SET status = 'active',
        started_at = v_now,
        ends_at = v_next_ends,
        updated_at = v_now
    WHERE id = v_next_lot.id;

    -- Make sure underlying drop is set to live
    UPDATE public.drops
    SET status = 'live',
        starts_at = v_now,
        ends_at = v_next_ends,
        updated_at = v_now
    WHERE id = v_next_lot.drop_id;

    UPDATE public.auction_sessions
    SET current_lot_index = v_next_lot.lot_number,
        status = 'live',
        updated_at = v_now
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_status', 'live',
        'active_lot_id', v_next_lot.id,
        'lot_number', v_next_lot.lot_number,
        'ends_at', v_next_ends
    );
END;
$$;

-- 4. REALTIME PUBLICATION SUBSCRIPTION FOR NEW TABLES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'auction_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_sessions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'auction_lots'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_lots;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
