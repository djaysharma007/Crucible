import { describe, it, expect } from 'vitest';
import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  it('initializes and formats public URLs correctly', () => {
    process.env.SUPABASE_STORAGE_ENDPOINT = 'https://xyzcompany.supabase.co/storage/v1/s3';
    process.env.SUPABASE_STORAGE_BUCKET = 'crucible-recordings';

    const storage = new StorageService();
    const url = storage.getPublicUrl('recordings/int-123/chunk_00000.webm');

    expect(url).toBe(
      'https://xyzcompany.supabase.co/storage/v1/s3/crucible-recordings/recordings/int-123/chunk_00000.webm',
    );
  });

  it('stores objects in simulated mode when credentials are not configured', async () => {
    delete process.env.SUPABASE_STORAGE_ENDPOINT;
    delete process.env.S3_ENDPOINT;

    const storage = new StorageService();
    expect(storage.isConfigured()).toBe(false);

    const buffer = Buffer.from('test video chunk bytes');
    const result = await storage.uploadObject(
      'recordings/test/chunk_00000.webm',
      buffer,
      'video/webm',
    );

    expect(result.key).toBe('recordings/test/chunk_00000.webm');
    expect(result.size).toBe(buffer.length);
    expect(result.url).toBe('/storage/crucible-recordings/recordings/test/chunk_00000.webm');

    // Verify getObject retrieves the stored buffer
    const fetched = await storage.getObject('recordings/test/chunk_00000.webm');
    expect(fetched).not.toBeNull();
    expect(fetched?.data.toString()).toBe('test video chunk bytes');
    expect(fetched?.contentType).toBe('video/webm');

    // Verify non-existent object returns null
    const missing = await storage.getObject('recordings/test/missing.webm');
    expect(missing).toBeNull();
  });
});
