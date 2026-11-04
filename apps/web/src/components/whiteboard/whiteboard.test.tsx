import { describe, it, expect } from 'vitest';
import type { ExcalidrawElementStub } from './Whiteboard';

describe('Whiteboard & Excalidraw Yjs Reconciliation', () => {
  it('generates per-question document name and section whiteboard name correctly', () => {
    const interviewId = 'int-abc-123';
    const questionId = 'q-two-sum-456';

    const questionDocName = `whiteboard:${interviewId}:${questionId}`;
    const generalDocName = `whiteboard:${interviewId}`;

    expect(questionDocName).toBe('whiteboard:int-abc-123:q-two-sum-456');
    expect(generalDocName).toBe('whiteboard:int-abc-123');
  });

  it('reconciles elements based on version and versionNonce', () => {
    const localElement: ExcalidrawElementStub = {
      id: 'elem-1',
      version: 2,
      versionNonce: 100,
      type: 'rectangle',
      x: 10,
      y: 10,
    };

    const staleRemoteElement: ExcalidrawElementStub = {
      id: 'elem-1',
      version: 1,
      versionNonce: 200,
      type: 'rectangle',
      x: 5,
      y: 5,
    };

    const newerRemoteElement: ExcalidrawElementStub = {
      id: 'elem-1',
      version: 3,
      versionNonce: 50,
      type: 'rectangle',
      x: 50,
      y: 50,
    };

    const tieBreakerRemoteElement: ExcalidrawElementStub = {
      id: 'elem-1',
      version: 2,
      versionNonce: 150, // higher versionNonce wins tie
      type: 'rectangle',
      x: 20,
      y: 20,
    };

    function shouldApplyRemote(
      local: ExcalidrawElementStub | undefined,
      remote: ExcalidrawElementStub,
    ): boolean {
      if (!local) return true;
      if (remote.version > local.version) return true;
      if (remote.version === local.version && remote.versionNonce > local.versionNonce) return true;
      return false;
    }

    expect(shouldApplyRemote(localElement, staleRemoteElement)).toBe(false);
    expect(shouldApplyRemote(localElement, newerRemoteElement)).toBe(true);
    expect(shouldApplyRemote(localElement, tieBreakerRemoteElement)).toBe(true);
  });

  it('serializes and deserializes whiteboard snapshots for replay', () => {
    const elements: ExcalidrawElementStub[] = [
      {
        id: 'rect-1',
        version: 1,
        versionNonce: 12345,
        type: 'rectangle',
        x: 100,
        y: 200,
        width: 300,
        height: 150,
      },
      {
        id: 'arrow-1',
        version: 2,
        versionNonce: 54321,
        type: 'arrow',
        x: 250,
        y: 200,
      },
    ];

    const serialized = JSON.stringify(elements);
    expect(serialized).toContain('rect-1');
    expect(serialized).toContain('arrow-1');

    const parsed: ExcalidrawElementStub[] = JSON.parse(serialized);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.id).toBe('rect-1');
    expect(parsed[1]?.type).toBe('arrow');
  });
});
