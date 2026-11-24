'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart, Flame, Sparkles, ThumbsUp } from 'lucide-react';

interface FloatingReaction {
  id: string;
  emoji: string;
  leftPercent: number;
}

interface LiveReactionsProps {
  sessionId: string;
}

const EMOJIS = ['❤️', '🔥', '👏', '⚡', '💯'];

export function LiveReactions({ sessionId }: LiveReactionsProps) {
  const supabase = createClient();
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    // Ephemeral WebSocket broadcast channel (Zero database disk writes for high-frequency scale)
    const channel = supabase.channel(`reactions-${sessionId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'reaction' }, (payload) => {
        const emoji = payload.payload?.emoji || '❤️';
        const newReaction: FloatingReaction = {
          id: `${Date.now()}_${Math.random()}`,
          emoji,
          leftPercent: Math.floor(Math.random() * 60) + 20, // 20% to 80% horizontal range
        };

        setReactions((prev) => [...prev.slice(-15), newReaction]); // Keep at most 15 active

        // Clean up reaction after 2.5s animation
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
        }, 2400);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  const emitReaction = (emoji: string) => {
    supabase.channel(`reactions-${sessionId}`).send({
      type: 'broadcast',
      event: 'reaction',
      payload: { emoji },
    });
  };

  return (
    <div className="relative">
      {/* Floating Reaction Animation Canvas */}
      <div className="absolute bottom-16 right-4 w-32 h-64 pointer-events-none overflow-hidden z-20">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-0 text-2xl animate-fade-up select-none transform -translate-x-1/2"
            style={{
              left: `${r.leftPercent}%`,
              animation: 'floatUp 2.2s cubic-bezier(0.25, 1, 0.5, 1) forwards',
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Tap Reaction Buttons Row */}
      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => emitReaction(emoji)}
            className="hover:scale-130 active:scale-95 transition-transform text-sm sm:text-base p-1"
            title="React"
          >
            {emoji}
          </button>
        ))}
      </div>

      <style jsx global>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.8);
          }
          50% {
            opacity: 0.9;
            transform: translateY(-80px) scale(1.2) rotate(6deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-180px) scale(1) rotate(-6deg);
          }
        }
      `}</style>
    </div>
  );
}
