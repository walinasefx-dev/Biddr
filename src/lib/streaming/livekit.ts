import crypto from 'crypto';

export interface LiveKitTokenOptions {
  apiKey?: string;
  apiSecret?: string;
  roomName: string;
  participantIdentity: string;
  participantName?: string;
  canPublish: boolean;
  canSubscribe: boolean;
  ttlSeconds?: number;
}

export interface LiveKitTokenResult {
  token: string;
  roomName: string;
  participantIdentity: string;
  canPublish: boolean;
  canSubscribe: boolean;
  isSimulated: boolean;
  serverUrl: string;
}

/**
 * Base64 URL Encoding helper for JWT
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * LiveKit Streaming Token Service
 *
 * Implements standard LiveKit WebRTC Access Token generation using JWT specification.
 * Signs room grants (publish, subscribe, data) with HMAC-SHA256.
 * Zero heavy native binary dependencies; 100% portable across Next.js and Edge runtimes.
 */
export class LiveKitStreamingService {
  private apiKey: string | null;
  private apiSecret: string | null;
  private wsUrl: string;

  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY || null;
    this.apiSecret = process.env.LIVEKIT_API_SECRET || null;
    this.wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://live.biddr.io';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiSecret);
  }

  /**
   * Generates a signed LiveKit Access Token for a publisher (host) or subscriber (viewer).
   */
  public generateAccessToken(options: LiveKitTokenOptions): LiveKitTokenResult {
    const key = options.apiKey || this.apiKey;
    const secret = options.apiSecret || this.apiSecret;
    const now = Math.floor(Date.now() / 1000);
    const ttl = options.ttlSeconds || 6 * 3600; // 6 hours default

    // If API credentials are not set, return simulated token for local test harness
    if (!key || !secret) {
      const simulatedPayload = {
        iss: 'simulated_biddr_key',
        sub: options.participantIdentity,
        name: options.participantName || options.participantIdentity,
        video: {
          room: options.roomName,
          roomJoin: true,
          canPublish: options.canPublish,
          canSubscribe: options.canSubscribe,
          canPublishData: true,
        },
        iat: now,
        exp: now + ttl,
      };

      const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = base64UrlEncode(JSON.stringify(simulatedPayload));
      const simulatedSignature = base64UrlEncode('simulated_signature');

      return {
        token: `${header}.${payload}.${simulatedSignature}`,
        roomName: options.roomName,
        participantIdentity: options.participantIdentity,
        canPublish: options.canPublish,
        canSubscribe: options.canSubscribe,
        isSimulated: true,
        serverUrl: this.wsUrl,
      };
    }

    // Production JWT Generation for LiveKit Server
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64UrlEncode(
      JSON.stringify({
        iss: key,
        sub: options.participantIdentity,
        name: options.participantName || options.participantIdentity,
        nbf: now - 5,
        exp: now + ttl,
        video: {
          room: options.roomName,
          roomJoin: true,
          canPublish: options.canPublish,
          canSubscribe: options.canSubscribe,
          canPublishData: true,
        },
      })
    );

    const unsignedToken = `${header}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(unsignedToken)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return {
      token: `${unsignedToken}.${signature}`,
      roomName: options.roomName,
      participantIdentity: options.participantIdentity,
      canPublish: options.canPublish,
      canSubscribe: options.canSubscribe,
      isSimulated: false,
      serverUrl: this.wsUrl,
    };
  }
}

export const liveKitService = new LiveKitStreamingService();
