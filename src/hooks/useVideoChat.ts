import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type VideoCallStatus = 'idle' | 'requesting' | 'connecting' | 'connected' | 'ended' | 'declined' | 'error' | 'incoming';

type SignalType = 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accepted' | 'call-declined' | 'call-ended';

interface SignalData {
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  callerName?: string;
}

interface UseVideoChatOptions {
  conversationId?: string | null;
  participantType: 'agent' | 'visitor';
  participantId: string;
  participantName?: string;
  onCallRequest?: (callerName: string) => void;
  onCallAccepted?: () => void;
  onCallEnded?: () => void;
  onCallDeclined?: () => void;
}

export const useVideoChat = (options: UseVideoChatOptions) => {
  const { conversationId, participantType, participantId, participantName = 'Participant' } = options;
  
  const [status, setStatus] = useState<VideoCallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState<string>('');
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const cleanupMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    pendingIceCandidatesRef.current = [];
  }, []);

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      setError('Could not access camera or microphone');
      setStatus('error');
      throw err;
    }
  }, []);

  const sendSignal = useCallback(async (signalType: SignalType, signalData?: SignalData) => {
    if (!conversationId) {
      console.warn('No conversation ID for signaling');
      return;
    }

    const insertData = {
      conversation_id: conversationId,
      caller_type: participantType,
      caller_id: participantId,
      signal_type: signalType,
      signal_data: signalData || {},
    };

    const { error } = await supabase
      .from('video_call_signals')
      .insert(insertData as never);

    if (error) {
      console.error('Error sending signal:', error);
    }
  }, [conversationId, participantType, participantId]);

  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);

    pc.ontrack = (event) => {
      console.log('Remote track received');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', { candidate: event.candidate.toJSON() });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        setStatus('connected');
        options?.onCallAccepted?.();
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        endCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [options, sendSignal]);

  const handleSignal = useCallback(async (signal: { 
    signal_type: SignalType; 
    signal_data: SignalData; 
    caller_type: string; 
    caller_id: string;
  }) => {
    // Ignore our own signals
    if (signal.caller_type === participantType && signal.caller_id === participantId) {
      return;
    }

    console.log('Received signal:', signal.signal_type, signal);

    switch (signal.signal_type) {
      case 'call-request':
        // Someone is calling us
        setIncomingCallerName(signal.signal_data.callerName || 'Unknown');
        setStatus('incoming');
        options?.onCallRequest?.(signal.signal_data.callerName || 'Unknown');
        break;

      case 'call-accepted':
        // Other party accepted, now exchange WebRTC offer
        if (status === 'requesting' && peerConnectionRef.current) {
          try {
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            await sendSignal('offer', { sdp: offer.sdp });
            setStatus('connecting');
          } catch (err) {
            console.error('Error creating offer:', err);
            setError('Failed to create call offer');
            setStatus('error');
          }
        }
        break;

      case 'offer':
        // Received an offer, create answer
        if (!peerConnectionRef.current) {
          const stream = await startLocalStream();
          const pc = createPeerConnection();
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }
        
        if (peerConnectionRef.current && signal.signal_data.sdp) {
          try {
            await peerConnectionRef.current.setRemoteDescription({
              type: 'offer',
              sdp: signal.signal_data.sdp,
            });

            // Add any pending ICE candidates
            for (const candidate of pendingIceCandidatesRef.current) {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingIceCandidatesRef.current = [];

            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            await sendSignal('answer', { sdp: answer.sdp });
            setStatus('connecting');
          } catch (err) {
            console.error('Error handling offer:', err);
            setError('Failed to connect call');
            setStatus('error');
          }
        }
        break;

      case 'answer':
        // Received an answer to our offer
        if (peerConnectionRef.current && signal.signal_data.sdp) {
          try {
            await peerConnectionRef.current.setRemoteDescription({
              type: 'answer',
              sdp: signal.signal_data.sdp,
            });

            // Add any pending ICE candidates
            for (const candidate of pendingIceCandidatesRef.current) {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingIceCandidatesRef.current = [];
          } catch (err) {
            console.error('Error handling answer:', err);
          }
        }
        break;

      case 'ice-candidate':
        if (signal.signal_data.candidate) {
          if (peerConnectionRef.current?.remoteDescription) {
            try {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(signal.signal_data.candidate)
              );
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          } else {
            // Queue candidate if remote description not set yet
            pendingIceCandidatesRef.current.push(signal.signal_data.candidate);
          }
        }
        break;

      case 'call-declined':
        setStatus('declined');
        options?.onCallDeclined?.();
        cleanupMedia();
        setTimeout(() => setStatus('idle'), 2000);
        break;

      case 'call-ended':
        setStatus('ended');
        options?.onCallEnded?.();
        cleanupMedia();
        setTimeout(() => setStatus('idle'), 1000);
        break;
    }
  }, [participantType, participantId, status, startLocalStream, createPeerConnection, sendSignal, cleanupMedia, options]);

  // Subscribe to signaling channel
  useEffect(() => {
    if (!conversationId) return;

    const channelName = `video-signals-${conversationId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_call_signals',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const signal = payload.new as {
            signal_type: SignalType;
            signal_data: SignalData;
            caller_type: string;
            caller_id: string;
          };
          handleSignal(signal);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, handleSignal]);

  const initiateCall = useCallback(async () => {
    if (!conversationId) {
      setError('No active conversation for video call');
      return;
    }

    try {
      setStatus('requesting');
      setError(null);
      
      const stream = await startLocalStream();
      const pc = createPeerConnection();

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Send call request signal
      await sendSignal('call-request', { callerName: participantName });
      
    } catch (err) {
      console.error('Failed to initiate call:', err);
      setError('Failed to start video call');
      setStatus('error');
    }
  }, [conversationId, startLocalStream, createPeerConnection, sendSignal, participantName]);

  const acceptCall = useCallback(async () => {
    try {
      setStatus('connecting');
      setError(null);
      
      const stream = await startLocalStream();
      const pc = createPeerConnection();

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Send call accepted signal - this will trigger the caller to send offer
      await sendSignal('call-accepted');
    } catch (err) {
      console.error('Failed to accept call:', err);
      setError('Failed to accept video call');
      setStatus('error');
    }
  }, [startLocalStream, createPeerConnection, sendSignal]);

  const declineCall = useCallback(async () => {
    await sendSignal('call-declined');
    setStatus('declined');
    options?.onCallDeclined?.();
    cleanupMedia();
    setTimeout(() => setStatus('idle'), 1000);
  }, [sendSignal, cleanupMedia, options]);

  const endCall = useCallback(async () => {
    await sendSignal('call-ended');
    setStatus('ended');
    options?.onCallEnded?.();
    cleanupMedia();
    setTimeout(() => setStatus('idle'), 1000);
  }, [sendSignal, cleanupMedia, options]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, [cleanupMedia]);

  return {
    status,
    isMuted,
    isVideoOff,
    error,
    localVideoRef,
    remoteVideoRef,
    incomingCallerName,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    setStatus,
  };
};
