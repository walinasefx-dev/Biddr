import type {
  AuctionSessionRecord,
  AuctionLotRecord,
  AuctionMode,
  AuctionSessionStatus,
} from '@/types';

export type {
  AuctionSessionRecord,
  AuctionLotRecord,
  AuctionMode,
  AuctionSessionStatus,
};

export interface SessionControlCommand {
  action: 'start_session' | 'pause_session' | 'resume_session' | 'advance_lot' | 'skip_lot' | 'end_session';
  sessionId: string;
  lotId?: string;
}
