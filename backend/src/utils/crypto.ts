/**
 * crypto.ts — Utilidades para cifrar/descifrar strings sensibles.
 * Usa AES-256-CBC con la ENCRYPTION_KEY del .env.
 * Se usa para almacenar passwords de firma y API MH en la BD.
 */

import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-cbc';
// La clave debe ser exactamente 32 bytes para AES-256
const KEY = Buffer.from(env.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));

/** Cifra un string y devuelve "iv:encrypted" en base64 */
export function encrypt(text: string): string {
  const iv        = crypto.randomBytes(16);
  const cipher    = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Descifra un string en formato "iv:encrypted" */
export function decrypt(encryptedText: string): string {
  const [ivHex, encHex] = encryptedText.split(':');
  const iv              = Buffer.from(ivHex, 'hex');
  const encrypted       = Buffer.from(encHex, 'hex');
  const decipher        = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  const decrypted       = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/** Devuelve true si el string ya está cifrado (formato "iv:hex") */
export function isEncrypted(text: string): boolean {
  return /^[0-9a-f]{32}:[0-9a-f]+$/.test(text);
}
