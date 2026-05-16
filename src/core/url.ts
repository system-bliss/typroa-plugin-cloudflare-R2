export function buildPublicUrl(publicBaseUrl: string, objectKey: string): string {
  const base = publicBaseUrl.replace(/\/+$/, '');
  const encodedKey = objectKey
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${base}/${encodedKey}`;
}
