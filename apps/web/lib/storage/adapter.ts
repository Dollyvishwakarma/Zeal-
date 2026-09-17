// Storage service abstraction
export interface UploadParams {
  key: string;
  body: Buffer | Uint8Array | Blob | ReadableStream | string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  url: string;
  key: string;
}

export interface StorageAdapter {
  upload(params: UploadParams): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  publicUrl(key: string): string;
}

// BATCH1_APPLIED
