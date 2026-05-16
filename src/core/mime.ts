import { extname } from 'node:path';

const contentTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

export function getContentType(filePath: string): string {
  return contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}
