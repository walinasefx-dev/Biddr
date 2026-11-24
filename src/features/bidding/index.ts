export interface LiveBidState {
  currentBid: number;
  bidCount: number;
  nextMinimumBid: number;
  minIncrement: number;
  antiSnipeTriggered: boolean;
}
