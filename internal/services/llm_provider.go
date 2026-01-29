package services

import "context"

// LLMProvider defines the interface all LLM providers must implement.
// This enables a "Bring Your Own Model" (BYOM) experience where developers
// can configure any supported provider via environment variables.
type LLMProvider interface {
	// Chat sends a non-streaming request and returns response + token count
	Chat(ctx context.Context, messages []ChatMessage) (string, int, error)

	// StreamChat sends a streaming request, tokens arrive via channel.
	// The channel is closed when streaming completes.
	StreamChat(ctx context.Context, messages []ChatMessage, tokens chan<- string) (int, error)

	// Enabled returns true if the provider is properly configured
	Enabled() bool

	// Name returns the provider identifier (e.g., "openai", "anthropic")
	Name() string
}

// Ensure AzureOpenAI implements LLMProvider
var _ LLMProvider = (*AzureOpenAI)(nil)

// Name returns the provider name for AzureOpenAI
func (s *AzureOpenAI) Name() string {
	return "azure-openai"
}

// StreamChat implements streaming for AzureOpenAI (currently falls back to non-streaming)
func (s *AzureOpenAI) StreamChat(ctx context.Context, messages []ChatMessage, tokens chan<- string) (int, error) {
	defer close(tokens)

	answer, tokensUsed, err := s.Chat(ctx, messages)
	if err != nil {
		return 0, err
	}

	// Send complete response as one chunk (streaming not yet implemented for Azure)
	tokens <- answer
	return tokensUsed, nil
}
