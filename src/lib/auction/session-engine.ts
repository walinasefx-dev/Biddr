/**
 * BIDDR MULTI-MODE AUCTION & CATALOGUE ENGINE
 *
 * Implements business rules for:
 * Mode 1: Catalogue + Live Host (auto lot advance + video feed)
 * Mode 2: Catalogue Without Live Host (automated sequential progression)
 * Mode 3: Host-Controlled Live Auction (seller manually calls "Start Bidding")
 */

import {
  AuctionMode,
  AuctionSessionStatus,
  AuctionSessionRecord,
  AuctionLotRecord,
} from '@/types';

export interface CreateSessionInput {
  sellerId: string;
  title: string;
  description?: string;
  mode: AuctionMode;
  lotDurationSeconds: number;
  dropIds: string[];
}

export function validateSessionInput(input: CreateSessionInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.sellerId) {
    errors.push('Seller ID is required');
  }

  if (!input.title || input.title.trim().length < 3) {
    errors.push('Catalogue session title must be at least 3 characters long');
  }

  if (!['catalogue_live', 'catalogue_automated', 'host_controlled'].includes(input.mode)) {
    errors.push(`Invalid auction mode: "${input.mode}"`);
  }

  if (!input.lotDurationSeconds || input.lotDurationSeconds < 15) {
    errors.push('Lot countdown duration must be at least 15 seconds');
  }

  if (!input.dropIds || input.dropIds.length === 0) {
    errors.push('At least one auction lot is required to prepare a catalogue session');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface CatalogueState {
  currentLotIndex: number;
  totalLots: number;
  activeLot: AuctionLotRecord | null;
  upcomingLots: AuctionLotRecord[];
  completedLots: AuctionLotRecord[];
  isCompleted: boolean;
}

export function computeCatalogueState(lots: AuctionLotRecord[]): CatalogueState {
  const sorted = [...lots].sort((a, b) => a.lot_number - b.lot_number);

  const activeLot = sorted.find((l) => l.status === 'active') || null;
  const upcomingLots = sorted.filter((l) => l.status === 'pending');
  const completedLots = sorted.filter((l) => ['sold', 'unsold', 'skipped'].includes(l.status));

  const currentLotIndex = activeLot ? activeLot.lot_number : completedLots.length;
  const isCompleted = sorted.length > 0 && upcomingLots.length === 0 && !activeLot;

  return {
    currentLotIndex,
    totalLots: sorted.length,
    activeLot,
    upcomingLots,
    completedLots,
    isCompleted,
  };
}

/**
 * Validates whether a seller action is permitted given the session mode and current status.
 */
export function canPerformSessionAction(
  mode: AuctionMode,
  currentStatus: AuctionSessionStatus,
  action: 'start_bidding' | 'pause' | 'resume' | 'skip' | 'advance' | 'end'
): { allowed: boolean; reason?: string } {
  if (currentStatus === 'ended') {
    return { allowed: false, reason: 'Session has already ended.' };
  }

  if (action === 'start_bidding') {
    if (mode !== 'host_controlled') {
      return {
        allowed: false,
        reason: 'Automated catalogue modes advance rounds automatically on server timer.',
      };
    }
    if (currentStatus !== 'live' && currentStatus !== 'scheduled') {
      return { allowed: false, reason: `Cannot start round while session is ${currentStatus}.` };
    }
    return { allowed: true };
  }

  if (action === 'pause') {
    if (currentStatus !== 'live') {
      return { allowed: false, reason: 'Session is not live.' };
    }
    return { allowed: true };
  }

  if (action === 'resume') {
    if (currentStatus !== 'paused') {
      return { allowed: false, reason: 'Session is not paused.' };
    }
    return { allowed: true };
  }

  if (action === 'skip') {
    return { allowed: true };
  }

  if (action === 'advance') {
    return { allowed: true };
  }

  if (action === 'end') {
    return { allowed: true };
  }

  return { allowed: true };
}
