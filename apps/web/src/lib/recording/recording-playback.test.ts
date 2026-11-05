import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAndSortChunks,
  concatenateWebmChunks,
  assembleRecordingVideo,
  MissingChunkError,
  RecordingChunkItem,
} from './recording-playback';
import { apiClient } from '../api-client';

vi.mock('../api-client', () => ({
  apiClient: vi.fn(),
}));

describe('Recording Playback Concatenation and Ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-blob-url');
      window.URL.revokeObjectURL = vi.fn();
    }
  });

  describe('validateAndSortChunks', () => {
    it('sorts out-of-order contiguous chunks numerically', () => {
      const unordered: RecordingChunkItem[] = [
        { chunkIndex: 2, url: '/chunk_2.webm' },
        { chunkIndex: 0, url: '/chunk_0.webm' },
        { chunkIndex: 1, url: '/chunk_1.webm' },
      ];

      const sorted = validateAndSortChunks(unordered);
      expect(sorted.map((c) => c.chunkIndex)).toEqual([0, 1, 2]);
    });

    it('throws MissingChunkError when an intermediate chunk is missing', () => {
      const gapped: RecordingChunkItem[] = [
        { chunkIndex: 0, url: '/chunk_0.webm' },
        { chunkIndex: 2, url: '/chunk_2.webm' },
      ];

      expect(() => validateAndSortChunks(gapped)).toThrow(MissingChunkError);
      try {
        validateAndSortChunks(gapped);
      } catch (err) {
        const error = err as MissingChunkError;
        expect(error.missingIndex).toBe(1);
        expect(error.expectedTotal).toBe(3);
        expect(error.message).toContain('missing chunk #1');
      }
    });

    it('throws MissingChunkError when a late chunk is missing based on expectedTotal', () => {
      const incomplete: RecordingChunkItem[] = [
        { chunkIndex: 0, url: '/chunk_0.webm' },
        { chunkIndex: 1, url: '/chunk_1.webm' },
      ];

      expect(() => validateAndSortChunks(incomplete, 3)).toThrow(MissingChunkError);
      try {
        validateAndSortChunks(incomplete, 3);
      } catch (err) {
        const error = err as MissingChunkError;
        expect(error.missingIndex).toBe(2);
        expect(error.expectedTotal).toBe(3);
        expect(error.message).toContain('missing chunk #2');
      }
    });

    it('throws an error if chunks list is empty', () => {
      expect(() => validateAndSortChunks([])).toThrow('No recording chunks available');
    });
  });

  describe('concatenateWebmChunks', () => {
    it('concatenates multiple array buffers into a single video/webm Blob', () => {
      const buf1 = new Uint8Array([1, 2, 3]).buffer;
      const buf2 = new Uint8Array([4, 5, 6]).buffer;

      const blob = concatenateWebmChunks([buf1, buf2]);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('video/webm');
      expect(blob.size).toBe(6);
    });

    it('throws when given an empty array', () => {
      expect(() => concatenateWebmChunks([])).toThrow('Cannot concatenate empty chunks array');
    });
  });

  describe('assembleRecordingVideo', () => {
    it('fetches manifest, downloads chunks in order, and returns single object URL', async () => {
      (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        interviewId: 'int-123',
        totalChunks: 3,
        isFinalized: true,
        chunks: [
          { chunkIndex: 1, streamUrl: '/api/v1/rooms/int-123/recording/chunks/1' },
          { chunkIndex: 0, streamUrl: '/api/v1/rooms/int-123/recording/chunks/0' },
          { chunkIndex: 2, streamUrl: '/api/v1/rooms/int-123/recording/chunks/2' },
        ],
      });

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        const index = url.slice(-1);
        return Promise.resolve({
          ok: true,
          status: 200,
          arrayBuffer: () => Promise.resolve(new Uint8Array([Number(index)]).buffer),
        });
      });
      global.fetch = mockFetch;

      const progressSpy = vi.fn();
      const result = await assembleRecordingVideo('int-123', progressSpy);

      expect(result.totalChunks).toBe(3);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.objectUrl).toBe('blob:http://localhost/test-blob-url');
      expect(progressSpy).toHaveBeenCalledTimes(3);
      expect(progressSpy).toHaveBeenLastCalledWith(3, 3);
    });

    it('fails clearly when an HTTP chunk download fails', async () => {
      (apiClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        interviewId: 'int-123',
        totalChunks: 2,
        isFinalized: true,
        chunks: [
          { chunkIndex: 0, streamUrl: '/api/v1/rooms/int-123/recording/chunks/0' },
          { chunkIndex: 1, streamUrl: '/api/v1/rooms/int-123/recording/chunks/1' },
        ],
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(assembleRecordingVideo('int-123')).rejects.toThrow(
        'Failed to fetch recording chunk #0 (HTTP 404): playback aborted.',
      );
    });
  });
});
