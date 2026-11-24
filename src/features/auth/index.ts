export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  username: string | null;
  avatarUrl: string | null;
  isSeller: boolean;
  sellerVerified: boolean;
}
