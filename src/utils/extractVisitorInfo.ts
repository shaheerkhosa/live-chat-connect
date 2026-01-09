// Utility for extracting visitor information from conversations with retry logic

const EXTRACT_INFO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-visitor-info`;

interface ConversationMessage {
  role: string;
  content: string;
}

interface ExtractResult {
  success: boolean;
  error?: string;
}

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Extract visitor information from conversation history with retry logic
 * @param visitorId - The visitor's unique ID
 * @param conversationHistory - Array of messages with role and content
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise with success status and optional error message
 */
export const extractVisitorInfo = async (
  visitorId: string,
  conversationHistory: ConversationMessage[],
  maxRetries: number = 3
): Promise<ExtractResult> => {
  if (!visitorId || conversationHistory.length < 2) {
    return { success: false, error: 'Insufficient data for extraction' };
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[VisitorInfo] Extraction attempt ${attempt}/${maxRetries} for visitor ${visitorId}`);
      
      const response = await fetch(EXTRACT_INFO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          visitorId,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`[VisitorInfo] Extraction successful for visitor ${visitorId}:`, result);
      return { success: true };
    } catch (error) {
      lastError = error as Error;
      console.warn(`[VisitorInfo] Attempt ${attempt} failed:`, error);
      
      // Exponential backoff: 500ms, 1000ms, 2000ms
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt - 1) * 500;
        console.log(`[VisitorInfo] Retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
      }
    }
  }

  console.error(`[VisitorInfo] All ${maxRetries} attempts failed for visitor ${visitorId}:`, lastError);
  return { success: false, error: lastError?.message || 'Unknown error' };
};

/**
 * Extract visitor info from messages stored in the database
 * Used by dashboard to refresh visitor data
 */
export const extractVisitorInfoFromMessages = async (
  visitorId: string,
  messages: Array<{ sender_type: string; content: string }>
): Promise<ExtractResult> => {
  const conversationHistory = messages.map(msg => ({
    role: msg.sender_type === 'visitor' ? 'user' : 'assistant',
    content: msg.content,
  }));

  return extractVisitorInfo(visitorId, conversationHistory);
};
