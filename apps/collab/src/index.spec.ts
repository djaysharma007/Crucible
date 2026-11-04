import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyCollabToken, collabServer } from './index.js';

describe('CollabServer', () => {
  const sessionSecret = 'dev_session_secret_change_in_production_min_32_chars';
  const roomSecret = 'dev_room_token_secret_change_in_production_32_chars';

  it('verifies valid interviewer session token', () => {
    const token = jwt.sign(
      { sub: 'usr-123', email: 'interviewer@test.com', displayName: 'Interviewer Alice' },
      sessionSecret,
    );

    const user = verifyCollabToken(token);
    expect(user.role).toBe('interviewer');
    expect(user.displayName).toBe('Interviewer Alice');
    expect(user.userId).toBe('usr-123');
  });

  it('verifies valid candidate session token', () => {
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

  it('configures server instance', () => {
    expect(collabServer).toBeDefined();
    expect(typeof collabServer.listen).toBe('function');
  });
});
