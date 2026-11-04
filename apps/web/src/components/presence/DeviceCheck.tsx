'use client';

import * as React from 'react';
import { Video, VideoOff, Mic, MicOff, RefreshCw, AlertCircle } from 'lucide-react';

interface DeviceCheckProps {
  onReady?: (devices: { audioDeviceId?: string; videoDeviceId?: string }) => void;
}

export function DeviceCheck({ onReady }: DeviceCheckProps) {
  const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = React.useState<string>('');
  const [selectedAudio, setSelectedAudio] = React.useState<string>('');
  const [isCameraOn, setIsCameraOn] = React.useState(true);
  const [isMicOn, setIsMicOn] = React.useState(true);
  const [permissionError, setPermissionError] = React.useState<string | null>(null);
  const [audioLevel, setAudioLevel] = React.useState(0);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  const startStream = React.useCallback(
    async (videoDeviceId?: string, audioDeviceId?: string) => {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      try {
        setPermissionError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
          setPermissionError('Camera and microphone access are not supported by this browser.');
          return;
        }

        const constraints: MediaStreamConstraints = {
          video: isCameraOn
            ? videoDeviceId
              ? { deviceId: { exact: videoDeviceId } }
              : true
            : false,
          audio: isMicOn
            ? audioDeviceId
              ? { deviceId: { exact: audioDeviceId } }
              : true
            : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup audio level meter
        if (isMicOn && stream.getAudioTracks().length > 0) {
          try {
            const AudioContextClass =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
            const audioCtx = new AudioContextClass();
            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 64;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateMeter = () => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] ?? 0;
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animationFrameRef.current = requestAnimationFrame(updateMeter);
            };

            updateMeter();
          } catch {
            // AudioContext not available in some sandbox/test environments
          }
        }

        // Refresh device list
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vInputs = devices.filter((d) => d.kind === 'videoinput');
        const aInputs = devices.filter((d) => d.kind === 'audioinput');
        setVideoDevices(vInputs);
        setAudioDevices(aInputs);

        if (!selectedVideo && vInputs[0]) setSelectedVideo(vInputs[0].deviceId);
        if (!selectedAudio && aInputs[0]) setSelectedAudio(aInputs[0].deviceId);

        onReady?.({
          videoDeviceId: videoDeviceId || vInputs[0]?.deviceId,
          audioDeviceId: audioDeviceId || aInputs[0]?.deviceId,
        });
      } catch {
        setPermissionError(
          'Could not access camera or microphone. Please allow permissions in your browser.',
        );
      }
    },
    [isCameraOn, isMicOn, selectedVideo, selectedAudio, onReady],
  );

  React.useEffect(() => {
    startStream(selectedVideo, selectedAudio);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedVideo, selectedAudio, isCameraOn, isMicOn, startStream]);

  return (
    <div className="border border-[#393E41] bg-[#1E2019] rounded p-4 text-xs space-y-3 text-[#D3D0CB]">
      <div className="flex items-center justify-between pb-1 border-b border-[#393E41]">
        <span className="font-semibold text-xs text-[#D3D0CB]">Camera & Audio Check</span>
        <button
          type="button"
          onClick={() => startStream(selectedVideo, selectedAudio)}
          className="text-[#D3D0CB]/60 hover:text-[#D3D0CB] flex items-center gap-1 text-[11px]"
        >
          <RefreshCw className="w-3 h-3" /> Refresh Devices
        </button>
      </div>

      {permissionError ? (
        <div className="p-3 bg-rose-950/30 border border-rose-600/40 rounded flex items-center gap-2 text-rose-300 text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{permissionError}</span>
        </div>
      ) : (
        <>
          {/* Video Preview Box */}
          <div className="relative w-full h-36 bg-[#393E41]/30 rounded overflow-hidden flex items-center justify-center border border-[#393E41]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
            />
            {!isCameraOn && (
              <div className="flex flex-col items-center justify-center gap-1 text-[#D3D0CB]/50">
                <VideoOff className="w-6 h-6" />
                <span className="text-[11px]">Camera Turned Off</span>
              </div>
            )}

            {/* Quick toggle overlay */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-[#1E2019]/80 backdrop-blur px-2 py-1 rounded border border-[#393E41]">
              <button
                type="button"
                onClick={() => setIsCameraOn(!isCameraOn)}
                className={`p-1 rounded transition-colors ${
                  isCameraOn ? 'text-[#D3D0CB] hover:bg-[#393E41]' : 'text-rose-400'
                }`}
                title={isCameraOn ? 'Disable camera' : 'Enable camera'}
              >
                {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-1 rounded transition-colors ${
                  isMicOn ? 'text-[#D3D0CB] hover:bg-[#393E41]' : 'text-rose-400'
                }`}
                title={isMicOn ? 'Mute mic' : 'Unmute mic'}
              >
                {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Mic Level Indicator */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#D3D0CB]/70 font-mono">
              <span className="flex items-center gap-1">
                <Mic className="w-3 h-3 text-[#587B7F]" /> Microphone Level:
              </span>
              <span>{isMicOn ? `${audioLevel}%` : 'Muted'}</span>
            </div>
            <div className="w-full h-1.5 bg-[#393E41]/40 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  audioLevel > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${isMicOn ? audioLevel : 0}%` }}
              />
            </div>
          </div>

          {/* Device Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div>
              <label htmlFor="device-camera-select" className="text-[10px] text-[#D3D0CB]/60 block mb-0.5">
                Camera:
              </label>
              <select
                id="device-camera-select"
                value={selectedVideo}
                onChange={(e) => setSelectedVideo(e.target.value)}
                className="w-full px-2 py-1 text-[11px] font-mono bg-[#393E41] border border-[#393E41] rounded text-[#D3D0CB] focus:border-[#E2C044] focus:outline-none"
              >
                {videoDevices.length === 0 ? (
                  <option value="">Default Camera</option>
                ) : (
                  videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label htmlFor="device-mic-select" className="text-[10px] text-[#D3D0CB]/60 block mb-0.5">
                Microphone:
              </label>
              <select
                id="device-mic-select"
                value={selectedAudio}
                onChange={(e) => setSelectedAudio(e.target.value)}
                className="w-full px-2 py-1 text-[11px] font-mono bg-[#393E41] border border-[#393E41] rounded text-[#D3D0CB] focus:border-[#E2C044] focus:outline-none"
              >
                {audioDevices.length === 0 ? (
                  <option value="">Default Microphone</option>
                ) : (
                  audioDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

