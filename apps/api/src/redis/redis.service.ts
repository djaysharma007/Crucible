import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.client
        .connect()
        .then(() => {
          this.logger.log(`Connected to Redis at ${redisUrl}`);
        })
        .catch((err) => {
          this.logger.warn(`Redis connection deferred: ${(err as Error).message}`);
        });
    } catch (err) {
      this.logger.warn(`Redis client initialization deferred: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Disconnected from Redis');
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.warn(`Redis get failed for ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.logger.warn(`Redis set failed for ${key}: ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Redis del failed for ${key}: ${(err as Error).message}`);
    }
  }

  async sAdd(key: string, member: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.sadd(key, member);
    } catch (err) {
      this.logger.warn(`Redis sAdd failed for ${key}: ${(err as Error).message}`);
    }
  }

  async sMembers(key: string): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.smembers(key);
    } catch (err) {
      this.logger.warn(`Redis sMembers failed for ${key}: ${(err as Error).message}`);
      return [];
    }
  }

  async sRem(key: string, member: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.srem(key, member);
    } catch (err) {
      this.logger.warn(`Redis sRem failed for ${key}: ${(err as Error).message}`);
    }
  }

  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetSeconds: number; current: number }> {
    if (!this.client) {
      return { allowed: true, remaining: limit - 1, resetSeconds: windowSeconds, current: 1 };
    }
    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.ttl(key);
      const results = await multi.exec();

      const current = typeof results?.[0]?.[1] === 'number' ? results[0][1] : 1;
      let ttl = typeof results?.[1]?.[1] === 'number' ? results[1][1] : -1;

      if (ttl === -1 || ttl === -2) {
        await this.client.expire(key, windowSeconds);
        ttl = windowSeconds;
      }

      const remaining = Math.max(0, limit - current);
      return {
        allowed: current <= limit,
        remaining,
        resetSeconds: Math.max(1, ttl),
        current,
      };
    } catch (err) {
      this.logger.warn(`Redis checkRateLimit failed for ${key}: ${(err as Error).message}`);
      return { allowed: true, remaining: limit - 1, resetSeconds: windowSeconds, current: 1 };
    }
  }
}
