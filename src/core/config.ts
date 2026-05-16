import { readFile } from 'node:fs/promises';

import { z } from 'zod';

import { ConfigError } from './errors.js';
import type { AppConfig } from '../shared/types.js';

const rawConfigSchema = z.object({
  bucket: z.string().min(1),
  endpoint: z.string().url(),
  region: z.string().default('auto'),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  publicBaseUrl: z.string().url(),
  keyPrefix: z.string().default('typora/'),
  namingTemplate: z.string().default('{keyPrefix}/{YYYY}/{MM}/{DD}/{filename}-{hash8}.{ext}'),
  cacheControl: z.string().default('public, max-age=31536000, immutable'),
  timeoutMs: z.number().int().positive().default(20000),
  retryTimes: z.number().int().min(0).default(2),
});

function resolveEnvBackedValue(value: string, env: NodeJS.ProcessEnv): string {
  if (!value.startsWith('env:')) {
    return value;
  }

  const envName = value.slice(4);
  const resolved = env[envName];

  if (!resolved) {
    throw new ConfigError(`Missing required environment variable: ${envName}`);
  }

  return resolved;
}

export function loadConfigFrom(raw: unknown, env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = rawConfigSchema.parse(raw);

  return {
    ...parsed,
    accessKeyId: resolveEnvBackedValue(parsed.accessKeyId, env),
    secretAccessKey: resolveEnvBackedValue(parsed.secretAccessKey, env),
    publicBaseUrl: parsed.publicBaseUrl.replace(/\/+$/, ''),
  };
}

export async function loadConfigFile(
  configPath: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<AppConfig> {
  let content: string;

  try {
    content = await readFile(configPath, 'utf8');
  } catch (error) {
    throw new ConfigError(`Failed to read config file: ${configPath}`, { cause: error });
  }

  let rawConfig: unknown;

  try {
    rawConfig = JSON.parse(content);
  } catch (error) {
    throw new ConfigError(`Failed to parse config file as JSON: ${configPath}`, { cause: error });
  }

  try {
    return loadConfigFrom(rawConfig, env);
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }

    throw new ConfigError(`Invalid runtime config: ${configPath}`, { cause: error });
  }
}
