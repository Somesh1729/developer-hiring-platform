import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { PhoneOff, Mic, MicOff, Video, VideoOff, ScreenShare } from 'lucide-react';
import toast from 'react-hot-toast';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

const VideoCall = ({ channelName, token, userId, onCallEnd }) => {
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const durationIntervalRef = useRef(null);

  useEffect(() => {
    const joinCall = async () => {
      try {
        // Set event listeners
        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);

        // Join the channel
        await client.join(
          process.env.REACT_APP_AGORA_APP_ID,
          channelName,
          token,
          userId
        );

        console.log('[DevHire] Joined Agora channel');

        // Create local tracks
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack();

        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        // Play local video
        await videoTrack.play(localVideoRef.current);

        // Publish tracks
        await client.publish([audioTrack, videoTrack]);
        console.log('[DevHire] Published local tracks');

        // Start call timer
        durationIntervalRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);

        toast.success('Connected to video call');
      } catch (error) {
        console.error('[DevHire] Failed to join call:', error);
        toast.error('Failed to join video call');
        onCallEnd && onCallEnd();
      }
    };

    joinCall();

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [channelName, token, userId, onCallEnd]);

  const handleUserPublished = async (user, mediaType) => {
    try {
      await client.subscribe(user, mediaType);
      console.log('[DevHire] User published:', user.uid, mediaType);

      if (mediaType === 'video') {
        await user.videoTrack.play(remoteVideoRef.current);
        setRemoteUsers((prev) => {
          const exists = prev.some((u) => u.uid === user.uid);
          if (!exists) {
            return [...prev, user];
          }
          return prev;
        });
      } else if (mediaType === 'audio') {
        await user.audioTrack.play();
      }

      toast.success('Other participant joined');
    } catch (error) {
      console.error('[DevHire] Error handling user published:', error);
    }
  };

  const handleUserUnpublished = (user) => {
    console.log('[DevHire] User unpublished:', user.uid);
    setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
  };

  const toggleAudio = async () => {
    if (isAudioEnabled) {
      await localAudioTrack.setEnabled(false);
      setIsAudioEnabled(false);
    } else {
      await localAudioTrack.setEnabled(true);
      setIsAudioEnabled(true);
    }
  };

  const toggleVideo = async () => {
    if (isVideoEnabled) {
      await localVideoTrack.setEnabled(false);
      setIsVideoEnabled(false);
    } else {
      await localVideoTrack.setEnabled(true);
      setIsVideoEnabled(true);
    }
  };

  const handleEndCall = async () => {
    try {
      // Stop and close all tracks
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
      }
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
      }

      // Leave channel
      await client.leave();
      console.log('[DevHire] Left Agora channel');

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      toast.success('Call ended');
      onCallEnd && onCallEnd(Math.floor(callDuration / 60));
    } catch (error) {
      console.error('[DevHire] Error ending call:', error);
      toast.error('Error ending call');
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="w-full h-full bg-black flex flex-col relative">
      {/* Videos Container */}
      <div className="flex-1 flex gap-2 p-2">
        {/* Remote Video - Main */}
        <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative">
          <div ref={remoteVideoRef} className="w-full h-full" />
          {remoteUsers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <p>Waiting for other participant...</p>
            </div>
          )}
        </div>

        {/* Local Video - PIP */}
        <div className="w-32 h-32 bg-gray-900 rounded-lg overflow-hidden border-2 border-white">
          <div ref={localVideoRef} className="w-full h-full" />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border-t border-gray-700 p-4 flex items-center justify-center gap-4">
        {/* Call Duration */}
        <div className="text-white text-lg font-mono mr-auto">
          {formatDuration(callDuration)}
        </div>

        {/* Audio Toggle */}
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition ${
            isAudioEnabled
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition ${
            isVideoEnabled
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
        >
          {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
        </button>

        {/* Screen Share (Placeholder) */}
        <button
          disabled
          className="p-3 rounded-full bg-gray-700 text-gray-400 opacity-50 cursor-not-allowed"
          title="Screen share coming soon"
        >
          <ScreenShare size={24} />
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="ml-auto p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition"
          title="End Call"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
