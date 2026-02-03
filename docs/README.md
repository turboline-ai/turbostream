# API Documentation

This directory contains the automatically generated OpenAPI documentation for the TurboStream API.

## Accessing API Documentation

When your server is running, visit:
```
http://localhost:7210/docs
```

The documentation is rendered using [Scalar](https://scalar.com), a modern interactive API documentation UI.

## Files

- `docs.go` - Generated Go code that registers the OpenAPI spec
- `openapi.json` - OpenAPI 2.0 specification in JSON format

## Extending the Documentation

### Adding Annotations to Handlers

To document your API endpoints, add OpenAPI annotations to your handler functions:

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
swag init -g cmd/server/main.go --output docs --outputTypes json
```

After regenerating, rename the output file:
```bash
mv docs/swagger.json docs/openapi.json
```

If you encounter issues with the swag binary, you can manually update the files in this directory following the OpenAPI 2.0 specification.

## Resources

- [OpenAPI 2.0 Specification](https://swagger.io/specification/v2/)
- [Scalar Documentation](https://github.com/scalar/scalar)
- [swaggo Documentation](https://github.com/swaggo/swag)
