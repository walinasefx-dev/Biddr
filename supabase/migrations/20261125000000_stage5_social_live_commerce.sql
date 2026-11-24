-- ============================================================
-- BIDDR STAGE 5: SOCIAL COMMERCE & LIVE STREAMING DATA FOUNDATION
-- Migration: 20261125000000_stage5_social_live_commerce.sql
-- ============================================================

-- 1. EXTEND PROFILES TABLE WITH FOLLOWER / FOLLOWING COUNTS
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0 CHECK (follower_count >= 0),
    ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0 CHECK (following_count >= 0);

-- 2. CREATE POSTS TABLE (SOCIAL FEED WITH COMMERCE LINKS)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    caption TEXT,
    media_urls TEXT[] NOT NULL DEFAULT '{}',
    media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'carousel')),
    post_type TEXT NOT NULL DEFAULT 'standard' CHECK (post_type IN (
        'standard',
        'product_showcase',
        'auction_teaser',
        'live_announcement'
    )),
    drop_id UUID REFERENCES public.drops(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.auction_sessions(id) ON DELETE SET NULL,
    like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
    comment_count INTEGER NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
    share_count INTEGER NOT NULL DEFAULT 0 CHECK (share_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for post feed querying & foreign key lookups
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_drop ON public.posts(drop_id);
CREATE INDEX IF NOT EXISTS idx_posts_session ON public.posts(session_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);

-- 3. CREATE FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_follower_seller UNIQUE (follower_id, seller_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_seller ON public.follows(seller_id);

-- 4. CREATE POST LIKES TABLE
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_post_like UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes(user_id);

-- 5. CREATE POST COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author ON public.post_comments(author_id);

-- 6. CREATE POST SAVES (BOOKMARKS) TABLE
CREATE TABLE IF NOT EXISTS public.post_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_post_save UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_saves_user ON public.post_saves(user_id);

-- 7. CREATE LIVE CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.live_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.auction_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL CHECK (char_length(trim(message)) > 0 AND char_length(message) <= 300),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_chats_session ON public.live_chats(session_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chats ENABLE ROW LEVEL SECURITY;

-- Posts Policies
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone"
    ON public.posts FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
CREATE POLICY "Authenticated users can create posts"
    ON public.posts FOR INSERT
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update their own posts" ON public.posts;
CREATE POLICY "Authors can update their own posts"
    ON public.posts FOR UPDATE
    USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.posts;
CREATE POLICY "Authors can delete their own posts"
    ON public.posts FOR DELETE
    USING (auth.uid() = author_id);

-- Follows Policies
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by everyone"
    ON public.follows FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can follow other users" ON public.follows;
CREATE POLICY "Users can follow other users"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow"
    ON public.follows FOR DELETE
    USING (auth.uid() = follower_id);

-- Post Likes Policies
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.post_likes;
CREATE POLICY "Likes are viewable by everyone"
    ON public.post_likes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Users can like posts"
    ON public.post_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
CREATE POLICY "Users can unlike posts"
    ON public.post_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Post Comments Policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.post_comments;
CREATE POLICY "Comments are viewable by everyone"
    ON public.post_comments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can post comments" ON public.post_comments;
CREATE POLICY "Users can post comments"
    ON public.post_comments FOR INSERT
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors or post owners can delete comments" ON public.post_comments;
CREATE POLICY "Authors or post owners can delete comments"
    ON public.post_comments FOR DELETE
    USING (
        auth.uid() = author_id OR
        EXISTS (
            SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id AND p.author_id = auth.uid()
        )
    );

-- Post Saves (Bookmarks) Policies
DROP POLICY IF EXISTS "Users can view their own saved posts" ON public.post_saves;
CREATE POLICY "Users can view their own saved posts"
    ON public.post_saves FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save posts" ON public.post_saves;
CREATE POLICY "Users can save posts"
    ON public.post_saves FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave posts" ON public.post_saves;
CREATE POLICY "Users can unsave posts"
    ON public.post_saves FOR DELETE
    USING (auth.uid() = user_id);

-- Live Chats Policies
DROP POLICY IF EXISTS "Live chats are viewable by everyone" ON public.live_chats;
CREATE POLICY "Live chats are viewable by everyone"
    ON public.live_chats FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can post chat messages" ON public.live_chats;
CREATE POLICY "Users can post chat messages"
    ON public.live_chats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORED PROCEDURES & ATOMIC ENGAGEMENT RPCs
-- ============================================================

-- 1. ATOMIC TOGGLE FOLLOW RPC
CREATE OR REPLACE FUNCTION public.toggle_follow(
    p_seller_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_follower_id UUID;
    v_is_following BOOLEAN;
    v_new_follower_count INT;
BEGIN
    v_follower_id := auth.uid();
    IF v_follower_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to follow a seller';
    END IF;

    IF v_follower_id = p_seller_id THEN
        RAISE EXCEPTION 'Users cannot follow themselves';
    END IF;

    -- Check if already following
    SELECT EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = v_follower_id AND seller_id = p_seller_id
    ) INTO v_is_following;

    IF v_is_following THEN
        -- Unfollow
        DELETE FROM public.follows
        WHERE follower_id = v_follower_id AND seller_id = p_seller_id;

        UPDATE public.profiles
        SET follower_count = GREATEST(0, follower_count - 1)
        WHERE id = p_seller_id;

        UPDATE public.profiles
        SET following_count = GREATEST(0, following_count - 1)
        WHERE id = v_follower_id;

        SELECT follower_count INTO v_new_follower_count FROM public.profiles WHERE id = p_seller_id;

        RETURN jsonb_build_object(
            'following', false,
            'follower_count', v_new_follower_count
        );
    ELSE
        -- Follow
        INSERT INTO public.follows (follower_id, seller_id)
        VALUES (v_follower_id, p_seller_id);

        UPDATE public.profiles
        SET follower_count = follower_count + 1
        WHERE id = p_seller_id;

        UPDATE public.profiles
        SET following_count = following_count + 1
        WHERE id = v_follower_id;

        SELECT follower_count INTO v_new_follower_count FROM public.profiles WHERE id = p_seller_id;

        -- Create notification for the seller
        INSERT INTO public.notifications (user_id, type, title, message, link_url)
        VALUES (
            p_seller_id,
            'system',
            'New Follower!',
            'Someone started following your auctions and storefront.',
            '/profile/' || (SELECT username FROM public.profiles WHERE id = v_follower_id)
        );

        RETURN jsonb_build_object(
            'following', true,
            'follower_count', v_new_follower_count
        );
    END IF;
END;
$$;

-- 2. ATOMIC TOGGLE POST LIKE RPC
CREATE OR REPLACE FUNCTION public.toggle_post_like(
    p_post_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_liked BOOLEAN;
    v_new_like_count INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to like a post';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.post_likes
        WHERE user_id = v_user_id AND post_id = p_post_id
    ) INTO v_is_liked;

    IF v_is_liked THEN
        DELETE FROM public.post_likes
        WHERE user_id = v_user_id AND post_id = p_post_id;

        UPDATE public.posts
        SET like_count = GREATEST(0, like_count - 1),
            updated_at = NOW()
        WHERE id = p_post_id
        RETURNING like_count INTO v_new_like_count;

        RETURN jsonb_build_object(
            'liked', false,
            'like_count', v_new_like_count
        );
    ELSE
        INSERT INTO public.post_likes (user_id, post_id)
        VALUES (v_user_id, p_post_id);

        UPDATE public.posts
        SET like_count = like_count + 1,
            updated_at = NOW()
        WHERE id = p_post_id
        RETURNING like_count INTO v_new_like_count;

        RETURN jsonb_build_object(
            'liked', true,
            'like_count', v_new_like_count
        );
    END IF;
END;
$$;

-- 3. REALTIME PUBLICATION SUBSCRIPTION FOR SOCIAL & LIVE CHAT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'posts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_chats'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chats;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
