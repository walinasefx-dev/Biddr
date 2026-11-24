-- ============================================================
-- BIDDR: ADMIN MODERATION, DISPUTE MEDIATION, AUDIT LOGGING & SELLER PAYOUTS
-- Migration: 20261125100000_admin_moderation_and_payouts.sql
-- ============================================================

-- 1. EXTEND PROFILES WITH ROLE & STRIPE CONNECT
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' 
    CHECK (role IN ('user', 'admin'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Documented One-Time Seeding SQL for Admin Account:
-- UPDATE public.profiles SET role = 'admin' WHERE username = 'admin';

-- 2. CREATE APPEND-ONLY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rapid administrative audit trail lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 3. CREATE WEBHOOK IDEMPOTENCY STORE
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CREATE SELLER VERIFICATION HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.seller_verification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_verification_seller_id ON public.seller_verification_history(seller_id);

-- 5. EXTEND DISPUTES TABLE TO SUPPORT SPECIFIED STATE MACHINE
-- State machine: open -> under_review -> resolved_refund | resolved_release | dismissed
ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
ALTER TABLE public.disputes ADD CONSTRAINT disputes_status_check CHECK (
    status IN (
        'open', 
        'under_review', 
        'resolved_refund', 
        'resolved_release', 
        'dismissed',
        'resolved_buyer', 
        'resolved_seller', 
        'closed'
    )
);

ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS evidence_urls TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 6. CREATE SELLER TRANSFERS TABLE (MODULE B PAYOUT RECORDS)
CREATE TABLE IF NOT EXISTS public.seller_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    destination_account TEXT NOT NULL,
    gross_amount NUMERIC(10, 2) NOT NULL,
    commission_rate NUMERIC(5, 4) NOT NULL,
    commission_amount NUMERIC(10, 2) NOT NULL,
    processing_fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(10, 2) NOT NULL,
    transfer_reference TEXT UNIQUE,
    idempotency_key TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'transferred' CHECK (status IN ('pending', 'transferred', 'failed', 'queued')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_transfers_seller_id ON public.seller_transfers(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_transfers_order_id ON public.seller_transfers(order_id);

-- 7. CREATE MARKETPLACE ANALYTICS RPC
CREATE OR REPLACE FUNCTION public.get_marketplace_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_gmv NUMERIC(12, 2);
    v_total_orders INTEGER;
    v_orders_by_status JSONB;
    v_active_sellers INTEGER;
    v_active_streams INTEGER;
    v_open_disputes INTEGER;
    v_daily_bids INTEGER;
    v_platform_fees NUMERIC(12, 2);
BEGIN
    -- GMV (Sum of paid, dispatched, delivered, completed orders)
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_gmv
    FROM public.orders
    WHERE status IN ('paid', 'dispatched', 'delivered', 'completed');

    -- Total orders
    SELECT COUNT(*) INTO v_total_orders FROM public.orders;

    -- Orders by status breakdown
    SELECT jsonb_object_agg(status, count) INTO v_orders_by_status
    FROM (
        SELECT status, COUNT(*)::INTEGER as count
        FROM public.orders
        GROUP BY status
    ) s;

    IF v_orders_by_status IS NULL THEN
        v_orders_by_status := '{}'::jsonb;
    END IF;

    -- Active sellers (sellers with drops created in last 30 days or active auctions)
    SELECT COUNT(DISTINCT seller_id) INTO v_active_sellers
    FROM public.drops
    WHERE status IN ('live', 'scheduled', 'draft');

    -- Active live streams
    SELECT COUNT(*) INTO v_active_streams
    FROM public.auction_sessions
    WHERE status = 'live';

    -- Open disputes
    SELECT COUNT(*) INTO v_open_disputes
    FROM public.disputes
    WHERE status IN ('open', 'under_review');

    -- 24h Bid volume
    SELECT COUNT(*) INTO v_daily_bids
    FROM public.bids
    WHERE created_at >= NOW() - INTERVAL '24 hours';

    -- Platform fee earnings from recorded transfers or settled orders
    SELECT COALESCE(SUM(commission_amount), 0) INTO v_platform_fees
    FROM public.seller_transfers
    WHERE status = 'transferred';

    RETURN jsonb_build_object(
        'total_gmv', v_total_gmv,
        'total_orders', v_total_orders,
        'orders_by_status', v_orders_by_status,
        'active_sellers', v_active_sellers,
        'active_streams', v_active_streams,
        'open_disputes', v_open_disputes,
        'daily_bid_volume', v_daily_bids,
        'platform_fee_earnings', v_platform_fees
    );
END;
$$;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_transfers ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Audit Logs: Admins only
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Authenticated users and services can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Verification History: Admins and target seller
CREATE POLICY "Admins can view all verification history"
    ON public.seller_verification_history FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Sellers can view their own verification history"
    ON public.seller_verification_history FOR SELECT
    USING (auth.uid() = seller_id);

CREATE POLICY "Admins can insert verification records"
    ON public.seller_verification_history FOR INSERT
    WITH CHECK (public.is_admin());

-- Seller Transfers: Admins and target seller
CREATE POLICY "Admins can view all seller transfers"
    ON public.seller_transfers FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Sellers can view their own transfers"
    ON public.seller_transfers FOR SELECT
    USING (auth.uid() = seller_id);

CREATE POLICY "Services can insert seller transfers"
    ON public.seller_transfers FOR INSERT
    WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);
