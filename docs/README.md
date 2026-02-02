# Swagger Documentation

This directory contains the automatically generated Swagger/OpenAPI documentation for the TurboStream API.

## Accessing Swagger UI

When your server is running, visit:
```
http://localhost:7210/swagger/index.html
```

## Files

- `docs.go` - Generated Go code that registers the Swagger spec
- `swagger.json` - OpenAPI 2.0 specification in JSON format
- `swagger.yaml` - OpenAPI 2.0 specification in YAML format (optional)

## Extending the Documentation

### Adding Annotations to Handlers

To document your API endpoints, add Swagger annotations to your handler functions:

```go
// GetFeed retrieves a feed by ID
// @Summary      Get feed by ID
// @Description  Get detailed information about a specific feed
// @Tags         Marketplace
// @Accept       json
// @Produce      json
// @Param        id   path      string  true  "Feed ID"
// @Success      200  {object}  FeedResponse
// @Failure      404  {object}  ErrorResponse
// @Router       /api/marketplace/feeds/{id} [get]
func (h *MarketplaceHandler) GetFeed(c *gin.Context) {
    // handler code...
}
```

### Common Annotations

- `@Summary` - Short description (appears in list)
- `@Description` - Detailed description
- `@Tags` - Group endpoints together
- `@Accept` - Request content type (json, xml, etc.)
- `@Produce` - Response content type
- `@Param` - Define parameters (query, path, body, header)
- `@Success` - Success response with status code and schema
- `@Failure` - Error response with status code and schema
- `@Security` - Security requirements (e.g., BearerAuth)
- `@Router` - Route path and HTTP method

### Protected Endpoints

For endpoints requiring authentication:

```go
// @Security BearerAuth
// @Router /api/protected-endpoint [get]
```

### Regenerating Documentation

If you have the `swag` CLI tool installed:

```bash
swag init -g cmd/server/main.go --output docs
```

If you encounter issues with the swag binary, you can manually update the files in this directory following the OpenAPI 2.0 specification.

## Resources

- [Swagger/OpenAPI 2.0 Specification](https://swagger.io/specification/v2/)
- [swaggo Documentation](https://github.com/swaggo/swag)
- [gin-swagger Integration](https://github.com/swaggo/gin-swagger)
