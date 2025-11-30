// Simple token counting utility

/**
 * Rough token estimation for OpenAI-style models
 * This is an approximation - actual token counts may vary
 * 1 token ≈ 4 characters for English text
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  
  // Simple approximation: divide character count by 4
  // This is a rough estimate and may not be perfectly accurate
  return Math.ceil(text.length / 4);
}

/**
 * More detailed token estimation that considers:
 * - Word boundaries
 * - Punctuation
 * - Common patterns
 */
export function estimateTokenCountDetailed(text: string): number {
  if (!text) return 0;
  
  // Split by whitespace and count words
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  
  let tokenCount = 0;
  
  for (const word of words) {
    // Most words are 1 token
    // Longer words (>6 chars) might be split into multiple tokens
    if (word.length <= 6) {
      tokenCount += 1;
    } else {
      // Rough approximation: longer words might be 1.5-2 tokens
      tokenCount += Math.ceil(word.length / 4);
    }
    
    // Add tokens for punctuation
    const punctuationCount = (word.match(/[.,!?;:]/g) || []).length;
    tokenCount += punctuationCount * 0.5; // Punctuation is often partial tokens
  }
  
  return Math.ceil(tokenCount);
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokenCount: number): string {
  if (tokenCount < 1000) {
    return `${tokenCount} tokens`;
  } else if (tokenCount < 1000000) {
    return `${(tokenCount / 1000).toFixed(1)}K tokens`;
  } else {
    return `${(tokenCount / 1000000).toFixed(1)}M tokens`;
  }
}