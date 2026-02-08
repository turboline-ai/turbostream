package services

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/turboline-ai/turbostream/internal/models"
)

// topicLoop represents a running LLM query loop for a specific topic
type topicLoop struct {
	topic   string
	stop    chan struct{}
	running bool
}

// TopicLLMScheduler manages continuous per-topic LLM query loops
type TopicLLMScheduler struct {
	feedID        string
	feedName      string
	feed          *models.WebSocketFeed
	topics        map[string]*topicLoop
	llmService    *LLMService
	queryInterval time.Duration
	mu            sync.RWMutex
	broadcastFunc func(feedID, topic, analysis, provider string)
}

// NewTopicLLMScheduler creates a scheduler for a feed
func NewTopicLLMScheduler(
	feedID string,
	feedName string,
	feed *models.WebSocketFeed,
	llmService *LLMService,
	broadcastFunc func(feedID, topic, analysis, provider string),
) *TopicLLMScheduler {
	return &TopicLLMScheduler{
		feedID:        feedID,
		feedName:      feedName,
		feed:          feed,
		topics:        make(map[string]*topicLoop),
		llmService:    llmService,
		queryInterval: 10 * time.Second, // Default: query every 10 seconds
		broadcastFunc: broadcastFunc,
	}
}

// StartTopic starts LLM query loop for a specific topic
func (s *TopicLLMScheduler) StartTopic(topic string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if already running
	if loop, exists := s.topics[topic]; exists && loop.running {
		log.Printf("✓ Topic loop already running for %s:%s", s.feedID, topic)
		return nil
	}

	// Create new loop
	stop := make(chan struct{})
	loop := &topicLoop{
		topic:   topic,
		stop:    stop,
		running: true,
	}
	s.topics[topic] = loop

	// Start goroutine
	go s.runTopicLoop(topic, stop)

	log.Printf("✓ Started LLM query loop for %s:%s (interval: %v)", s.feedID, topic, s.queryInterval)
	return nil
}

// StopTopic stops LLM query loop for a specific topic
func (s *TopicLLMScheduler) StopTopic(topic string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if loop, exists := s.topics[topic]; exists && loop.running {
		close(loop.stop)
		loop.running = false
		delete(s.topics, topic)
		log.Printf("✓ Stopped LLM query loop for %s:%s", s.feedID, topic)
	}
}

// StopAll stops all topic loops
func (s *TopicLLMScheduler) StopAll() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for topic, loop := range s.topics {
		if loop.running {
			close(loop.stop)
			loop.running = false
			log.Printf("✓ Stopped LLM query loop for %s:%s", s.feedID, topic)
		}
	}
	s.topics = make(map[string]*topicLoop)
}

// GetActiveTopics returns list of active topics
func (s *TopicLLMScheduler) GetActiveTopics() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	topics := make([]string, 0, len(s.topics))
	for topic, loop := range s.topics {
		if loop.running {
			topics = append(topics, topic)
		}
	}
	return topics
}

// runTopicLoop runs the continuous query loop for a topic
func (s *TopicLLMScheduler) runTopicLoop(topic string, stop chan struct{}) {
	ticker := time.NewTicker(s.queryInterval)
	defer ticker.Stop()

	// Initial query after 2 seconds (allow some data to accumulate)
	time.Sleep(2 * time.Second)
	s.queryAndBroadcast(topic)

	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			s.queryAndBroadcast(topic)
		}
	}
}

// queryAndBroadcast queries LLM for a topic and broadcasts the result
func (s *TopicLLMScheduler) queryAndBroadcast(topic string) {
	contextKey := s.feedID + ":" + topic

	// Check if context has data
	ctx := s.llmService.GetFeedContext(contextKey)
	if ctx == nil || len(ctx.Entries) == 0 {
		log.Printf("⏸️  Skipping LLM query for %s (no data yet)", contextKey)
		return
	}

	log.Printf("🤖 Querying LLM for %s (%d entries)", contextKey, len(ctx.Entries))

	// Get topic-specific prompts, fallback to defaults
	systemPrompt := ""
	question := "Provide a brief analysis of the recent activity and any notable patterns."

	if s.feed != nil && s.feed.TopicPrompts != nil {
		if topicCfg, ok := s.feed.TopicPrompts[topic]; ok {
			if topicCfg.SystemPrompt != "" {
				systemPrompt = topicCfg.SystemPrompt
			}
			if topicCfg.Question != "" {
				question = topicCfg.Question
			}
			log.Printf("📝 Using topic-specific prompts for %s", topic)
		}
	}

	// Fallback to feed-level defaults if no topic-specific config
	if systemPrompt == "" && s.feed != nil {
		// Priority: DefaultAIPrompt (updated via /ai-prompt) > SystemPrompt (feed creation)
		if s.feed.DefaultAIPrompt != "" {
			systemPrompt = s.feed.DefaultAIPrompt
			log.Printf("📝 Using defaultAIPrompt for %s", topic)
		} else if s.feed.SystemPrompt != "" {
			systemPrompt = s.feed.SystemPrompt
			log.Printf("📝 Using systemPrompt for %s", topic)
		}
	}

	// Query LLM
	queryCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := s.llmService.Query(queryCtx, QueryRequest{
		FeedID:       contextKey,
		Question:     question,
		SystemPrompt: systemPrompt,
	})

	if err != nil {
		log.Printf("❌ LLM query failed for %s: %v", contextKey, err)
		return
	}

	log.Printf("✅ LLM analysis complete for %s (provider: %s, duration: %dms)",
		contextKey, resp.Provider, resp.Duration)

	// Broadcast intelligence
	s.broadcastFunc(s.feedID, topic, resp.Answer, resp.Provider)
}
