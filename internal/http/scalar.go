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
    <script id="api-reference" data-url="/swagger/doc.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(200, html)
}
