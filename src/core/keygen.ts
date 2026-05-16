function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

export function sanitizeFilename(filename: string): string {
  return stripExtension(filename)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export interface BuildObjectKeyInput {
  keyPrefix: string;
  date: Date;
  originalName: string;
  hash: string;
  extension: string;
  namingTemplate: string;
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? `{${name}}`);
}

export function buildObjectKey(input: BuildObjectKeyInput): string {
  const year = String(input.date.getUTCFullYear());
  const month = String(input.date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(input.date.getUTCDate()).padStart(2, '0');
  const filename = sanitizeFilename(input.originalName) || 'image';
  const ext = input.extension;
  const prefix = input.keyPrefix.replace(/^\/+/, '').replace(/\/+$/, '');

  return renderTemplate(input.namingTemplate, {
    YYYY: year,
    MM: month,
    DD: day,
    filename,
    ext,
    hash: input.hash,
    hash8: input.hash,
    keyPrefix: prefix,
  });
}
