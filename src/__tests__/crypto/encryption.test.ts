/**
 * Unit tests for the encryption module
 */

import { encrypt, decrypt } from '../../crypto/encryption.js';

describe('Encryption Module', () => {
  describe('encrypt/decrypt roundtrip', () => {
    it('should decrypt to the original plaintext', () => {
      const plaintext = 'my-secret-password';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'pässwörd 🌍 日本語';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON-like credential data', () => {
      const credentials = JSON.stringify({
        host: 'http://localhost:3000',
        username: 'testuser',
        password: 's3cret!',
      });
      const encrypted = encrypt(credentials);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(credentials);
      expect(JSON.parse(decrypted)).toEqual({
        host: 'http://localhost:3000',
        username: 'testuser',
        password: 's3cret!',
      });
    });
  });

  describe('encrypt output properties', () => {
    it('should produce base64-encoded output', () => {
      const encrypted = encrypt('test');
      // Base64 regex: only valid base64 characters
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const plaintext = 'same-input';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should produce output longer than the input (IV + auth tag + ciphertext)', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const decoded = Buffer.from(encrypted, 'base64');
      // AES-GCM is a stream cipher: ciphertext length = plaintext length
      // Total: IV (16) + auth tag (16) + ciphertext (plaintext.length)
      expect(decoded.length).toBe(16 + 16 + plaintext.length);
    });
  });

  describe('decrypt error handling', () => {
    it('should throw on tampered ciphertext', () => {
      const encrypted = encrypt('test');
      const decoded = Buffer.from(encrypted, 'base64');
      // Tamper with the ciphertext portion (after IV + auth tag)
      decoded[decoded.length - 1] ^= 0xff;
      const tampered = decoded.toString('base64');
      expect(() => decrypt(tampered)).toThrow();
    });

    it('should throw on tampered auth tag', () => {
      const encrypted = encrypt('test');
      const decoded = Buffer.from(encrypted, 'base64');
      // Tamper with the auth tag (bytes 16-31)
      decoded[16] ^= 0xff;
      const tampered = decoded.toString('base64');
      expect(() => decrypt(tampered)).toThrow();
    });

    it('should throw on invalid base64 input', () => {
      expect(() => decrypt('not-valid-base64!!!')).toThrow();
    });

    it('should throw on truncated input', () => {
      const encrypted = encrypt('test');
      // Take only the first 10 bytes (less than IV + auth tag)
      const truncated = Buffer.from(encrypted, 'base64').subarray(0, 10).toString('base64');
      expect(() => decrypt(truncated)).toThrow();
    });
  });
});
