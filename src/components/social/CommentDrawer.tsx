'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { PostCommentRecord } from '@/types';
import { MessageSquare, Send, X, Trash2 } from 'lucide-react';

interface CommentDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export function CommentDrawer({
  postId,
  isOpen,
  onClose,
  onCommentAdded,
}: CommentDrawerProps) {
  const supabase = createClient();

  const [comments, setComments] = useState<PostCommentRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function loadComments() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data } = await supabase
        .from('post_comments')
        .select(`
          *,
          author:profiles!post_comments_author_id_fkey(username, avatar_url, full_name)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (data) {
        setComments(data as any);
      }
      setLoading(false);
    }

    loadComments();
  }, [postId, isOpen, supabase]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !content.trim()) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const newComment = {
        post_id: postId,
        author_id: currentUser.id,
        content: content.trim(),
      };

      const { data, error } = await supabase
        .from('post_comments')
        .insert(newComment)
        .select(`*, author:profiles!post_comments_author_id_fkey(username, avatar_url, full_name)`)
        .single();

      if (!error && data) {
        setComments((prev) => [...prev, data as any]);
        setContent('');
        if (onCommentAdded) onCommentAdded();
      }
    } catch {
      // Handled
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await supabase.from('post_comments').delete().eq('id', commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // Handled
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-surface-border">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <MessageSquare className="w-3.5 h-3.5 text-lime" />
          <span>Comments ({comments.length})</span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-secondaryText hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Comment List */}
      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-4 text-center text-xs text-secondaryText">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="py-4 text-center text-xs text-secondaryText">
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start justify-between gap-2.5 text-xs">
              <div className="flex items-start gap-2">
                <div className="relative h-6 w-6 rounded-full overflow-hidden border border-surface-border bg-surface flex-shrink-0 mt-0.5">
                  <Image
                    src={
                      comment.author?.avatar_url ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                    }
                    alt={comment.author?.username || 'User'}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <span className="font-bold text-white">@{comment.author?.username || 'user'}</span>{' '}
                  <span className="text-secondaryText">{comment.content}</span>
                  <div className="text-[10px] text-secondaryText/60 mt-0.5">
                    {new Date(comment.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {currentUser && currentUser.id === comment.author_id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-secondaryText hover:text-coral transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Comment Input */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            required
            placeholder="Write a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 rounded-full border border-surface-border bg-background px-4 py-2 text-xs text-white focus:border-lime focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-black hover:bg-lime-hover disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <div className="mt-2 text-center text-[11px] text-secondaryText">
          Sign in to join the conversation.
        </div>
      )}
    </div>
  );
}
