import { describe, it, expect } from 'vitest';
import {
  checkRateLimitByIP,
  checkRateLimitByEmail,
} from '../lib/rateLimit';

describe('🛡️ RATE LIMITING', () => {
  it('✅ Permite 10 intentos por IP', () => {
    const ip = '192.168.1.1';
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimitByIP(ip);
      expect(result.success).toBe(true);
    }
  });

  it('❌ Rechaza intento 11 por IP', () => {
    const ip = '192.168.1.2';
    for (let i = 0; i < 10; i++) {
      checkRateLimitByIP(ip);
    }
    const result = checkRateLimitByIP(ip);
    expect(result.success).toBe(false);
  });

  it('✅ Permite 5 intentos por Email', () => {
    const email = 'test@example.com';
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimitByEmail(email);
      expect(result.success).toBe(true);
    }
  });

  it('❌ Rechaza intento 6 por Email', () => {
    const email = 'test2@example.com';
    for (let i = 0; i < 5; i++) {
      checkRateLimitByEmail(email);
    }
    const result = checkRateLimitByEmail(email);
    expect(result.success).toBe(false);
  });

  it('✅ Email es case-insensitive', () => {
    const email1 = 'UNIQUE1@EXAMPLE.COM';
    const email2 = 'unique1@example.com';
    
    checkRateLimitByEmail(email1);
    checkRateLimitByEmail(email2);
    const result = checkRateLimitByEmail(email2);
    
    // Después de 3 intentos (2 + 1), remaining debe ser 2
    expect(result.remaining).toBe(2);
  });

  it('✅ IPs diferentes son independientes', () => {
    const ip1 = '10.0.0.1';
    const ip2 = '10.0.0.2';
    
    for (let i = 0; i < 10; i++) {
      checkRateLimitByIP(ip1);
    }
    
    const result = checkRateLimitByIP(ip2);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(9);
  });
});