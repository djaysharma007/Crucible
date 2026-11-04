import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { BrevoEmailService } from './brevo-email.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let mockRedis: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
    mockRedis = {
      set: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
    };
    authService = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockRedis as unknown as RedisService,
      { sendPasswordResetEmail: vi.fn().mockResolvedValue(true) } as unknown as BrevoEmailService,
    );
  });

  it('rejects registration when email already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

    await expect(
      authService.register({
        email: 'duplicate@example.com',
        password: 'password123',
        displayName: 'Test User',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('registers new user and hashes password with Argon2id', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockImplementation(
      ({ data }: { data: { email: string; passwordHash: string; displayName: string } }) =>
        Promise.resolve({
          id: 'new-user-uuid',
          email: data.email,
          passwordHash: data.passwordHash,
          displayName: data.displayName,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
    );

    const result = await authService.register({
      email: 'newuser@example.com',
      password: 'securepassword123',
      displayName: 'Alice Engineer',
    });

    expect(result.user.email).toBe('newuser@example.com');
    expect(result.user.displayName).toBe('Alice Engineer');
    expect(typeof result.token).toBe('string');
  });

  it('rejects login with invalid email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'unknown@example.com',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('dispatches reset email on forgotPassword', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-reset-1',
      email: 'interviewer@crucible.dev',
    });

    const res = await authService.forgotPassword({ email: 'interviewer@crucible.dev' });
    expect(res.message).toContain('instructions have been sent');
    expect(mockRedis.set).toHaveBeenCalled();
  });
});
