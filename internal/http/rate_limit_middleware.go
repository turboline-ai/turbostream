package http

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimiter implements a per-IP rate limiter using token bucket algorithm
type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.RWMutex
	rate     rate.Limit // requests per second
	burst    int        // burst size
}

// NewRateLimiter creates a new rate limiter
// rate: requests per second (e.g., 5 = 5 requests/second)
// burst: maximum burst size (e.g., 10 = allow burst of 10 requests)
func NewRateLimiter(rps float64, burst int) *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rate:     rate.Limit(rps),
		burst:    burst,
	}
}

// getLimiter returns the rate limiter for the given IP address
func (rl *RateLimiter) getLimiter(ip string) *rate.Limiter {
	rl.mu.RLock()
	limiter, exists := rl.limiters[ip]
	rl.mu.RUnlock()

	if !exists {
		rl.mu.Lock()
		// Double-check after acquiring write lock
		limiter, exists = rl.limiters[ip]
		if !exists {
			limiter = rate.NewLimiter(rl.rate, rl.burst)
			rl.limiters[ip] = limiter
		}
		rl.mu.Unlock()
	}

	return limiter
}

// Cleanup removes old limiters to prevent memory leaks
// Should be called periodically (e.g., every hour)
func (rl *RateLimiter) Cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Clear all limiters - they'll be recreated on next request
	rl.limiters = make(map[string]*rate.Limiter)
}

// RateLimitMiddleware creates a Gin middleware for rate limiting
func RateLimitMiddleware(rps float64, burst int) gin.HandlerFunc {
	limiter := NewRateLimiter(rps, burst)

	// Start cleanup goroutine
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			limiter.Cleanup()
		}
	}()

	return func(c *gin.Context) {
		// Get client IP
		ip := c.ClientIP()

		// Get limiter for this IP
		l := limiter.getLimiter(ip)

		// Check if request is allowed
		if !l.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "Rate limit exceeded. Please try again later.",
				"error":   "too_many_requests",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// StrictRateLimitMiddleware creates a stricter rate limiter for sensitive endpoints
// Use this for login, registration, password reset, etc.
func StrictRateLimitMiddleware() gin.HandlerFunc {
	// 3 requests per second, burst of 5
	return RateLimitMiddleware(3, 5)
}

// ModerateRateLimitMiddleware creates a moderate rate limiter for API endpoints
func ModerateRateLimitMiddleware() gin.HandlerFunc {
	// 10 requests per second, burst of 20
	return RateLimitMiddleware(10, 20)
}

// LenientRateLimitMiddleware creates a lenient rate limiter for public endpoints
func LenientRateLimitMiddleware() gin.HandlerFunc {
	// 20 requests per second, burst of 50
	return RateLimitMiddleware(20, 50)
}
