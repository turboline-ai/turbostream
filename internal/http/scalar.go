package http

import (
	"github.com/gin-gonic/gin"
)

// ServeScalar serves the Scalar API documentation UI
func ServeScalar(c *gin.Context) {
	html := `<!doctype html>
<html>
<head>
    <title>TurboStream API Documentation</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
    <script id="api-reference"></script>
    <script>
        var configuration = {
            spec: {
                url: '/openapi/spec.json',
            },
        }
        
        var apiReference = document.getElementById('api-reference')
        apiReference.dataset.configuration = JSON.stringify(configuration)
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`

	// Set permissive CSP for documentation page to allow Scalar to function properly
	// Note: connect-src allows all http/https to enable API testing and Scalar's external services
	csp := "default-src 'self'; " +
		"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
		"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
		"img-src 'self' data: https:; " +
		"font-src 'self' data: https://cdn.jsdelivr.net; " +
		"connect-src http: https: ws: wss:; " +
		"frame-ancestors 'none'; " +
		"base-uri 'self'"
	c.Header("Content-Security-Policy", csp)
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(200, html)
}
