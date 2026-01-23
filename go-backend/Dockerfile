FROM golang:1.24-alpine

WORKDIR /app

# Install ca-certificates for HTTPS calls (MongoDB, APIs, etc.)
RUN apk add --no-cache ca-certificates

# Copy go.mod and go.sum first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY cmd/ ./cmd/
COPY internal/ ./internal/

# Debug: List files to verify copy worked
RUN ls -la && ls -la cmd/ && ls -la cmd/server/

# Build the application
RUN go build -o main ./cmd/server

# Run
CMD ["./main"]
