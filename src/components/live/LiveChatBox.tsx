'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { LiveChatMessage } from '@/types';
import { MessageSquare, Send, ShieldCheck, Sparkles } from 'lucide-react';

interface LiveChatBoxProps {
  sessionId: string;
  sellerId: string;
  currentUser?: any;
}

export function LiveChatBox({ sessionId, sellerId, currentUser }: LiveChatBoxProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Load Initial Messages
  useEffect(() => {
    async function loadChat() {
      const { data } = await supabase
        .from('live_chats')
        .select(`
          *,
          user:profiles!live_chats_user_id_fkey(username, avatar_url, is_seller, seller_verified)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (data) {
        setMessages(data as any);
      }
    }

    loadChat();

    // 2. Realtime Chat Subscription
    const channel = supabase
      .channel(`live-chat-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chats', filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          // Fetch user profile info
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url, is_seller, seller_verified')
            .eq('id', newMsg.user_id)
            .maybeSingle();

          const formatted: LiveChatMessage = {
            ...newMsg,
            user: userProfile || { username: 'viewer', avatar_url: null },
          };

          setMessages((prev) => [...prev, formatted]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !inputMessage.trim() || sending || rateLimited) return;

    setSending(true);
    const text = inputMessage.trim();
    setInputMessage('');

    try {
      await supabase.from('live_chats').insert({
        session_id: sessionId,
        user_id: currentUser.id,
        message: text,
      });

      // Simple 2-second rate-limit to protect live streams
      setRateLimited(true);
      setTimeout(() => setRateLimited(false), 2000);
    } catch {
      // Handled
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-3xl border border-surface-border bg-surface p-4 flex flex-col h-80 sm:h-96 shadow-2xl">
      <div className="flex items-center justify-between pb-3 border-b border-surface-border">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <MessageSquare className="w-3.5 h-3.5 text-lime" />
          <span>Live Audience Chat</span>
        </div>
        <span className="text-[10px] text-secondaryText font-mono">Real-time</span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 text-xs">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-secondaryText text-[11px]">
            Welcome to the live show! Say hello to the host.
          </div>
        ) : (
          messages.map((msg) => {
            const isHost = msg.user_id === sellerId;

            return (
              <div key={msg.id} className="flex items-start gap-2">
                <div className="relative h-5 w-5 rounded-full overflow-hidden border border-surface-border bg-background flex-shrink-0 mt-0.5">
                  <Image
                    src={
                      msg.user?.avatar_url ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                    }
                    alt={msg.user?.username || 'User'}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="leading-snug">
                  <span
                    className={`font-bold inline-flex items-center gap-1 ${
                      isHost ? 'text-coral' : 'text-white'
                    }`}
                  >
                    @{msg.user?.username || 'viewer'}
                    {isHost && (
                      <span className="text-[9px] bg-coral/20 text-coral px-1 rounded font-black uppercase">
                        HOST
                      </span>
                    )}
                    {msg.user?.seller_verified && !isHost && (
                      <ShieldCheck className="w-3 h-3 text-biddrBlue" />
                    )}
                    :
                  </span>{' '}
                  <span className="text-secondaryText">{msg.message}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      {currentUser ? (
        <form onSubmit={handleSendMessage} className="pt-2 border-t border-surface-border flex items-center gap-2">
          <input
            type="text"
            required
            maxLength={300}
            placeholder={rateLimited ? 'Rate limit active...' : 'Send a message...'}
            disabled={rateLimited}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 rounded-full border border-surface-border bg-background px-3.5 py-2 text-xs text-white focus:border-lime focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || rateLimited || !inputMessage.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-black hover:bg-lime-hover disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <div className="pt-2 border-t border-surface-border text-center text-[11px] text-secondaryText">
          Sign in to chat during the live show.
        </div>
      )}
    </div>
  );
}
