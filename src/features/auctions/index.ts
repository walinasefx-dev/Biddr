export type AuctionSortOption = 'ending' | 'bids' | 'price_low' | 'price_high';

export interface AuctionFilterState {
  category: string;
  searchQuery: string;
  sortBy: AuctionSortOption;
}
