import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2, Video, Phone, PhoneOff, Mic, MicOff, VideoOff, User, Mail, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useVideoChat } from '@/hooks/useVideoChat';
import { useWidgetChat } from '@/hooks/useWidgetChat';
import { supabase } from '@/integrations/supabase/client';

interface ChatWidgetProps {
  propertyId?: string;
  primaryColor?: string;
  textColor?: string;
  borderColor?: string;
  widgetSize?: 'small' | 'medium' | 'large';
  borderRadius?: number;
  greeting?: string;
  agentName?: string;
  agentAvatar?: string;
  isPreview?: boolean;
  autoOpen?: boolean;
}

export const ChatWidget = ({
  propertyId = 'demo',
  primaryColor = 'hsl(172, 66%, 50%)',
  textColor = 'hsl(0, 0%, 100%)',
  borderColor = 'hsl(0, 0%, 0%, 0.1)',
  widgetSize = 'medium',
  borderRadius = 24,
  greeting = "Hi there! 👋 How can I help you today?",
  agentName = "Support",
  agentAvatar,
  isPreview = false,
  autoOpen = false,
}: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [inputValue, setInputValue] = useState('');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [hasIncomingCall, setHasIncomingCall] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    messages, 
    sendMessage, 
    isTyping, 
    settings, 
    requiresLeadCapture, 
    submitLeadInfo,
    visitorInfo,
    currentAiAgent,
    aiAgents,
  } = useWidgetChat({ propertyId, greeting, isPreview });

  // Use AI agent info if available, otherwise use props
  const displayName = currentAiAgent?.name || agentName;
  const displayAvatar = currentAiAgent?.avatar_url || agentAvatar;

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);

    try {
      for (const file of Array.from(files)) {
        // Check file type
        if (!file.type.startsWith('image/')) {
          continue;
        }

        // Create a unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `widget-uploads/${timestamp}-${randomStr}.${ext}`;

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('agent-avatars')
          .upload(fileName, file, { upsert: true });

        if (error) {
          console.error('Failed to upload image:', error);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('agent-avatars')
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          // Send message with image
          sendMessage(`[Image uploaded: ${file.name}]\n${urlData.publicUrl}`);
        }
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    }

    setUploadingImage(false);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = settings.require_name_before_chat ? leadName.trim() : undefined;
    const email = settings.require_email_before_chat ? leadEmail.trim() : undefined;
    
    // Basic validation
    if (settings.require_name_before_chat && !name) return;
    if (settings.require_email_before_chat && !email) return;
    if (email && !email.includes('@')) return;

    submitLeadInfo(name, email);
  };

  // Dynamic border radius styles
  const panelRadius = `${borderRadius}px`;
  const buttonRadius = `${Math.min(borderRadius, 32)}px`;
  const messageRadiusLarge = `${Math.min(borderRadius, 24)}px`;
  const messageRadiusSmall = `${Math.max(borderRadius / 3, 4)}px`;

  // Widget size dimensions
  const sizeConfig = {
    small: { width: 320, height: 440, button: 48 },
    medium: { width: 380, height: 520, button: 56 },
    large: { width: 440, height: 600, button: 64 },
  };
  const currentSize = sizeConfig[widgetSize];

  // Tell the parent page how big the iframe should be.
  // This removes the “big box” around the widget when it’s closed.
  useEffect(() => {
    if (isPreview) return;

    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch {
      inIframe = true;
    }

    if (!inIframe) return;

    const padding = 32; // matches the widget's internal bottom/right spacing
    const width = (isOpen ? currentSize.width : currentSize.button) + padding;
    const height = (isOpen ? currentSize.height : currentSize.button) + padding;

    window.parent.postMessage(
      { type: 'scaledbot_widget_resize', width, height },
      '*'
    );
  }, [isOpen, widgetSize, isPreview, currentSize.width, currentSize.height, currentSize.button]);

  // Convert HSL string to ensure compatibility
  const widgetStyle = {
    '--widget-primary': primaryColor,
    '--widget-text': textColor,
    '--widget-border': borderColor,
    '--widget-radius': panelRadius,
    '--widget-button-radius': buttonRadius,
    '--widget-message-radius-lg': messageRadiusLarge,
    '--widget-message-radius-sm': messageRadiusSmall,
  } as React.CSSProperties;

  // Show lead capture form
  const showLeadForm = requiresLeadCapture && !visitorInfo.name && !visitorInfo.email;

  return (
    <div 
      className={cn("z-50 font-sans", isPreview ? "relative" : "fixed bottom-4 right-4")}
      style={widgetStyle}
    >
      {/* Incoming Call Notification */}
      {hasIncomingCall && (
        <div 
          className="absolute bottom-20 right-0 w-80 bg-card/95 backdrop-blur-lg shadow-xl border border-border/50 p-5 animate-fade-in"
          style={{ borderRadius: panelRadius }}
        >
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
          className="animate-scale-in mb-4 bg-card/95 backdrop-blur-lg shadow-2xl overflow-hidden flex flex-col"
          style={{ width: `${currentSize.width}px`, height: `${currentSize.height}px`, borderRadius: panelRadius, border: `1px solid ${borderColor}` }}
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
              <div 
                className="absolute bottom-4 right-4 w-28 aspect-video overflow-hidden shadow-lg border-2 border-white/50"
                style={{ borderRadius: `${Math.min(borderRadius, 16)}px` }}
              >
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
          className="animate-scale-in mb-4 bg-card/95 backdrop-blur-lg shadow-2xl overflow-hidden flex flex-col"
          style={{ width: `${currentSize.width}px`, height: `${currentSize.height}px`, borderRadius: panelRadius, border: `1px solid ${borderColor}` }}
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
              <div 
                className="h-11 w-11 backdrop-blur-sm flex items-center justify-center overflow-hidden"
                style={{ borderRadius: buttonRadius, background: `color-mix(in srgb, ${textColor} 20%, transparent)` }}
              >
                {displayAvatar ? (
                  <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <MessageCircle className="h-5 w-5" style={{ color: textColor }} />
                )}
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: textColor }}>{displayName}</h3>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: textColor }} />
                  <span className="text-xs" style={{ color: textColor, opacity: 0.8 }}>
                    {aiAgents.length > 1 ? `AI Agent (${aiAgents.length} available)` : 'Here to help'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 relative z-10">
              <button 
                onClick={handleStartVideoCall}
                className="h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, ${textColor} 20%, transparent)`}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title="Start video call"
              >
                <Video className="h-4 w-4" style={{ color: textColor }} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, ${textColor} 20%, transparent)`}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Minimize2 className="h-4 w-4" style={{ color: textColor }} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, ${textColor} 20%, transparent)`}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X className="h-4 w-4" style={{ color: textColor }} />
              </button>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="px-5 py-3 bg-gradient-to-r from-accent/30 to-muted/30 border-b border-border/30">
            <p className="text-xs text-muted-foreground text-center">
              You're in a safe space. Take your time. 💚
            </p>
          </div>

          {/* Lead Capture Form */}
          {showLeadForm ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/20">
              <div 
                className="h-16 w-16 flex items-center justify-center mb-4"
                style={{ background: 'var(--widget-primary)', borderRadius: buttonRadius }}
              >
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Before we chat</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Please share a few details so we can better assist you.
              </p>
              <form onSubmit={handleLeadSubmit} className="w-full space-y-4">
                {settings.require_name_before_chat && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full pl-11 pr-4 py-3 border border-border/50 bg-background/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 placeholder:text-muted-foreground/60"
                      style={{ borderRadius: `${Math.min(borderRadius, 16)}px` }}
                    />
                  </div>
                )}
                {settings.require_email_before_chat && (
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="Your email"
                      required
                      className="w-full pl-11 pr-4 py-3 border border-border/50 bg-background/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 placeholder:text-muted-foreground/60"
                      style={{ borderRadius: `${Math.min(borderRadius, 16)}px` }}
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-3 text-white font-medium text-sm transition-all duration-300 hover:opacity-90"
                  style={{ background: 'var(--widget-primary)', borderRadius: `${Math.min(borderRadius, 16)}px` }}
                >
                  Start Chat
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/20 scrollbar-thin">
                {messages.map((msg, index) => {
                  // For agent messages, use per-message agent info or fall back to current
                  const msgAgentName = msg.agent_name || displayName;
                  const msgAgentAvatar = msg.agent_avatar || displayAvatar;
                  
                  return (
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
                          className="h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                          style={{ background: msgAgentAvatar ? 'transparent' : 'var(--widget-primary)', borderRadius: buttonRadius }}
                        >
                          {msgAgentAvatar ? (
                            <img src={msgAgentAvatar} alt={msgAgentName} className="h-full w-full object-cover" />
                          ) : (
                            <MessageCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                      )}
                      <div className={cn("max-w-[75%]", msg.sender_type === 'agent' && "flex flex-col")}>
                        {msg.sender_type === 'agent' && msgAgentName && (
                          <span className="text-xs text-muted-foreground mb-1 ml-1">{msgAgentName}</span>
                        )}
                        <div
                          className={cn(
                            "px-4 py-3 shadow-sm",
                            msg.sender_type === 'visitor'
                              ? ""
                              : "bg-card border border-border/30"
                          )}
                          style={msg.sender_type === 'visitor' 
                            ? { 
                                background: 'var(--widget-primary)', 
                                color: 'white',
                                borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall} ${messageRadiusLarge}`
                              } 
                            : {
                                borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall}`
                              }
                          }
                        >
                          {/* Check if message contains an image URL */}
                          {msg.content.includes('[Image uploaded:') && msg.content.includes('https://') ? (
                            <div className="space-y-2">
                              <p className="text-sm text-opacity-80">📷 Image uploaded</p>
                              <img 
                                src={msg.content.split('\n').pop() || ''} 
                                alt="Uploaded" 
                                className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.content.split('\n').pop(), '_blank')}
                              />
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          )}
                          <p className={cn(
                            "text-xs mt-1.5",
                            msg.sender_type === 'visitor' ? "text-white/70" : "text-muted-foreground"
                          )}>
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex gap-3 items-end animate-fade-in">
                    <div 
                      className="h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                      style={{ background: displayAvatar ? 'transparent' : 'var(--widget-primary)', borderRadius: buttonRadius }}
                    >
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      {displayName && (
                        <span className="text-xs text-muted-foreground mb-1 ml-1">{displayName}</span>
                      )}
                      <div 
                        className="bg-card px-4 py-3 shadow-sm border border-border/30"
                        style={{ borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall}` }}
                      >
                        <div className="flex gap-1.5">
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border/30 bg-card/80 backdrop-blur-sm">
                <div className="flex gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {/* Image upload button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="h-12 w-12 flex-shrink-0 flex items-center justify-center border border-border/50 bg-background/80 text-muted-foreground hover:text-foreground hover:bg-background transition-all duration-300 disabled:opacity-50"
                    style={{ borderRadius: buttonRadius }}
                    title="Upload image"
                  >
                    {uploadingImage ? (
                      <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Share what's on your mind..."
                    className="flex-1 px-5 py-3 border border-border/50 bg-background/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 placeholder:text-muted-foreground/60"
                    style={{ borderRadius: `${Math.min(borderRadius, 24)}px` }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="h-12 w-12 flex-shrink-0 flex items-center justify-center text-white disabled:opacity-50 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
                    style={{ background: 'var(--widget-primary)', borderRadius: buttonRadius }}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
          style={{ 
            background: 'var(--widget-primary)', 
            borderRadius: buttonRadius,
            width: `${currentSize.button}px`,
            height: `${currentSize.button}px`,
            color: textColor,
          }}
        >
          <MessageCircle className={cn(
            widgetSize === 'small' ? 'h-5 w-5' : widgetSize === 'medium' ? 'h-7 w-7' : 'h-8 w-8'
          )} />
        </button>
      )}
    </div>
  );
};
