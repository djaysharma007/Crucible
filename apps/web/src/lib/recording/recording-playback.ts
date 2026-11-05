import { apiClient } from '../api-client';

export interface RecordingChunkItem {
  chunkIndex: number;
  key?: string;
  url?: string;
  streamUrl?: string;
}

export interface RecordingManifestResponse {
  interviewId: string;
  totalChunks: number;
  isFinalized: boolean;
  chunks: RecordingChunkItem[];
}

export class MissingChunkError extends Error {
  constructor(
    public readonly missingIndex: number,
    public readonly expectedTotal: number,
    public readonly availableIndices: number[],
  ) {
    super(
      `Recording incomplete: missing chunk #${missingIndex}. Expected continuous sequence 0..${
        expectedTotal - 1
      }, but found [${availableIndices.join(', ')}]. Playback aborted to prevent stream corruption.`,
    );
    this.name = 'MissingChunkError';
  }
}

/**
 * Validates contiguous chunk indices from 0 to totalChunks - 1.
 * Sorts chunks in ascending numerical order.
 * Throws MissingChunkError if any chunk in the sequence is missing.
 */
export function validateAndSortChunks(
  chunks: RecordingChunkItem[],
  expectedTotal?: number,
): RecordingChunkItem[] {
  if (!chunks || chunks.length === 0) {
    throw new Error('No recording chunks available for this interview.');
  }

  // Sort ascending by chunkIndex
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const availableIndices = sorted.map((c) => c.chunkIndex);

  // Determine total expected chunks (use expectedTotal if higher than max index + 1)
  const maxIndex = sorted[sorted.length - 1].chunkIndex;
  const total = Math.max(expectedTotal ?? 0, maxIndex + 1);

  // Verify contiguous 0..total-1
  for (let expected = 0; expected < total; expected++) {
    const found = sorted.find((c) => c.chunkIndex === expected);
    if (!found) {
      throw new MissingChunkError(expected, total, availableIndices);
    }
  }

  return sorted;
}

/**
 * Concatenates ordered chunk byte buffers into a single playable WebM Blob.
 * In WebM/EBML, chunk 0 contains the EBML, Segment, and Tracks headers,
 * while subsequent timeslice chunks contain sequential Clusters. Concatenating
 * them in exact index order forms a single continuous, valid WebM container.
 */
export function concatenateWebmChunks(buffers: (ArrayBuffer | Uint8Array)[]): Blob {
  if (!buffers || buffers.length === 0) {
    throw new Error('Cannot concatenate empty chunks array');
  }
  return new Blob(buffers, { type: 'video/webm' });
}

export interface AssembleResult {
  blob: Blob;
  objectUrl: string;
  totalChunks: number;
}

/**
 * Fetches the chunk manifest, verifies contiguous ordering, downloads all chunks
 * as ArrayBuffers, concatenates them into a single Blob, and creates an object URL.
 */
export async function assembleRecordingVideo(
  interviewId: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<AssembleResult> {
  const manifest = await apiClient<RecordingManifestResponse>(
    `/rooms/${interviewId}/recording/chunks`,
  );

  if (!manifest.chunks || manifest.chunks.length === 0) {
    throw new Error('No recording chunks found for this interview.');
  }

  const sortedChunks = validateAndSortChunks(manifest.chunks, manifest.totalChunks);
  const total = sortedChunks.length;

  const buffers: ArrayBuffer[] = [];

  for (let i = 0; i < sortedChunks.length; i++) {
    const chunk = sortedChunks[i];
    // Use relative streaming proxy endpoint to avoid CORS issues
    const targetUrl =
      chunk.streamUrl || `/api/v1/rooms/${interviewId}/recording/chunks/${chunk.chunkIndex}`;

    const res = await fetch(targetUrl);
    if (!res.ok) {
      throw new Error(
        `Failed to fetch recording chunk #${chunk.chunkIndex} (HTTP ${res.status}): playback aborted.`,
      );
    }

    const buf = await res.arrayBuffer();
    buffers.push(buf);
    onProgress?.(i + 1, total);
  }

  const blob = concatenateWebmChunks(buffers);
  const objectUrl = URL.createObjectURL(blob);

  return {
    blob,
    objectUrl,
    totalChunks: total,
  };
}
