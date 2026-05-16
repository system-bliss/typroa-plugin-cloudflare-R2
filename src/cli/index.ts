import { NodeHttpHandler } from '@smithy/node-http-handler';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseCliArgs } from './argv.js';
import { writeUrls } from './stdout.js';
import { loadConfigFile } from '../core/config.js';
import { ConfigError, FileError, UploadError } from '../core/errors.js';
import { uploadManyImages } from '../core/uploader.js';
import type { AppConfig, UploadResult } from '../shared/types.js';

interface S3LikeClient {
  send(command: PutObjectCommand): Promise<unknown>;
}

export interface RunCliInput {
  argv: string[];
  env?: NodeJS.ProcessEnv;
  moduleUrl?: string;
  loadConfig?: (configPath: string, env: NodeJS.ProcessEnv) => Promise<AppConfig>;
  createS3Client?: (config: AppConfig) => S3LikeClient;
  uploadMany?: (input: {
    filePaths: string[];
    config: AppConfig;
    s3: S3LikeClient;
  }) => Promise<Array<Pick<UploadResult, 'url'>>>;
  writeStdout?: (line: string) => void;
  writeStderr?: (line: string) => void;
}

function resolveConfigPath(
  parsedArgs: ReturnType<typeof parseCliArgs>,
  env: NodeJS.ProcessEnv,
  moduleUrl: string
): string {
  if (parsedArgs.configPath) {
    return parsedArgs.configPath;
  }

  if (env.TYPORA_R2_CONFIG) {
    return env.TYPORA_R2_CONFIG;
  }

  return fileURLToPath(new URL('../../config.json', moduleUrl));
}

function defaultCreateS3Client(config: AppConfig): S3LikeClient {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestHandler: new NodeHttpHandler({
      requestTimeout: config.timeoutMs,
    }),
  });
}

function mapErrorToExitCode(error: unknown): number {
  if (error instanceof ConfigError) {
    return 2;
  }

  if (error instanceof FileError) {
    return 3;
  }

  if (error instanceof UploadError) {
    return 4;
  }

  return 5;
}

export async function runCli(input: RunCliInput): Promise<number> {
  const writeStdout = input.writeStdout ?? ((line: string) => console.log(line));
  const writeStderr = input.writeStderr ?? ((line: string) => console.error(line));
  const env = input.env ?? process.env;
  const parsedArgs = parseCliArgs(input.argv);

  if (parsedArgs.imagePaths.length === 0) {
    writeStderr('No image paths received from Typora.');
    return 1;
  }

  const moduleUrl = input.moduleUrl ?? import.meta.url;
  const loadConfig = input.loadConfig ?? loadConfigFile;
  const createS3Client = input.createS3Client ?? defaultCreateS3Client;
  const uploadMany = input.uploadMany ?? uploadManyImages;

  try {
    const configPath = resolveConfigPath(parsedArgs, env, moduleUrl);
    const config = await loadConfig(configPath, env);
    const s3 = createS3Client(config);
    const results = await uploadMany({
      filePaths: parsedArgs.imagePaths,
      config,
      s3,
    });

    writeUrls(
      results.map((result) => result.url),
      writeStdout
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeStderr(`[typora-r2] upload failed reason="${message}"`);
    return mapErrorToExitCode(error);
  }
}

const isDirectRun =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const exitCode = await runCli({
    argv: process.argv.slice(2),
  });
  process.exitCode = exitCode;
}
