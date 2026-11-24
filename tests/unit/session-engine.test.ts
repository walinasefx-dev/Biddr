import { describe, it, expect } from 'vitest';
import {
  validateSessionInput,
  computeCatalogueState,
  canPerformSessionAction,
} from '../../src/lib/auction/session-engine';
import type { AuctionLotRecord } from '../../src/types';

describe('Stage 4 — Three Auction Modes & Catalogue Engine', () => {
  describe('validateSessionInput', () => {
    it('accepts valid session creation parameters', () => {
      const result = validateSessionInput({
        sellerId: 'user-seller-1',
        title: 'Rare Sneakers Live Showcase',
        description: 'Limited edition Dunks and Jordans',
        mode: 'catalogue_live',
        lotDurationSeconds: 60,
        dropIds: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects sessions with title too short or no lots', () => {
      const result = validateSessionInput({
        sellerId: 'user-seller-1',
        title: 'Hi',
        mode: 'catalogue_automated',
        lotDurationSeconds: 60,
        dropIds: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Catalogue session title must be at least 3 characters long');
      expect(result.errors).toContain('At least one auction lot is required to prepare a catalogue session');
    });

    it('rejects invalid auction modes', () => {
      const result = validateSessionInput({
        sellerId: 'user-seller-1',
        title: 'Valid Title',
        mode: 'invalid_mode' as any,
        lotDurationSeconds: 60,
        dropIds: ['00000000-0000-0000-0000-000000000001'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid auction mode');
    });
  });

  describe('computeCatalogueState', () => {
    const mockLots: AuctionLotRecord[] = [
      {
        id: 'lot-1',
        session_id: 'sess-1',
        drop_id: 'drop-1',
        lot_number: 1,
        duration_seconds: 60,
        status: 'sold',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'lot-2',
        session_id: 'sess-1',
        drop_id: 'drop-2',
        lot_number: 2,
        duration_seconds: 60,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'lot-3',
        session_id: 'sess-1',
        drop_id: 'drop-3',
        lot_number: 3,
        duration_seconds: 60,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it('accurately identifies active, upcoming, and completed lots', () => {
      const state = computeCatalogueState(mockLots);

      expect(state.totalLots).toBe(3);
      expect(state.currentLotIndex).toBe(2);
      expect(state.activeLot?.id).toBe('lot-2');
      expect(state.upcomingLots).toHaveLength(1);
      expect(state.completedLots).toHaveLength(1);
      expect(state.isCompleted).toBe(false);
    });

    it('correctly marks catalogue complete when all lots are finalized', () => {
      const allDone = mockLots.map((l) => ({ ...l, status: 'sold' as const }));
      const state = computeCatalogueState(allDone);

      expect(state.activeLot).toBeNull();
      expect(state.upcomingLots).toHaveLength(0);
      expect(state.completedLots).toHaveLength(3);
      expect(state.isCompleted).toBe(true);
    });
  });

  describe('canPerformSessionAction', () => {
    it('restricts "start_bidding" action exclusively to host_controlled mode', () => {
      const autoModeCheck = canPerformSessionAction('catalogue_live', 'live', 'start_bidding');
      expect(autoModeCheck.allowed).toBe(false);
      expect(autoModeCheck.reason).toContain('Automated catalogue modes advance rounds automatically');

      const hostModeCheck = canPerformSessionAction('host_controlled', 'live', 'start_bidding');
      expect(hostModeCheck.allowed).toBe(true);
    });

    it('prevents pausing a session that is not live', () => {
      const check = canPerformSessionAction('catalogue_live', 'scheduled', 'pause');
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('Session is not live.');
    });

    it('allows pausing a live session', () => {
      const check = canPerformSessionAction('catalogue_live', 'live', 'pause');
      expect(check.allowed).toBe(true);
    });

    it('prevents actions once a session has ended', () => {
      const check = canPerformSessionAction('catalogue_live', 'ended', 'pause');
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('Session has already ended.');
    });
  });
});
