import { describe, it, expect } from 'vitest';
import { collabServer } from './index.js';

describe('CollabServer', () => {
  it('configures server instance with options', () => {
    expect(collabServer).toBeDefined();
    expect(typeof collabServer.listen).toBe('function');
  });
});
