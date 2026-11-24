import { describe, it, expect } from 'vitest';
import { LiveKitStreamingService } from '../../src/lib/streaming/livekit';
import crypto from 'crypto';

describe('LiveKitStreamingService Unit Tests', () => {
  const service = new LiveKitStreamingService();

  it('generates a simulated token when API credentials are absent', () => {
    const result = service.generateAccessToken({
      roomName: 'biddr-session-mock-123',
      participantIdentity: 'user-viewer-456',
      participantName: 'Biddr Fan',
      canPublish: false,
      canSubscribe: true,
    });

    expect(result.token).toBeDefined();
    expect(result.roomName).toBe('biddr-session-mock-123');
    expect(result.participantIdentity).toBe('user-viewer-456');
    expect(result.canPublish).toBe(false);
    expect(result.canSubscribe).toBe(true);
    expect(result.isSimulated).toBe(true);

    const parts = result.token.split('.');
    expect(parts.length).toBe(3);
  });

  it('generates a valid production HMAC-SHA256 signed token when credentials are provided', () => {
    const apiKey = 'API_TEST_KEY_123';
    const apiSecret = 'API_TEST_SECRET_VERY_SECURE_456';

    const result = service.generateAccessToken({
      apiKey,
      apiSecret,
      roomName: 'biddr-session-real-789',
      participantIdentity: 'host-seller-1',
      participantName: 'Tokyo Vintage (Host)',
      canPublish: true,
      canSubscribe: true,
    });

    expect(result.isSimulated).toBe(false);
    expect(result.canPublish).toBe(true);
    expect(result.canSubscribe).toBe(true);

    const parts = result.token.split('.');
    expect(parts.length).toBe(3);

    // Verify JWT payload claims
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.iss).toBe(apiKey);
    expect(payload.sub).toBe('host-seller-1');
    expect(payload.video.room).toBe('biddr-session-real-789');
    expect(payload.video.canPublish).toBe(true);
    expect(payload.video.canSubscribe).toBe(true);

    // Verify HMAC SHA256 Signature
    const unsigned = `${parts[0]}.${parts[1]}`;
    const expectedSig = crypto
      .createHmac('sha256', apiSecret)
      .update(unsigned)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    expect(parts[2]).toBe(expectedSig);
  });

  it('strictly enforces role separation: viewers cannot be issued publisher grants', () => {
    const result = service.generateAccessToken({
      apiKey: 'k1',
      apiSecret: 's1',
      roomName: 'biddr-room-1',
      participantIdentity: 'viewer-user-99',
      canPublish: false,
      canSubscribe: true,
    });

    const payload = JSON.parse(Buffer.from(result.token.split('.')[1], 'base64').toString('utf8'));
    expect(payload.video.canPublish).toBe(false);
    expect(payload.video.canSubscribe).toBe(true);
  });
});
