'use client';

import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import type { AuctionStatus } from '@/types';

interface CountdownTimerProps {
  endsAt: string | number;
  status?: AuctionStatus;
  size?: 'sm' | 'md' | 'lg';
  onEnd?: () => void;
  showIcon?: boolean;
}

export default function CountdownTimer({
  endsAt,
  status = 'live',
  size = 'md',
  onEnd,
  showIcon = true,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isEnded: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMs: 1,
    isEnded: false,
  });

  useEffect(() => {
    function calculateTime() {
      const targetTime = typeof endsAt === 'number' ? endsAt : new Date(endsAt).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0 || status === 'ended' || status === 'settled' || status === 'sold' || status === 'unsold') {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalMs: 0,
          isEnded: true,
        });
        if (diff <= 0 && onEnd && status === 'live') {
          onEnd();
        }
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalMs: diff,
        isEnded: false,
      });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endsAt, status, onEnd]);

  if (timeLeft.isEnded || status === 'ended' || status === 'settled' || status === 'sold' || status === 'unsold') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-border/80 px-3 py-1 text-xs font-bold text-secondaryText">
        <span>AUCTION ENDED</span>
      </div>
    );
  }

  const isUrgent = timeLeft.totalMs < 60_000; // Under 1 minute
  const isAntiSnipeWindow = timeLeft.totalMs < 10_000; // Under 10 seconds

  const pad = (n: number) => String(n).padStart(2, '0');

  // Format string
  let display = '';
  if (timeLeft.days > 0) {
    display = `${timeLeft.days}d ${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m`;
  } else if (timeLeft.hours > 0) {
    display = `${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m ${pad(timeLeft.seconds)}s`;
  } else {
    display = `${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  }

  if (size === 'lg') {
    return (
      <div className="flex flex-col gap-1.5">
        <div
          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 border font-mono font-black text-2xl sm:text-3xl tracking-tight transition-all ${
            isAntiSnipeWindow
              ? 'bg-coral/20 border-coral text-coral animate-pulse shadow-coral-glow'
              : isUrgent
              ? 'bg-lime/10 border-lime text-lime shadow-glow-sm'
              : 'bg-black/80 border-surface-border text-white'
          }`}
        >
          {isAntiSnipeWindow ? (
            <Zap className="w-6 h-6 text-coral animate-ping" />
          ) : (
            showIcon && <Clock className="w-6 h-6 text-lime" />
          )}
          <span>{display}</span>
        </div>

        {isAntiSnipeWindow && (
          <span className="text-[11px] font-bold text-coral flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-coral animate-ping" />
            Anti-Snipe Active: Any bid extends by 10s!
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-mono font-bold text-xs ${
        isAntiSnipeWindow
          ? 'text-coral animate-pulse'
          : isUrgent
          ? 'text-lime'
          : 'text-white'
      }`}
    >
      {isAntiSnipeWindow ? (
        <Zap className="w-3.5 h-3.5 text-coral" />
      ) : (
        showIcon && <Clock className="w-3.5 h-3.5 text-lime" />
      )}
      <span>{display}</span>
    </div>
  );
}
