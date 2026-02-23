# Stage 1: Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Go backend
FROM golang:1.24-alpine AS backend
WORKDIR /app
RUN apk add --no-cache ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY docs/ ./docs/
RUN go build -o main ./cmd/server

# Stage 3: Runtime
FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=backend /app/main .
COPY --from=backend /app/docs ./docs/
COPY --from=frontend /app/web/dist ./web/dist
CMD ["./main"]
