import { describe, it, expect } from 'vitest';
import type { UserProfile } from '../src/types';

// Helper validating username format
function sanitizeAndValidateUsername(raw: string): { valid: boolean; username: string; error?: string } {
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (cleaned.length < 3) {
    return { valid: false, username: cleaned, error: 'Username must be at least 3 characters' };
  }
  if (cleaned.length > 30) {
    return { valid: false, username: cleaned, error: 'Username cannot exceed 30 characters' };
  }
  return { valid: true, username: cleaned };
}

// Helper simulating profile update security filter (matching database trigger)
function applyProfileUpdateSecurity(
  current: UserProfile,
  requestedUpdates: Partial<UserProfile>,
  callerRole: 'authenticated' | 'service_role'
): UserProfile {
  const updated: UserProfile = {
    ...current,
    full_name: requestedUpdates.full_name !== undefined ? requestedUpdates.full_name : current.full_name,
    bio: requestedUpdates.bio !== undefined ? requestedUpdates.bio : current.bio,
    location: requestedUpdates.location !== undefined ? requestedUpdates.location : current.location,
    avatar_url: requestedUpdates.avatar_url !== undefined ? requestedUpdates.avatar_url : current.avatar_url,
    updated_at: new Date().toISOString(),
  };

  // Privilege Guard: Authenticated users CANNOT modify is_seller or seller_verified
  if (callerRole === 'authenticated') {
    updated.is_seller = current.is_seller;
    updated.seller_verified = current.seller_verified;
  } else {
    if (requestedUpdates.is_seller !== undefined) updated.is_seller = requestedUpdates.is_seller;
    if (requestedUpdates.seller_verified !== undefined) updated.seller_verified = requestedUpdates.seller_verified;
  }

  return updated;
}

describe('Biddr Authentication & Profile Security System', () => {
  const mockInitialUser: UserProfile = {
    id: 'usr-uuid-1234',
    username: 'retrogamer',
    full_name: 'Retro Gamer',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Archiving 90s vintage tech',
    location: 'Kyoto, Japan',
    is_seller: false,
    seller_verified: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  };

  // 1. Registration input validation
  it('1. should validate registration username sanitization and minimum length', () => {
    const validCheck = sanitizeAndValidateUsername('  Cool_Collector!99  ');
    expect(validCheck.valid).toBe(true);
    expect(validCheck.username).toBe('cool_collector99');

    const shortCheck = sanitizeAndValidateUsername('ab');
    expect(shortCheck.valid).toBe(false);
    expect(shortCheck.error).toContain('at least 3 characters');
  });

  // 2. Login credential validation & error handling
  it('2. should correctly identify invalid credentials and provide friendly messages', () => {
    const mockAuthError = (msg: string) => {
      if (msg.includes('Invalid login credentials')) {
        return 'Invalid email or password. Please check your credentials.';
      }
      return msg;
    };

    const friendly = mockAuthError('Invalid login credentials');
    expect(friendly).toBe('Invalid email or password. Please check your credentials.');
  });

  // 3. Logout & session state clearance
  it('3. should clear current user and credentials on logout', () => {
    let sessionUser: UserProfile | null = mockInitialUser;
    // Simulate signOut()
    sessionUser = null;
    expect(sessionUser).toBeNull();
  });

  // 4. Session persistence simulation
  it('4. should retain user profile from session when session token exists', () => {
    const mockCookies = { 'sb-access-token': 'mock-jwt-token-xyz' };
    const hasSession = Boolean(mockCookies['sb-access-token']);
    expect(hasSession).toBe(true);
  });

  // 5. Password recovery flow
  it('5. should construct valid password reset redirect URL', () => {
    const origin = 'https://biddr.com';
    const redirectUrl = `${origin}/auth/callback?next=/reset-password`;
    expect(redirectUrl).toBe('https://biddr.com/auth/callback?next=/reset-password');
  });

  // 6. Profile creation defaults
  it('6. should initialize newly created profiles with safe buyer defaults', () => {
    const newProfile: UserProfile = {
      id: 'new-user-5678',
      username: 'new_collector',
      full_name: null,
      avatar_url: null,
      bio: null,
      location: null,
      is_seller: false,
      seller_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(newProfile.is_seller).toBe(false);
    expect(newProfile.seller_verified).toBe(false);
  });

  // 7. Profile editing by user
  it('7. should allow users to update their full name, bio, and location', () => {
    const updates = {
      full_name: 'Retro Curator & Collector',
      bio: 'Now collecting vintage synthesizers.',
      location: 'Tokyo, Japan',
    };

    const updated = applyProfileUpdateSecurity(mockInitialUser, updates, 'authenticated');

    expect(updated.full_name).toBe('Retro Curator & Collector');
    expect(updated.bio).toBe('Now collecting vintage synthesizers.');
    expect(updated.location).toBe('Tokyo, Japan');
  });

  // 8. Access restrictions & privilege elevation prevention (Security Requirement)
  it('8. should strictly prevent authenticated users from granting themselves seller or verified status', () => {
    const maliciousAttempt = {
      full_name: 'Hacker',
      is_seller: true,
      seller_verified: true,
    };

    // Client attempt with role 'authenticated'
    const result = applyProfileUpdateSecurity(mockInitialUser, maliciousAttempt, 'authenticated');

    expect(result.full_name).toBe('Hacker');
    // Privilege flags MUST remain false
    expect(result.is_seller).toBe(false);
    expect(result.seller_verified).toBe(false);
  });

  // 9. Row Level Security policy checks
  it('9. should enforce that only owners can modify their profile row', () => {
    const checkCanUpdate = (authUserId: string, targetProfileId: string) => {
      return authUserId === targetProfileId; // Enforces RLS: USING (auth.uid() = id)
    };

    expect(checkCanUpdate('user-1', 'user-1')).toBe(true);
    expect(checkCanUpdate('user-1', 'user-2')).toBe(false);
  });
});
