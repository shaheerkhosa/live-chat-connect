import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { format } from 'date-fns';

interface ChatWidgetProps {
  propertyId?: string;
  primaryColor?: string;
  greeting?: string;
  agentName?: string;
  agentAvatar?: string;
}

const mockMessages: Message[] = [
  {
    id: '1',
    conversationId: 'demo',
    senderId: 'agent-1',
    senderType: 'agent',
    content: "Hi there! 👋 How can I help you today?",
    timestamp: new Date(Date.now() - 60000),
    read: true,
  },
];

export const ChatWidget = ({
  propertyId = 'demo',
  primaryColor = 'hsl(172, 66%, 50%)',
  greeting = "Hi there! 👋 How can I help you today?",
  agentName = "Support",
  agentAvatar,
}: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: 'demo',
      senderId: 'visitor',
      senderType: 'visitor',
      content: inputValue.trim(),
      timestamp: new Date(),
      read: false,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // Simulate agent typing
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const agentReply: Message = {
        id: `msg-${Date.now() + 1}`,
        conversationId: 'demo',
        senderId: 'agent-1',
        senderType: 'agent',
        content: "Thanks for your message! An agent will respond shortly.",
        timestamp: new Date(),
        read: true,
      };
      setMessages(prev => [...prev, agentReply]);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Chat Panel */}
      {isOpen && (
        <div 
          className="widget-enter mb-4 bg-background rounded-2xl widget-shadow overflow-hidden flex flex-col"
          style={{ width: '380px', height: '520px' }}
        >
          {/* Header */}
          <div 
            className="px-5 py-4 flex items-center justify-between"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{agentName}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-400 pulse-online" />
                  <span className="text-xs text-white/80">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <Minimize2 className="h-4 w-4 text-white" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2 message-enter",
                  msg.senderType === 'visitor' ? "flex-row-reverse" : "flex-row"
                )}
              >
                {msg.senderType === 'agent' && (
                  <div 
                    className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    msg.senderType === 'visitor'
                      ? "rounded-br-md"
                      : "bg-card rounded-bl-md shadow-sm"
                  )}
                  style={msg.senderType === 'visitor' ? { backgroundColor: primaryColor, color: 'white' } : {}}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={cn(
                    "text-xs mt-1",
                    msg.senderType === 'visitor' ? "text-white/70" : "text-muted-foreground"
                  )}>
                    {format(new Date(msg.timestamp), 'h:mm a')}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-end">
                <div 
                  className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <div className="bg-card rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 rounded-full border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="h-10 w-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-3">
              Powered by LiveChat
            </p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center widget-shadow transition-all duration-300 hover:scale-105",
          isOpen && "rotate-90"
        )}
        style={{ backgroundColor: primaryColor }}
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
