package http

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeadersMiddleware adds security headers to all responses
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip security headers for documentation pages - Scalar needs unrestricted access
		path := c.Request.URL.Path
		if path == "/docs" || path == "/" || path == "/openapi/spec.json" {
			c.Next()
			return
		}

		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking attacks
		c.Header("X-Frame-Options", "DENY")

		// Enable XSS protection in older browsers
		c.Header("X-XSS-Protection", "1; mode=block")

		// Enforce HTTPS (only if not in development)
		// This tells browsers to only access the site via HTTPS for the next year
		if c.GetHeader("X-Forwarded-Proto") == "https" || c.Request.TLS != nil {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		// Content Security Policy - prevents XSS and data injection attacks
		// Strict CSP for API endpoints
		csp := "default-src 'self'; " +
			"script-src 'self'; " +
			"style-src 'self'; " +
			"img-src 'self' data:; " +
			"font-src 'self' data:; " +
			"connect-src 'self' ws: wss:; " +
			"frame-ancestors 'none'; " +
			"base-uri 'self'; " +
			"form-action 'self'"
		c.Header("Content-Security-Policy", csp)

		// Referrer Policy - control how much referrer information is sent
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions Policy (formerly Feature Policy)
		// Disable unnecessary browser features
		permissions := "geolocation=(), " +
			"microphone=(), " +
			"camera=(), " +
			"payment=(), " +
			"usb=(), " +
			"magnetometer=(), " +
			"gyroscope=(), " +
			"accelerometer=()"
		c.Header("Permissions-Policy", permissions)

		// Remove server identification header
		c.Header("Server", "")

		// Prevent browsers from caching sensitive data
		// Only for sensitive endpoints - you may want to be selective
		if c.Request.Method != "GET" || c.Request.URL.Path == "/api/auth/me" {
			c.Header("Cache-Control", "no-store, no-cache, must-revalidate, private")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
		}

		c.Next()
	}
}

// CORSSecurityMiddleware enhances CORS with additional security checks
func CORSSecurityMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		// Check if origin is in allowed list
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin || allowedOrigin == "*" {
				allowed = true
				break
			}
		}

		if !allowed && origin != "" {
			// Log potential CORS violation
			// You may want to add proper logging here
			c.AbortWithStatusJSON(403, gin.H{
				"success": false,
				"message": "Origin not allowed",
				"error":   "cors_violation",
			})
			return
		}

		c.Next()
	}
}

// SecureResponseMiddleware adds additional security measures to responses
func SecureResponseMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Remove any accidentally leaked sensitive headers
		c.Writer.Header().Del("X-Powered-By")
		c.Writer.Header().Del("X-AspNet-Version")
		c.Writer.Header().Del("X-AspNetMvc-Version")
	}
}
