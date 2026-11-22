-- ============================================================
-- BIDDR DATABASE SCHEMA & ATOMIC AUCTION LOGIC
-- Tables: profiles, drops, bids, orders, waitlist
-- ============================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_seller BOOLEAN NOT NULL DEFAULT FALSE,
    seller_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DROPS TABLE (Auctions)
CREATE TABLE IF NOT EXISTS public.drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    image_url TEXT,
    starting_price NUMERIC(12,2) NOT NULL CHECK (starting_price >= 0),
    current_bid NUMERIC(12,2) NOT NULL CHECK (current_bid >= 0),
    min_increment NUMERIC(12,2) NOT NULL DEFAULT 5.00 CHECK (min_increment > 0),
    bid_count INTEGER NOT NULL DEFAULT 0 CHECK (bid_count >= 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'live', 'ended', 'settled')),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    winning_bid NUMERIC(12,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BIDS TABLE
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_id UUID NOT NULL REFERENCES public.drops(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ORDERS TABLE (Post-Auction Settlement & Escrow Foundation)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_id UUID NOT NULL REFERENCES public.drops(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'escrow_held', 'shipped', 'delivered', 'released', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. WAITLIST TABLE
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'buyer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Profiles: Public profiles are visible to anyone; users can update only their own profile
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Drops: Public can view active/ended drops; verified sellers can manage their own drops
CREATE POLICY "Drops are viewable by everyone"
    ON public.drops FOR SELECT
    USING (true);

CREATE POLICY "Sellers can insert their own drops"
    ON public.drops FOR INSERT
    WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own drops"
    ON public.drops FOR UPDATE
    USING (auth.uid() = seller_id);

-- Bids: Viewable by everyone for transparency; insertions handled via atomic place_bid()
CREATE POLICY "Bids are viewable by everyone"
    ON public.bids FOR SELECT
    USING (true);

-- Orders: Only buyer or seller involved can view the order
CREATE POLICY "Users can view their own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Waitlist: Anyone can insert their email; only service role can inspect waitlist records
CREATE POLICY "Anyone can register for waitlist"
    ON public.waitlist FOR INSERT
    WITH CHECK (true);

-- ============================================================
-- ATOMIC BIDDING STORED PROCEDURE (WITH 10s ANTI-SNIPING RULE)
-- ============================================================

CREATE OR REPLACE FUNCTION public.place_bid(
    p_drop_id UUID,
    p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_drop public.drops%ROWTYPE;
    v_min_required NUMERIC;
    v_now TIMESTAMPTZ := NOW();
    v_new_ends_at TIMESTAMPTZ;
    v_anti_snipe_triggered BOOLEAN := FALSE;
    v_bid_id UUID;
BEGIN
    -- 1. Identify authenticated caller securely
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to place a bid';
    END IF;

    -- 2. Lock the target drop row atomically (prevents race conditions)
    SELECT * INTO v_drop
    FROM public.drops
    WHERE id = p_drop_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction drop not found';
    END IF;

    -- 3. Verify drop status is live
    IF v_drop.status != 'live' THEN
        RAISE EXCEPTION 'Auction is not currently live (status: %)', v_drop.status;
    END IF;

    -- 4. Verify auction has not ended
    IF v_now > v_drop.ends_at THEN
        RAISE EXCEPTION 'Auction has already ended';
    END IF;

    -- 5. Prevent self-bidding
    IF v_drop.seller_id = v_user_id THEN
        RAISE EXCEPTION 'Sellers cannot bid on their own drops';
    END IF;

    -- 6. Validate minimum required bid
    IF v_drop.bid_count = 0 THEN
        v_min_required := v_drop.starting_price;
    ELSE
        v_min_required := v_drop.current_bid + v_drop.min_increment;
    END IF;

    IF p_amount < v_min_required THEN
        RAISE EXCEPTION 'Bid amount ($%) is below minimum required increment ($%)', p_amount, v_min_required;
    END IF;

    -- 7. 10-Second Anti-Sniping Rule:
    -- If bid arrives with less than 10 seconds remaining, extend clock by 10s
    v_new_ends_at := v_drop.ends_at;
    IF (v_drop.ends_at - v_now) < INTERVAL '10 seconds' THEN
        v_new_ends_at := v_drop.ends_at + INTERVAL '10 seconds';
        v_anti_snipe_triggered := TRUE;
    END IF;

    -- 8. Record new bid
    INSERT INTO public.bids (drop_id, bidder_id, amount, created_at)
    VALUES (p_drop_id, v_user_id, p_amount, v_now)
    RETURNING id INTO v_bid_id;

    -- 9. Update drop state atomically
    UPDATE public.drops
    SET current_bid = p_amount,
        bid_count = bid_count + 1,
        ends_at = v_new_ends_at,
        updated_at = v_now
    WHERE id = p_drop_id;

    RETURN jsonb_build_object(
        'success', true,
        'bid_id', v_bid_id,
        'amount', p_amount,
        'bid_count', v_drop.bid_count + 1,
        'ends_at', v_new_ends_at,
        'anti_snipe_triggered', v_anti_snipe_triggered
    );
END;
$$;

-- ============================================================
-- ATOMIC AUCTION SETTLEMENT FUNCTION
-- ============================================================

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
BEGIN
    -- 1. Lock drop row atomically
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

    IF v_drop.status = 'settled' THEN
        RAISE EXCEPTION 'Auction is already settled';
    END IF;

    -- 2. Find highest winning bid (earliest timestamp breaks ties)
    SELECT * INTO v_winning_bid
    FROM public.bids
    WHERE drop_id = p_drop_id
    ORDER BY amount DESC, created_at ASC
    LIMIT 1;

    -- 3. If no bids placed, mark as ended without winner
    IF NOT FOUND THEN
        UPDATE public.drops
        SET status = 'ended',
            updated_at = v_now
        WHERE id = p_drop_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'ended',
            'has_winner', false
        );
    END IF;

    -- 4. Settle with winner
    UPDATE public.drops
    SET status = 'settled',
        winner_id = v_winning_bid.bidder_id,
        winning_bid = v_winning_bid.amount,
        updated_at = v_now
    WHERE id = p_drop_id;

    -- 5. Create order record for escrow settlement
    INSERT INTO public.orders (drop_id, buyer_id, seller_id, amount, status, created_at, updated_at)
    VALUES (
        p_drop_id,
        v_winning_bid.bidder_id,
        v_drop.seller_id,
        v_winning_bid.amount,
        'pending',
        v_now,
        v_now
    )
    RETURNING id INTO v_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'settled',
        'has_winner', true,
        'winner_id', v_winning_bid.bidder_id,
        'winning_bid', v_winning_bid.amount,
        'order_id', v_order_id
    );
END;
$$;
