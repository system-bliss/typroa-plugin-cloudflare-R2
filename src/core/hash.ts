import { createHash } from 'node:crypto';

export function createContentHash(content: Buffer): string {
  return createHash('md5').update(content).digest('hex').slice(0, 8);
}
