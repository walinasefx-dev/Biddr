-- ============================================================
-- BIDDR STAGE 3: MARKETPLACE, AUCTION CREATION & REALTIME SCHEMA
-- ============================================================

-- 1. ADD EXTENDED AUCTION FIELDS TO DROPS TABLE
ALTER TABLE public.drops 
    ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'Brand New',
    ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'United States',
    ADD COLUMN IF NOT EXISTS shipping_information TEXT DEFAULT 'Standard Insured Shipping (3-5 business days)',
    ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Populate images array from existing image_url if empty
UPDATE public.drops 
SET images = ARRAY[image_url] 
WHERE (images IS NULL OR array_length(images, 1) IS NULL) AND image_url IS NOT NULL;

-- 2. EXPAND STATUS CHECK CONSTRAINT ON DROPS TABLE
-- Allows: draft, scheduled, live, ended, settled, cancelled, sold, unsold
ALTER TABLE public.drops DROP CONSTRAINT IF EXISTS drops_status_check;
ALTER TABLE public.drops 
    ADD CONSTRAINT drops_status_check 
    CHECK (status IN ('draft', 'scheduled', 'live', 'ended', 'settled', 'cancelled', 'sold', 'unsold'));

-- 3. CREATE WATCHLIST TABLE FOR FOLLOWING AUCTIONS
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    drop_id UUID NOT NULL REFERENCES public.drops(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT watchlist_user_drop_unique UNIQUE (user_id, drop_id)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own watchlist" ON public.watchlist;
CREATE POLICY "Users can view their own watchlist"
    ON public.watchlist FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their watchlist" ON public.watchlist;
CREATE POLICY "Users can add to their watchlist"
    ON public.watchlist FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from their watchlist" ON public.watchlist;
CREATE POLICY "Users can remove from their watchlist"
    ON public.watchlist FOR DELETE
    USING (auth.uid() = user_id);

-- 4. ENABLE SUPABASE REALTIME FOR DROPS AND BIDS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'drops'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.drops;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bids'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Continue if publication is already managed
END $$;

-- 5. REFINED AUCTION SETTLEMENT (Supports 'sold' and 'unsold' statuses)
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
        RETURN jsonb_build_object(
            'success', true,
            'status', v_drop.status,
            'message', 'Auction has already been closed',
            'winner_id', v_drop.winner_id,
            'winning_bid', v_drop.winning_bid
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
