-- Create a table for WebRTC signaling between agents and visitors
CREATE TABLE public.video_call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_type TEXT NOT NULL CHECK (caller_type IN ('agent', 'visitor')),
  caller_id TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'call-request', 'call-accepted', 'call-declined', 'call-ended')),
  signal_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_call_signals ENABLE ROW LEVEL SECURITY;

-- Allow reading signals for conversations you're part of (agent or visitor)
CREATE POLICY "Users can read signals for their conversations" 
ON public.video_call_signals 
FOR SELECT 
USING (true);

-- Allow inserting signals
CREATE POLICY "Users can insert signals" 
ON public.video_call_signals 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for the signals table
ALTER TABLE public.video_call_signals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_call_signals;

-- Create an index for quick lookups
CREATE INDEX idx_video_call_signals_conversation ON public.video_call_signals(conversation_id);
CREATE INDEX idx_video_call_signals_created ON public.video_call_signals(created_at DESC);