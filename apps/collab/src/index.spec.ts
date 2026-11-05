import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyCollabToken, collabServer } from './index.js';

describe('CollabServer', () => {
  const collabSecret = 'dev_collab_token_secret_32_chars';
  const sessionSecret = 'dev_session_secret_change_in_production_min_32_chars';
  const roomSecret = 'dev_room_token_secret_change_in_production_32_chars';

  it('verifies dedicated signed collab token', () => {
    const token = jwt.sign(
      {
        sub: 'usr-456',
        interviewId: 'interview-789',
        role: 'interviewer',
        displayName: 'Lead Engineer',
      },
      collabSecret,
      { expiresIn: '15m' },
    );

    const user = verifyCollabToken(token);
    expect(user.role).toBe('interviewer');
    expect(user.displayName).toBe('Lead Engineer');
    expect(user.userId).toBe('usr-456');
    expect(user.interviewId).toBe('interview-789');
  });

  it('verifies candidate dedicated collab token', () => {
    const token = jwt.sign(
      {
        sub: 'cand-999',
        interviewId: 'interview-789',
        role: 'candidate',
        displayName: 'Alex Candidate',
      },
      collabSecret,
      { expiresIn: '15m' },
    );

    const user = verifyCollabToken(token);
    expect(user.role).toBe('candidate');
    expect(user.displayName).toBe('Alex Candidate');
    expect(user.interviewId).toBe('interview-789');
  });

  it('rejects expired token and accepts refreshed token on reconnect', () => {
    // 1. Expired token (issued in past with negative expiresIn)
    const expiredToken = jwt.sign(
      {
        sub: 'usr-456',
        interviewId: 'interview-789',
        role: 'interviewer',
        displayName: 'Lead Engineer',
      },
      collabSecret,
      { expiresIn: -10 },
    );

    expect(() => verifyCollabToken(expiredToken)).toThrow(
      'Unauthorized collaborative connection token',
    );

    // 2. Refreshed token simulates async token callback on reconnect
    const refreshedToken = jwt.sign(
      {
        sub: 'usr-456',
        interviewId: 'interview-789',
        role: 'interviewer',
        displayName: 'Lead Engineer',
      },
      collabSecret,
      { expiresIn: '15m' },
    );

    const refreshedUser = verifyCollabToken(refreshedToken);
    expect(refreshedUser.displayName).toBe('Lead Engineer');
    expect(refreshedUser.interviewId).toBe('interview-789');
  });

  it('verifies fallback interviewer session token', () => {
    const token = jwt.sign(
      { sub: 'usr-123', email: 'interviewer@test.com', displayName: 'Interviewer Alice' },
      sessionSecret,
    );

    const user = verifyCollabToken(token);
    expect(user.role).toBe('interviewer');
    expect(user.displayName).toBe('Interviewer Alice');
    expect(user.userId).toBe('usr-123');
  });

  it('verifies fallback candidate session token', () => {
    const token = jwt.sign(
      { interviewId: 'int-456', role: 'candidate', displayName: 'Candidate Bob' },
      roomSecret,
    );

    const user = verifyCollabToken(token);
    expect(user.role).toBe('candidate');
    expect(user.displayName).toBe('Candidate Bob');
    expect(user.interviewId).toBe('int-456');
  });

  it('rejects invalid or forged token', () => {
    expect(() => verifyCollabToken('invalid.token.signature')).toThrow(
      'Unauthorized collaborative connection token',
    );
  });

  it('configures server instance and health check hook', () => {
    expect(collabServer).toBeDefined();
    expect(typeof collabServer.listen).toBe('function');
  });
});
