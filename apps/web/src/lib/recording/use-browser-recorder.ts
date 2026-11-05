'use client';

import * as React from 'react';
import { apiClient } from '../api-client.js';

interface RecorderStreams {
  localStream?: MediaStream | null;
  remoteStreams?: (MediaStream | null | undefined)[];
  screenStream?: MediaStream | null;
}

export function useBrowserRecorder(interviewId: string) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [chunkIndex, setChunkIndex] = React.useState(0);
  const [recordedChunks, setRecordedChunks] = React.useState<number>(0);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const chunkIndexRef = React.useRef(0);

  const startRecording = React.useCallback(
    async ({ localStream, remoteStreams = [], screenStream }: RecorderStreams) => {
      if (typeof window === 'undefined' || !window.MediaRecorder) {
        throw new Error('MediaRecorder is not supported in this browser.');
      }

      chunkIndexRef.current = 0;
      setChunkIndex(0);
      setRecordedChunks(0);

      // 1. Setup Web Audio Context for audio mixing
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const destNode = audioCtx.createMediaStreamDestination();

      // Connect local participant microphone
      if (localStream && localStream.getAudioTracks().length > 0) {
        try {
          const localSource = audioCtx.createMediaStreamSource(localStream);
          localSource.connect(destNode);
        } catch {
          // Local audio setup ignored if already active
        }
      }

      // Connect remote participants' audio
      for (const remoteStream of remoteStreams) {
        if (remoteStream && remoteStream.getAudioTracks().length > 0) {
          try {
            const remoteSource = audioCtx.createMediaStreamSource(remoteStream);
            remoteSource.connect(destNode);
          } catch {
            // Ignored
          }
        }
      }

      // 2. Select Video Track: prefer screen share track if active, otherwise local camera
      const videoTrack = screenStream?.getVideoTracks()[0] || localStream?.getVideoTracks()[0];

      const tracks: MediaStreamTrack[] = [];
      if (videoTrack) {
        tracks.push(videoTrack);
      }
      const audioTrack = destNode.stream.getAudioTracks()[0];
      if (audioTrack) {
        tracks.push(audioTrack);
      }

      if (tracks.length === 0) {
        throw new Error('No audio or video streams available to record.');
      }

      const compositeStream = new MediaStream(tracks);

      // 3. Configure MediaRecorder with bitrate capping (500 kbps video + 64 kbps audio)
      const options: MediaRecorderOptions = {
        videoBitsPerSecond: 500000,
        audioBitsPerSecond: 64000,
      };

      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options.mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(compositeStream, options);
      mediaRecorderRef.current = recorder;

      // 4. Continuous chunk uploading every 10 seconds
      recorder.ondataavailable = async (e: BlobEvent) => {
        if (!e.data || e.data.size === 0) return;

        const currentIdx = chunkIndexRef.current++;
        setChunkIndex(currentIdx + 1);
        setRecordedChunks((prev) => prev + 1);

        try {
          const arrayBuffer = await e.data.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');

          await apiClient.post(`/rooms/${interviewId}/recording/chunk`, {
            chunkIndex: currentIdx,
            dataBase64: base64,
          });
        } catch {
          // If chunk upload fails, it is retried or dropped without breaking live recording
        }
      };

      // Emit chunk every 10,000ms (10s)
      recorder.start(10000);
      setIsRecording(true);
    },
    [interviewId],
  );

  const stopRecording = React.useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    setIsRecording(false);

    try {
      await apiClient.post(`/rooms/${interviewId}/recording/finalize`, {
        totalChunks: chunkIndexRef.current,
      });
    } catch {
      // Ignored
    }
  }, [interviewId]);

  return {
    isRecording,
    chunkIndex,
    recordedChunks,
    startRecording,
    stopRecording,
  };
}
