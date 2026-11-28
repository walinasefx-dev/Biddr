-- ============================================================
-- BIDDR: SECURITY & CORRECTNESS FIXES
-- Migration: 20261128090000_security_fixes_and_profile_guard.sql
-- ============================================================

-- 1. HARDEN PROFILE PRIVILEGE GUARD TRIGGER
-- Rejects any unauthorized attempt by non-service-role / non-admin users
-- to alter protected columns: role, seller_verified, stripe_connect_account_id, stripe_payouts_enabled.

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_caller_admin BOOLEAN;
BEGIN
    -- If caller is service_role, allow mutation
    IF auth.role() = 'service_role' THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    -- Check if caller is an existing verified admin
    SELECT (role = 'admin') INTO v_is_caller_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT COALESCE(v_is_caller_admin, FALSE) THEN
        -- Explicitly reject role escalation attempts
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            RAISE EXCEPTION 'Privilege escalation rejected: users cannot modify their own role.';
        END IF;

        -- Prevent modification of protected seller and Stripe payout flags
        IF OLD.seller_verified IS DISTINCT FROM NEW.seller_verified THEN
            NEW.seller_verified := OLD.seller_verified;
        END IF;
        IF OLD.stripe_connect_account_id IS DISTINCT FROM NEW.stripe_connect_account_id THEN
            NEW.stripe_connect_account_id := OLD.stripe_connect_account_id;
        END IF;
        IF OLD.stripe_payouts_enabled IS DISTINCT FROM NEW.stripe_payouts_enabled THEN
            NEW.stripe_payouts_enabled := OLD.stripe_payouts_enabled;
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trigger_protect_profile_privileges
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_privileges();

-- 2. RESTRICT AUDIT_LOGS TO SERVICE ROLE INSERT ONLY & CONFIRM APPEND-ONLY
-- Drop any permissive insert policy
DROP POLICY IF EXISTS "Authenticated users and services can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role only can insert audit logs" ON public.audit_logs;

CREATE POLICY "Service role only can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Guarantee append-only: drop any UPDATE or DELETE policies
DROP POLICY IF EXISTS "No updates on audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "No deletes on audit logs" ON public.audit_logs;

-- 3. RESTRICT SELLER_TRANSFERS INSERT TO SERVICE ROLE ONLY
DROP POLICY IF EXISTS "Services can insert seller transfers" ON public.seller_transfers;
DROP POLICY IF EXISTS "Service role only can insert seller transfers" ON public.seller_transfers;

CREATE POLICY "Service role only can insert seller transfers"
    ON public.seller_transfers FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- 4. RESTRICT SELLER_VERIFICATION_HISTORY INSERT TO SERVICE ROLE ONLY
DROP POLICY IF EXISTS "Admins can insert verification records" ON public.seller_verification_history;
DROP POLICY IF EXISTS "Service role only can insert verification records" ON public.seller_verification_history;

CREATE POLICY "Service role only can insert verification records"
    ON public.seller_verification_history FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
