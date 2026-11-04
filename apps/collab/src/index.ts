import { Server } from '@hocuspocus/server';
import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.COLLAB_PORT) || 4001;
const sessionSecret =
  process.env.SESSION_SECRET || 'dev_session_secret_change_in_production_min_32_chars';
const roomSecret =
  process.env.ROOM_TOKEN_SECRET || 'dev_room_token_secret_change_in_production_32_chars';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.connect().catch((err) => {
  process.stderr.write(`Collab Redis connection deferred: ${(err as Error).message}\n`);
});

export interface CollabUserContext {
  userId?: string;
  role: 'interviewer' | 'candidate';
  displayName: string;
  interviewId?: string;
}

export function verifyCollabToken(token: string): CollabUserContext {
  // First attempt verifying as interviewer session
  try {
    const decoded = jwt.verify(token, sessionSecret) as {
      sub: string;
      email: string;
      displayName: string;
    };
    return {
      userId: decoded.sub,
      role: 'interviewer',
      displayName: decoded.displayName,
    };
  } catch {
    // Attempt candidate session
    try {
      const decoded = jwt.verify(token, roomSecret) as {
        interviewId: string;
        role: 'candidate';
        displayName: string;
      };
      return {
        role: 'candidate',
        displayName: decoded.displayName,
        interviewId: decoded.interviewId,
      };
    } catch {
      throw new Error('Unauthorized collaborative connection token');
    }
  }
}

export const collabServer = Server.configure({
  port,
  async onAuthenticate(data) {
    const { token, connection } = data;

    if (!token) {
      throw new Error('Authentication token required for collaborative editing');
    }

    const auth = verifyCollabToken(token);

    // If candidate, check if room is locked or interview ended
    if (auth.role === 'candidate') {
      // documentName format is code:<interviewQuestionId> or whiteboard:<interviewId>
      const interviewId = auth.interviewId;
      if (interviewId) {
        try {
          const isLocked = await redis.get(`room:${interviewId}:locked`);
          if (isLocked === 'true') {
            connection.readOnly = true;
          }
        } catch {
          // If Redis is unreachable, continue
        }
      }
    }

    return {
      user: {
        id: auth.userId || auth.displayName,
        name: auth.displayName,
        role: auth.role,
      },
    };
  },
  async onChange(data) {
    // Phase 2 will implement appending updates to collab_updates table
    return data;
  },
});

if (process.env.NODE_ENV !== 'test') {
  collabServer.listen().then(() => {
    process.stdout.write(`Crucible Collab Server running on ws://localhost:${port}\n`);
  });
}
