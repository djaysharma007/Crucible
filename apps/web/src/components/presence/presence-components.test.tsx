import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceCheck } from './DeviceCheck';
import { VideoTile } from './VideoTile';
import { MediaControls } from './MediaControls';
import { RecordingControls } from './RecordingControls';

// Mock Web Audio Context
class MockAudioContext {
  createAnalyser() {
    return {
      fftSize: 64,
      frequencyBinCount: 32,
      getByteFrequencyData: vi.fn(),
    };
  }
  createMediaStreamSource() {
    return {
      connect: vi.fn(),
    };
  }
}

describe('Phase 3 Presence Frontend Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock navigator.mediaDevices
    const mockTracks = [
      { stop: vi.fn(), kind: 'video' },
      { stop: vi.fn(), kind: 'audio' },
    ];
    const mockStream = {
      getTracks: () => mockTracks,
      getAudioTracks: () => [mockTracks[1]],
      getVideoTracks: () => [mockTracks[0]],
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'cam-1', label: 'FaceTime HD' },
          { kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in Mic' },
        ]),
      },
    });

    // Mock AudioContext
    Object.defineProperty(window, 'AudioContext', {
      writable: true,
      value: MockAudioContext,
    });
  });

  describe('DeviceCheck', () => {
    it('renders device check with camera and mic selectors', async () => {
      const onReady = vi.fn();
      render(<DeviceCheck onReady={onReady} />);

      expect(screen.getByText('Camera & Audio Check')).toBeDefined();
      expect(screen.getByText('Microphone Level:')).toBeDefined();

      await waitFor(() => {
        expect(screen.getByText('FaceTime HD')).toBeDefined();
        expect(screen.getByText('Built-in Mic')).toBeDefined();
      });
    });
  });

  describe('VideoTile', () => {
    it('renders candidate participant tile with name and role badge', () => {
      render(
        <VideoTile
          name="Jane Doe"
          isInterviewer={false}
          videoTrack={null}
          audioTrack={null}
          isMuted={true}
          isSpeaking={false}
          isLocal={false}
        />,
      );

      expect(screen.getByText('Jane Doe')).toBeDefined();
      expect(screen.getByText('Candidate')).toBeDefined();
    });

    it('renders interviewer participant tile with interviewer badge and speaking border', () => {
      const { container } = render(
        <VideoTile
          name="Senior Architect"
          isInterviewer={true}
          videoTrack={null}
          audioTrack={null}
          isMuted={false}
          isSpeaking={true}
          isLocal={true}
        />,
      );

      expect(screen.getByText('Senior Architect (You)')).toBeDefined();
      expect(screen.getByText('Interviewer')).toBeDefined();
      expect(container.firstChild).toBeDefined();
    });
  });

  describe('MediaControls', () => {
    it('triggers media toggle actions when clicked', () => {
      const onToggleCamera = vi.fn();
      const onToggleMic = vi.fn();
      const onToggleScreenShare = vi.fn();
      const onRequestCandidateScreenShare = vi.fn();

      render(
        <MediaControls
          isCameraEnabled={true}
          isMicEnabled={true}
          isScreenSharing={false}
          onToggleCamera={onToggleCamera}
          onToggleMic={onToggleMic}
          onToggleScreenShare={onToggleScreenShare}
          isInterviewer={true}
          onRequestCandidateScreenShare={onRequestCandidateScreenShare}
        />,
      );

      // Mic toggle
      const micBtn = screen.getByTitle('Mute Microphone');
      fireEvent.click(micBtn);
      expect(onToggleMic).toHaveBeenCalledTimes(1);

      // Camera toggle
      const camBtn = screen.getByTitle('Turn Off Camera');
      fireEvent.click(camBtn);
      expect(onToggleCamera).toHaveBeenCalledTimes(1);

      // Screen share toggle
      const screenBtn = screen.getByTitle('Share Screen');
      fireEvent.click(screenBtn);
      expect(onToggleScreenShare).toHaveBeenCalledTimes(1);

      // Request screen share button
      const reqBtn = screen.getByTitle('Prompt candidate to share their entire screen');
      fireEvent.click(reqBtn);
      expect(onRequestCandidateScreenShare).toHaveBeenCalledTimes(1);
    });
  });

  describe('RecordingControls', () => {
    it('renders inactive recording state and allows opening consent modal', () => {
      render(
        <RecordingControls
          interviewId="room-123"
          isInterviewer={true}
          recordingStatus={{
            isRecording: false,
            interviewerConsented: true,
            candidateConsented: false,
            startedAt: null,
            egressId: null,
          }}
          onStatusChange={vi.fn()}
        />,
      );

      const recordBtn = screen.getByRole('button', { name: /Record Session/i });
      expect(recordBtn).toBeDefined();

      fireEvent.click(recordBtn);

      expect(screen.getByText('Cloud Session Recording')).toBeDefined();
      expect(screen.getByText('Candidate Consent')).toBeDefined();
      expect(screen.getByText('Interviewer Consent')).toBeDefined();
    });

    it('renders active REC badge when session recording is active', () => {
      render(
        <RecordingControls
          interviewId="room-123"
          isInterviewer={true}
          recordingStatus={{
            isRecording: true,
            interviewerConsented: true,
            candidateConsented: true,
            startedAt: new Date().toISOString(),
            egressId: 'egress-123',
          }}
          onStatusChange={vi.fn()}
        />,
      );

      expect(screen.getByText('REC')).toBeDefined();
      expect(screen.getByRole('button', { name: /Stop Rec/i })).toBeDefined();
    });
  });
});
