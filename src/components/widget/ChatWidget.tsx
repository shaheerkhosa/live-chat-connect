import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2, Video, Phone, PhoneOff, Mic, MicOff, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useVideoChat } from '@/hooks/useVideoChat';
import { useWidgetChat } from '@/hooks/useWidgetChat';

interface ChatWidgetProps {
  propertyId?: string;
  primaryColor?: string;
  greeting?: string;
  agentName?: string;
  agentAvatar?: string;
  isPreview?: boolean;
}

export const ChatWidget = ({
  propertyId = 'demo',
  primaryColor = 'hsl(172, 66%, 50%)',
  greeting = "Hi there! 👋 How can I help you today?",
  agentName = "Support",
  agentAvatar,
  isPreview = false,
}: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [hasIncomingCall, setHasIncomingCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, isTyping } = useWidgetChat({ propertyId, greeting });

  const videoChat = useVideoChat({
    onCallAccepted: () => {
      console.log('Video call connected');
    },
    onCallEnded: () => {
      setShowVideoCall(false);
    },
  });

  // Simulate incoming call from agent (for demo)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && !showVideoCall && messages.length > 2) {
        // Simulate agent initiating a call after some chat activity
        // In real app, this would come from WebSocket
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [isOpen, showVideoCall, messages.length]);

  const handleStartVideoCall = async () => {
    setShowVideoCall(true);
    await videoChat.initiateCall();
  };

  const handleAcceptCall = async () => {
    setHasIncomingCall(false);
    setShowVideoCall(true);
    await videoChat.acceptCall();
  };

  const handleDeclineCall = () => {
    setHasIncomingCall(false);
    videoChat.declineCall();
  };

  const handleEndCall = () => {
    videoChat.endCall();
    setShowVideoCall(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Convert HSL string to ensure compatibility
  const widgetStyle = {
    '--widget-primary': primaryColor,
  } as React.CSSProperties;

  return (
    <div 
      className={cn("z-50 font-sans", isPreview ? "relative" : "fixed bottom-4 right-4")}
      style={widgetStyle}
    >
      {/* Incoming Call Notification */}
      {hasIncomingCall && (
        <div className="absolute bottom-20 right-0 w-80 bg-card/95 backdrop-blur-lg rounded-3xl shadow-xl border border-border/50 p-5 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="h-12 w-12 rounded-full flex items-center justify-center animate-breathe"
              style={{ background: 'var(--widget-primary)' }}
            >
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{agentName}</p>
              <p className="text-sm text-muted-foreground">Incoming video call</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDeclineCall}
              className="flex-1 h-11 rounded-full bg-destructive/90 hover:bg-destructive text-destructive-foreground flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            >
              <PhoneOff className="h-4 w-4" />
              Decline
            </button>
            <button
              onClick={handleAcceptCall}
              className="flex-1 h-11 rounded-full bg-healing hover:bg-healing/90 text-white flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            >
              <Phone className="h-4 w-4" />
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Video Call Panel */}
      {showVideoCall && (
        <div 
          className="animate-scale-in mb-4 bg-card/95 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-border/30"
          style={{ width: '380px', height: '520px' }}
        >
          {/* Video Call Header */}
          <div 
            className="px-5 py-4 flex items-center justify-between"
            style={{ background: 'var(--widget-primary)' }}
          >
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5 text-white" />
              <span className="font-semibold text-white">Video Call</span>
            </div>
            <button 
              onClick={handleEndCall}
              className="h-9 w-9 rounded-full bg-white/20 hover:bg-destructive flex items-center justify-center transition-all duration-300"
            >
              <PhoneOff className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Video Area */}
          <div className="flex-1 relative bg-gradient-to-br from-muted/30 to-accent/20">
            {/* Remote Video */}
            {videoChat.status === 'connected' ? (
              <video
                ref={videoChat.remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                {videoChat.status === 'requesting' && (
                  <>
                    <div 
                      className="h-20 w-20 rounded-full flex items-center justify-center animate-breathe"
                      style={{ background: 'var(--widget-primary)' }}
                    >
                      <Phone className="h-10 w-10 text-white" />
                    </div>
                    <p className="text-foreground font-medium">Calling {agentName}...</p>
                    <p className="text-muted-foreground text-sm">Please wait while we connect you</p>
                  </>
                )}
                {videoChat.status === 'connecting' && (
                  <>
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <div className="h-10 w-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-foreground font-medium">Connecting...</p>
                  </>
                )}
                {videoChat.status === 'error' && (
                  <>
                    <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                      <X className="h-10 w-10 text-destructive" />
                    </div>
                    <p className="text-foreground font-medium">Call couldn't connect</p>
                    <p className="text-muted-foreground text-sm">{videoChat.error}</p>
                  </>
                )}
              </div>
            )}

            {/* Local Video PiP */}
            {(videoChat.status === 'connected' || videoChat.status === 'connecting' || videoChat.status === 'requesting') && (
              <div className="absolute bottom-4 right-4 w-28 aspect-video rounded-2xl overflow-hidden shadow-lg border-2 border-white/50">
                <video
                  ref={videoChat.localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn("w-full h-full object-cover", videoChat.isVideoOff && "hidden")}
                />
                {videoChat.isVideoOff && (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <VideoOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video Controls */}
          {videoChat.status === 'connected' && (
            <div className="flex items-center justify-center gap-4 p-5 bg-card/80 backdrop-blur-sm border-t border-border/30">
              <button
                onClick={videoChat.toggleMute}
                className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300",
                  videoChat.isMuted ? "bg-destructive text-destructive-foreground" : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                )}
              >
                {videoChat.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                onClick={videoChat.toggleVideo}
                className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300",
                  videoChat.isVideoOff ? "bg-destructive text-destructive-foreground" : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                )}
              >
                {videoChat.isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
              <button
                onClick={handleEndCall}
                className="h-12 w-12 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center transition-all duration-300"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && !showVideoCall && (
        <div 
          className="animate-scale-in mb-4 bg-card/95 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-border/30"
          style={{ width: '380px', height: '520px' }}
        >
          {/* Header */}
          <div 
            className="px-5 py-4 flex items-center justify-between relative overflow-hidden"
            style={{ background: 'var(--widget-primary)' }}
          >
            {/* Gradient overlay */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%)' }}
            />
            <div className="flex items-center gap-3 relative z-10">
              <div className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{agentName}</h3>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs text-white/80">Here to help</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 relative z-10">
              <button 
                onClick={handleStartVideoCall}
                className="h-9 w-9 rounded-full hover:bg-white/20 flex items-center justify-center transition-all duration-300"
                title="Start video call"
              >
                <Video className="h-4 w-4 text-white" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 rounded-full hover:bg-white/20 flex items-center justify-center transition-all duration-300"
              >
                <Minimize2 className="h-4 w-4 text-white" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 rounded-full hover:bg-white/20 flex items-center justify-center transition-all duration-300"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="px-5 py-3 bg-gradient-to-r from-accent/30 to-muted/30 border-b border-border/30">
            <p className="text-xs text-muted-foreground text-center">
              You're in a safe space. Take your time. 💚
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/20 scrollbar-thin">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 animate-fade-in",
                  msg.sender_type === 'visitor' ? "flex-row-reverse" : "flex-row"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {msg.sender_type === 'agent' && (
                  <div 
                    className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ background: 'var(--widget-primary)' }}
                  >
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] px-4 py-3 shadow-sm",
                    msg.sender_type === 'visitor'
                      ? "rounded-3xl rounded-br-lg"
                      : "bg-card rounded-3xl rounded-bl-lg border border-border/30"
                  )}
                  style={msg.sender_type === 'visitor' ? { 
                    background: 'var(--widget-primary)', 
                    color: 'white' 
                  } : {}}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className={cn(
                    "text-xs mt-1.5",
                    msg.sender_type === 'visitor' ? "text-white/70" : "text-muted-foreground"
                  )}>
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 items-end animate-fade-in">
                <div 
                  className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: 'var(--widget-primary)' }}
                >
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <div className="bg-card rounded-3xl rounded-bl-lg px-4 py-3 shadow-sm border border-border/30">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border/30 bg-card/80 backdrop-blur-sm">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Share what's on your mind..."
                className="flex-1 px-5 py-3 rounded-full border border-border/50 bg-background/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 placeholder:text-muted-foreground/60"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="h-11 w-11 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-40 hover:scale-105 active:scale-95 shadow-md"
                style={{ background: 'var(--widget-primary)' }}
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-16 w-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 active:scale-95",
          isOpen && "rotate-90"
        )}
        style={{ background: 'var(--widget-primary)' }}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  );
};
