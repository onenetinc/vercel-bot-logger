/**
 * Vercel webhook authentication and verification
 */

import * as crypto from 'crypto';

/**
 * Verifies Vercel webhook signature using HMAC-SHA1
 *
 * Vercel signs each request with x-vercel-signature header
 * Signature = HMAC-SHA1(secret, raw_body)
 *
 * Reference: https://github.com/dacbd/vercel-log-drain
 */
export function verifySignature(
  rawBody: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha1', secret)
    .update(rawBody)
    .digest('hex');

  return signature === expectedSignature;
}
