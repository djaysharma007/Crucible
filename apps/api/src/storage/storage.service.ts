import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly simulatedStore = new Map<string, { body: Buffer; contentType: string }>();

  constructor() {
    this.endpoint =
      process.env.SUPABASE_S3_ENDPOINT ||
      process.env.SUPABASE_STORAGE_ENDPOINT ||
      process.env.S3_ENDPOINT ||
      '';
    const region =
      process.env.SUPABASE_S3_REGION ||
      process.env.SUPABASE_STORAGE_REGION ||
      process.env.S3_REGION ||
      'us-east-1';
    const accessKeyId =
      process.env.SUPABASE_S3_ACCESS_KEY ||
      process.env.SUPABASE_STORAGE_ACCESS_KEY ||
      process.env.S3_ACCESS_KEY ||
      '';
    const secretAccessKey =
      process.env.SUPABASE_S3_SECRET_KEY ||
      process.env.SUPABASE_STORAGE_SECRET_KEY ||
      process.env.S3_SECRET_KEY ||
      '';
    this.bucket =
      process.env.SUPABASE_S3_BUCKET ||
      process.env.SUPABASE_STORAGE_BUCKET ||
      process.env.S3_BUCKET_NAME ||
      'crucible-recordings';

    if (this.endpoint && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        endpoint: this.endpoint.startsWith('http') ? this.endpoint : `https://${this.endpoint}`,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
      this.logger.log(
        `Initialized S3 storage client for bucket '${this.bucket}' at ${this.endpoint}`,
      );
    } else {
      this.logger.warn(
        'Storage credentials not fully configured; S3 uploads will operate in simulated mode.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(this.s3Client);
  }

  async uploadObject(
    key: string,
    body: Buffer | Uint8Array,
    contentType = 'application/octet-stream',
  ): Promise<{ key: string; url: string; size: number }> {
    const size = body.length;

    if (this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } else {
      this.simulatedStore.set(key, { body: Buffer.from(body), contentType });
      this.logger.log(`[Storage Simulation] Stored object ${key} (${size} bytes, ${contentType})`);
    }

    const url = this.getPublicUrl(key);
    return { key, url, size };
  }

  async getObject(key: string): Promise<{ data: Buffer; contentType: string } | null> {
    if (this.s3Client) {
      try {
        const res = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
        );
        if (!res.Body) return null;
        const bytes = await res.Body.transformToByteArray();
        return {
          data: Buffer.from(bytes),
          contentType: res.ContentType || 'video/webm',
        };
      } catch (err) {
        this.logger.warn(`Failed to fetch object ${key} from S3: ${(err as Error).message}`);
        return null;
      }
    }

    const sim = this.simulatedStore.get(key);
    if (sim) {
      return { data: sim.body, contentType: sim.contentType };
    }
    return null;
  }

  getPublicUrl(key: string): string {
    if (this.endpoint) {
      const base = this.endpoint.startsWith('http') ? this.endpoint : `https://${this.endpoint}`;
      return `${base}/${this.bucket}/${key}`;
    }
    return `/storage/${this.bucket}/${key}`;
  }
}
