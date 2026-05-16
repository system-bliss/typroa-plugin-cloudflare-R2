export interface AppConfig {
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  keyPrefix: string;
  namingTemplate: string;
  cacheControl: string;
  timeoutMs: number;
  retryTimes: number;
}

export interface UploadResult {
  filePath: string;
  objectKey: string;
  url: string;
}
