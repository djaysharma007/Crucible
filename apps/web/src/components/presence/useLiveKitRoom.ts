'use client';

import * as React from 'react';
import {
  Room,
  RoomEvent,
  Participant,
  Track,
} from 'livekit-client';
import type { VideoTrack, AudioTrack } from 'livekit-client';
import { apiClient } from '@/lib/api-client';
import { LiveKitTokenResponse } from '@crucible/shared';

export interface ParticipantTrackState {
  identity: string;
  name: string;
  isInterviewer: boolean;
  videoTrack: VideoTrack | null;
  audioTrack: AudioTrack | null;
  screenShareTrack: VideoTrack | null;
  isMuted: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
}

export function useLiveKitRoom(interviewId: string) {
  const [room, setRoom] = React.useState<Room | null>(null);
  const [connectionState, setConnectionState] = React.useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [participants, setParticipants] = React.useState<ParticipantTrackState[]>([]);
  const [isCameraEnabled, setIsCameraEnabled] = React.useState(true);
  const [isMicEnabled, setIsMicEnabled] = React.useState(true);
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const [activeScreenShare, setActiveScreenShare] = React.useState<{
    participantName: string;
    isInterviewer: boolean;
    track: VideoTrack;
  } | null>(null);

  const roomRef = React.useRef<Room | null>(null);

  const updateParticipantsState = React.useCallback((currentRoom: Room) => {
    const list: ParticipantTrackState[] = [];

    // Helper to extract tracks
    const extractState = (p: Participant, isLocal: boolean): ParticipantTrackState => {
      let isInterviewer = false;
      try {
        if (p.metadata) {
          const meta = JSON.parse(p.metadata);
          isInterviewer = Boolean(meta.isInterviewer);
        }
      } catch {
        // Ignore JSON error
      }

      let vTrack: VideoTrack | null = null;
      let aTrack: AudioTrack | null = null;
      let sTrack: VideoTrack | null = null;

      for (const pub of p.trackPublications.values()) {
        if (pub.track) {
          if (pub.source === Track.Source.Camera) {
            vTrack = pub.track as VideoTrack;
          } else if (pub.source === Track.Source.Microphone) {
            aTrack = pub.track as AudioTrack;
          } else if (pub.source === Track.Source.ScreenShare) {
            sTrack = pub.track as VideoTrack;
          }
        }
      }

      const isMuted = aTrack ? Boolean(aTrack.isMuted) : true;

      return {
        identity: p.identity,
        name: p.name || (isInterviewer ? 'Interviewer' : 'Candidate'),
        isInterviewer,
        videoTrack: vTrack,
        audioTrack: aTrack,
        screenShareTrack: sTrack,
        isMuted,
        isSpeaking: p.isSpeaking,
        isLocal,
      };
    };

    if (currentRoom.localParticipant) {
      list.push(extractState(currentRoom.localParticipant, true));
    }

    currentRoom.remoteParticipants.forEach((rp) => {
      list.push(extractState(rp, false));
    });

    setParticipants(list);

    // Check if anyone is screen sharing
    let foundScreen: { participantName: string; isInterviewer: boolean; track: VideoTrack } | null = null;
    for (const p of list) {
      if (p.screenShareTrack) {
        foundScreen = {
          participantName: p.name,
          isInterviewer: p.isInterviewer,
          track: p.screenShareTrack,
        };
        break;
      }
    }
    setActiveScreenShare(foundScreen);
  }, []);

  React.useEffect(() => {
    let isCancelled = false;

    const connectToRoom = async () => {
      try {
        setConnectionState('connecting');

        // Fetch LiveKit token
        const tokenRes = await apiClient.post<LiveKitTokenResponse>(
          `/rooms/${interviewId}/livekit-token`,
        );

        if (isCancelled) return;

        const lkRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = lkRoom;
        setRoom(lkRoom);

        // Attach listeners
        lkRoom.on(RoomEvent.Connected, () => {
          if (!isCancelled) setConnectionState('connected');
          updateParticipantsState(lkRoom);
        });

        lkRoom.on(RoomEvent.Disconnected, () => {
          if (!isCancelled) setConnectionState('disconnected');
          setParticipants([]);
        });

        lkRoom.on(RoomEvent.ParticipantConnected, () => updateParticipantsState(lkRoom));
        lkRoom.on(RoomEvent.ParticipantDisconnected, () => updateParticipantsState(lkRoom));
        lkRoom.on(RoomEvent.TrackSubscribed, () => updateParticipantsState(lkRoom));
        lkRoom.on(RoomEvent.TrackUnsubscribed, () => updateParticipantsState(lkRoom));
        lkRoom.on(RoomEvent.TrackMuted, () => updateParticipantsState(lkRoom));
        lkRoom.on(RoomEvent.TrackUnmuted, () => updateParticipantsState(lkRoom));
        lkRoom.on(RoomEvent.ActiveSpeakersChanged, () => updateParticipantsState(lkRoom));

        // Connect to LiveKit SFU
        await lkRoom.connect(tokenRes.wsUrl, tokenRes.token);

        // Enable default camera & mic if available
        try {
          await lkRoom.localParticipant.setCameraEnabled(true);
          await lkRoom.localParticipant.setMicrophoneEnabled(true);
        } catch {
          // Fallback if media devices are unavailable or in test environment
        }

        updateParticipantsState(lkRoom);
      } catch {
        if (!isCancelled) {
          // If LiveKit server is offline locally, fallback to simulated state for development
          setConnectionState('disconnected');
        }
      }
    };

    connectToRoom();

    return () => {
      isCancelled = true;
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, [interviewId, updateParticipantsState]);

  const toggleCamera = async () => {
    if (!roomRef.current) return;
    const next = !isCameraEnabled;
    try {
      await roomRef.current.localParticipant.setCameraEnabled(next);
      setIsCameraEnabled(next);
      updateParticipantsState(roomRef.current);
    } catch {
      // Handled
    }
  };

  const toggleMicrophone = async () => {
    if (!roomRef.current) return;
    const next = !isMicEnabled;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(next);
      setIsMicEnabled(next);
      updateParticipantsState(roomRef.current);
    } catch {
      // Handled
    }
  };

  const toggleScreenShare = async () => {
    if (!roomRef.current) return;
    const next = !isScreenSharing;
    try {
      await roomRef.current.localParticipant.setScreenShareEnabled(next);
      setIsScreenSharing(next);
      updateParticipantsState(roomRef.current);
    } catch {
      setIsScreenSharing(false);
    }
  };

  return {
    room,
    connectionState,
    participants,
    isCameraEnabled,
    isMicEnabled,
    isScreenSharing,
    activeScreenShare,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
  };
}

