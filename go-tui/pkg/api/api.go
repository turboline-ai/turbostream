package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client is a thin wrapper around the Go backend REST API.
type Client struct {
	baseURL    string
	token      string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

func (c *Client) SetToken(token string) {
	c.token = token
}

func (c *Client) Token() string {
	return c.token
}

// Domain models kept small for the TUI.
type (
	User struct {
		ID         string      `json:"_id"`
		Email      string      `json:"email"`
		Name       string      `json:"name"`
		TokenUsage *TokenUsage `json:"tokenUsage"`
	}

	TokenUsage struct {
		CurrentMonth string `json:"currentMonth"`
		TokensUsed   int64  `json:"tokensUsed"`
		Limit        int64  `json:"limit"`
	}

	Feed struct {
		ID                string    `json:"_id"`
		Name              string    `json:"name"`
		Description       string    `json:"description"`
		SystemPrompt      string    `json:"systemPrompt"`
		URL               string    `json:"url"`
		Category          string    `json:"category"`
		Icon              string    `json:"icon"`
		OwnerName         string    `json:"ownerName"`
		OwnerID           string    `json:"ownerId"`
		IsActive          bool      `json:"isActive"`
		IsPublic          bool      `json:"isPublic"`
		FeedType          string    `json:"feedType"`
		SubscriberCount   int       `json:"subscriberCount"`
		ConnectionType    string    `json:"connectionType"`
		EventName         string    `json:"eventName"`
		DefaultAIPrompt   string    `json:"defaultAIPrompt"`
		AIAnalysisEnabled bool      `json:"aiAnalysisEnabled"`
		Tags              []string  `json:"tags"`
		CreatedAt         time.Time `json:"createdAt"`
		UpdatedAt         time.Time `json:"updatedAt"`
	}

	Subscription struct {
		ID         string `json:"_id"`
		UserID     string `json:"userId"`
		FeedID     string `json:"feedId"`
		Subscribed string `json:"subscribedAt"`
		IsActive   bool   `json:"isActive"`
	}
)

// Login authenticates and returns token plus user.
func (c *Client) Login(ctx context.Context, email, password, totp string) (string, *User, error) {
	payload := map[string]string{"email": email, "password": password}
	if totp != "" {
		payload["totpToken"] = totp
	}
	var resp struct {
		Success           bool   `json:"success"`
		Message           string `json:"message"`
		Token             string `json:"token"`
		User              *User  `json:"user"`
		RequiresTwoFactor bool   `json:"requiresTwoFactor"`
	}
	if err := c.do(ctx, http.MethodPost, "/api/auth/login", payload, &resp); err != nil {
		return "", nil, err
	}
	if !resp.Success {
		return "", nil, errors.New(resp.Message)
	}
	return resp.Token, resp.User, nil
}

func (c *Client) Register(ctx context.Context, email, password, name string) (string, *User, error) {
	payload := map[string]string{"email": email, "password": password, "name": name}
	var resp struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
		Token   string `json:"token"`
		User    *User  `json:"user"`
	}
	if err := c.do(ctx, http.MethodPost, "/api/auth/register", payload, &resp); err != nil {
		return "", nil, err
	}
	if !resp.Success {
		return "", nil, errors.New(resp.Message)
	}
	return resp.Token, resp.User, nil
}

func (c *Client) Me(ctx context.Context) (*User, error) {
	var resp struct {
		Success bool   `json:"success"`
		User    *User  `json:"user"`
		Message string `json:"message"`
	}
	if err := c.do(ctx, http.MethodGet, "/api/auth/me", nil, &resp); err != nil {
		return nil, err
	}
	if !resp.Success {
		return nil, errors.New(resp.Message)
	}
	return resp.User, nil
}

func (c *Client) ListFeeds(ctx context.Context) ([]Feed, error) {
	var resp struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
		Data    []Feed `json:"data"`
		Count   int    `json:"count"`
	}
	if err := c.do(ctx, http.MethodGet, "/api/marketplace/feeds", nil, &resp); err != nil {
		return nil, err
	}
	if !resp.Success {
		return nil, errors.New(resp.Message)
	}
	return resp.Data, nil
}

func (c *Client) MyFeeds(ctx context.Context) ([]Feed, error) {
	var resp struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
		Data    []Feed `json:"data"`
		Count   int    `json:"count"`
	}
	if err := c.do(ctx, http.MethodGet, "/api/marketplace/my-feeds", nil, &resp); err != nil {
		return nil, err
	}
	if !resp.Success {
		return nil, errors.New(resp.Message)
	}
	return resp.Data, nil
}

func (c *Client) Feed(ctx context.Context, id string) (*Feed, error) {
	var resp struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
		Data    *Feed  `json:"data"`
	}
	if err := c.do(ctx, http.MethodGet, "/api/marketplace/feeds/"+id, nil, &resp); err != nil {
		return nil, err
	}
	if !resp.Success {
		return nil, errors.New(resp.Message)
	}
	return resp.Data, nil
}

func (c *Client) Subscriptions(ctx context.Context) ([]Subscription, error) {
	var resp struct {
		Success bool           `json:"success"`
		Message string         `json:"message"`
		Data    []Subscription `json:"data"`
	}
	if err := c.do(ctx, http.MethodGet, "/api/marketplace/subscriptions", nil, &resp); err != nil {
		return nil, err
	}
	if !resp.Success {
		return nil, errors.New(resp.Message)
	}
	return resp.Data, nil
}

func (c *Client) Subscribe(ctx context.Context, feedID string) error {
	var resp struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	if err := c.do(ctx, http.MethodPost, "/api/marketplace/subscribe/"+feedID, nil, &resp); err != nil {
		return err
	}
	if !resp.Success {
		return errors.New(resp.Message)
	}
	return nil
}

func (c *Client) Unsubscribe(ctx context.Context, feedID string) error {
	var resp struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	if err := c.do(ctx, http.MethodPost, "/api/marketplace/unsubscribe/"+feedID, nil, &resp); err != nil {
		return err
	}
	if !resp.Success {
		return errors.New(resp.Message)
	}
	return nil
}

func (c *Client) CreateFeed(ctx context.Context, name, description, url, category, eventName, subMsg, systemPrompt string) (*Feed, error) {
	payload := map[string]interface{}{
		"name":                name,
		"description":         description,
		"url":                 url,
		"category":            category,
		"isPublic":            true,
		"feedType":            "user",
		"connectionType":      "websocket",
		"eventName":           eventName,
		"dataFormat":          "json",
		"reconnectionEnabled": true,
	}

	if subMsg != "" {
		payload["connectionMessages"] = []string{subMsg}
	}
	if systemPrompt != "" {
		payload["systemPrompt"] = systemPrompt
	}

	var resp struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
		Data    *Feed  `json:"data"`
	}
	if err := c.do(ctx, http.MethodPost, "/api/marketplace/feeds", payload, &resp); err != nil {
		return nil, err
	}
	if !resp.Success {
		return nil, errors.New(resp.Message)
	}
	return resp.Data, nil
}

func (c *Client) DeleteFeed(ctx context.Context, feedID string) error {
	var resp struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	if err := c.do(ctx, http.MethodDelete, "/api/marketplace/feeds/"+feedID, nil, &resp); err != nil {
		return err
	}
	if !resp.Success {
		return errors.New(resp.Message)
	}
	return nil
}

// do performs an HTTP request and unmarshals the response.
func (c *Client) do(ctx context.Context, method, path string, payload interface{}, out interface{}) error {
	var body io.Reader
	if payload != nil {
		buf := &bytes.Buffer{}
		if err := json.NewEncoder(buf).Encode(payload); err != nil {
			return err
		}
		body = buf
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(data)))
	}

	if out != nil {
		if err := json.Unmarshal(data, out); err != nil {
			return err
		}
	}
	return nil
}
