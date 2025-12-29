package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/textarea"
	"github.com/charmbracelet/bubbles/textinput"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/turboline-ai/turbostream/go-tui/pkg/api"
)

// Color palette - Cyan theme with Magenta tabs
var (
	cyanColor       = lipgloss.Color("#00FFFF")
	darkCyanColor   = lipgloss.Color("#008B8B")
	brightCyanColor = lipgloss.Color("#00FFFF")
	dimCyanColor    = lipgloss.Color("#5F9EA0")
	whiteColor      = lipgloss.Color("#FFFFFF")
	grayColor       = lipgloss.Color("#808080")
	darkGrayColor   = lipgloss.Color("#2D2D2D")
	greenColor      = lipgloss.Color("#00FF00")
	redColor        = lipgloss.Color("#FF6B6B")

	// Magenta colors for tabs
	magentaColor     = lipgloss.Color("#FF00FF")
	darkMagentaColor = lipgloss.Color("#8B008B")
	dimMagentaColor  = lipgloss.Color("#BA55D3")

	// Tab styles - Magenta theme
	activeTabStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#000000")).
			Background(magentaColor).
			Padding(0, 2).
			MarginRight(1)

	inactiveTabStyle = lipgloss.NewStyle().
				Foreground(dimMagentaColor).
				Background(darkGrayColor).
				Padding(0, 2).
				MarginRight(1)

	tabBarStyle = lipgloss.NewStyle().
			BorderStyle(lipgloss.NormalBorder()).
			BorderBottom(true).
			BorderForeground(darkMagentaColor).
			MarginBottom(1)

	// Content styles
	boxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(darkCyanColor).
			Padding(1, 2)

	helpStyle = lipgloss.NewStyle().
			Foreground(dimCyanColor)

	contentStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(darkCyanColor).
			Padding(1, 2).
			Width(100)
)

// renderBoxWithTitle renders a box with the title embedded in the top border
func renderBoxWithTitle(title, content string, width, height int, borderColor lipgloss.Color, titleColor lipgloss.Color) string {
	border := lipgloss.RoundedBorder()
	titleText := " " + title + " "

	// Calculate remaining dashes for top border
	remainingWidth := width - 3 - len(titleText)
	if remainingWidth < 0 {
		remainingWidth = 0
	}

	// Build the box
	var result strings.Builder

	// Top border with title
	result.WriteString(lipgloss.NewStyle().Foreground(borderColor).Render(border.TopLeft + border.Top))
	result.WriteString(lipgloss.NewStyle().Bold(true).Foreground(titleColor).Render(titleText))
	result.WriteString(lipgloss.NewStyle().Foreground(borderColor).Render(strings.Repeat(border.Top, remainingWidth) + border.TopRight))
	result.WriteString("\n")

	// Split content into lines
	contentLines := strings.Split(content, "\n")
	innerWidth := width - 4 // borders + padding

	// Calculate how many content lines we need
	contentHeight := height - 2 // subtract top and bottom borders
	if contentHeight < 1 {
		contentHeight = 1
	}

	// Render content lines (pad or truncate to fit height)
	for i := 0; i < contentHeight; i++ {
		line := ""
		if i < len(contentLines) {
			line = contentLines[i]
		}

		// Get visual width of the line
		lineLen := lipgloss.Width(line)

		// Truncate if too long - use simple rune-based truncation
		if lineLen > innerWidth {
			// Strip ANSI and truncate
			truncated := ""
			currentWidth := 0
			inEscape := false

			for _, r := range line {
				if r == '\x1b' {
					inEscape = true
					truncated += string(r)
					continue
				}
				if inEscape {
					truncated += string(r)
					if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
						inEscape = false
					}
					continue
				}
				if currentWidth >= innerWidth-3 {
					truncated += "..."
					break
				}
				truncated += string(r)
				currentWidth++
			}
			line = truncated
			lineLen = lipgloss.Width(line)
		}

		// Pad to fill width
		if lineLen < innerWidth {
			line = line + strings.Repeat(" ", innerWidth-lineLen)
		}

		result.WriteString(lipgloss.NewStyle().Foreground(borderColor).Render(border.Left))
		result.WriteString(" " + line + " ")
		result.WriteString(lipgloss.NewStyle().Foreground(borderColor).Render(border.Right))
		result.WriteString("\n")
	}

	// Bottom border
	result.WriteString(lipgloss.NewStyle().Foreground(borderColor).Render(border.BottomLeft + strings.Repeat(border.Bottom, width-2) + border.BottomRight))

	return result.String()
}

// ASCII Logo with gradient colors (Cyan to Magenta)
var logoLines = []string{
	"████████╗██╗   ██╗██████╗ ██████╗  ██████╗ ███████╗████████╗██████╗ ███████╗ █████╗ ███╗   ███╗",
	"╚══██╔══╝██║   ██║██╔══██╗██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔══██╗████╗ ████║",
	"   ██║   ██║   ██║██████╔╝██████╔╝██║   ██║███████╗   ██║   ██████╔╝█████╗  ███████║██╔████╔██║",
	"   ██║   ██║   ██║██╔══██╗██╔══██╗██║   ██║╚════██║   ██║   ██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║",
	"   ██║   ╚██████╔╝██║  ██║██████╔╝╚██████╔╝███████║   ██║   ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║",
	"   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝",
}

// Gradient colors from Cyan to Magenta
var gradientColors = []lipgloss.Color{
	lipgloss.Color("#00FFFF"), // Cyan
	lipgloss.Color("#33CCFF"),
	lipgloss.Color("#6699FF"),
	lipgloss.Color("#9966FF"),
	lipgloss.Color("#CC33FF"),
	lipgloss.Color("#FF00FF"), // Magenta
}

func renderGradientLogo() string {
	var builder strings.Builder
	for i, line := range logoLines {
		color := gradientColors[i%len(gradientColors)]
		style := lipgloss.NewStyle().Foreground(color).Bold(true)
		builder.WriteString(style.Render(line))
		builder.WriteString("\n")
	}
	return builder.String()
}

// Screens within the TUI.
type screen int

const (
	screenLogin screen = iota
	screenDashboard
	screenMarketplace
	screenFeedDetail
	screenRegisterFeed
	screenEditFeed
	screenFeeds
	screenAPI
	screenHelp
)

// Tab indices for main navigation
const (
	tabDashboard = iota
	tabRegisterFeed
	tabMyFeeds
	tabAPI
	tabHelp
	tabCount
)

// feedEntry is a simplified log line for feed updates.
type feedEntry struct {
	FeedID   string
	FeedName string
	Event    string
	Data     string
	Time     time.Time
}

// aiOutputEntry represents a single AI response in the output history
type aiOutputEntry struct {
	Response  string
	Timestamp time.Time
	Provider  string
	Duration  int64
}

// Messages used by Bubble Tea update loop.
type (
	authResultMsg struct {
		Token string
		User  *api.User
		Err   error
	}
	meResultMsg struct {
		User *api.User
		Err  error
	}
	feedsMsg struct {
		Feeds []api.Feed
		Err   error
	}
	subsMsg struct {
		Subs []api.Subscription
		Err  error
	}
	feedDetailMsg struct {
		Feed *api.Feed
		Err  error
	}
	subscribeResultMsg struct {
		FeedID string
		Action string
		Err    error
	}
	wsConnectedMsg struct {
		Client *wsClient
		Err    error
	}
	wsStatusMsg struct {
		Status string
		Err    error
	}
	feedDataMsg struct {
		FeedID    string
		FeedName  string
		EventName string
		Data      string
		Time      time.Time
	}
	packetDroppedMsg struct {
		FeedID string
		Reason string
	}
	tokenUsageUpdateMsg struct {
		Usage *api.TokenUsage
	}
	feedCreateMsg struct {
		Feed *api.Feed
		Err  error
	}
	feedUpdateMsg struct {
		Feed *api.Feed
		Err  error
	}
	feedDeleteMsg struct {
		FeedID string
		Err    error
	}
	// AI-related messages
	aiResponseMsg struct {
		RequestID string
		Answer    string
		Provider  string
		Duration  int64
		Err       error
	}
	aiTokenMsg struct {
		RequestID string
		Token     string
	}
	aiTickMsg        struct{} // For auto-query interval
	userTickMsg      struct{} // For periodic user data refresh
	dashboardTickMsg struct{} // For dashboard metrics refresh
)

// Model keeps the application state (Elm-style).
type model struct {
	backendURL string
	wsURL      string
	client     *api.Client

	screen    screen
	activeTab int // Current tab index (0=Dashboard, 1=Marketplace, 2=Register Feed, 3=Feeds)

	// Auth
	authMode string // login or register
	email    textinput.Model
	password textinput.Model
	name     textinput.Model
	totp     textinput.Model
	token    string
	user     *api.User

	// Data
	feeds         []api.Feed
	subs          []api.Subscription
	selectedIdx   int
	selectedFeed  *api.Feed
	activeFeedID  string
	feedEntries   map[string][]feedEntry
	statusMessage string
	errorMessage  string

	// Realtime
	wsClient *wsClient
	wsStatus string

	// UI helpers
	spinner spinner.Model
	loading bool

	// Feed registration form
	feedName         textinput.Model
	feedDescription  textinput.Model
	feedURL          textinput.Model
	feedCategory     textinput.Model
	feedEventName    textinput.Model
	feedSubMsg       textinput.Model
	feedSystemPrompt textinput.Model
	feedFormFocus    int

	// AI Analysis panel (per-feed state)
	aiPrompts         map[string]textarea.Model  // feedID -> prompt input (per-feed prompts)
	aiAutoMode        bool                       // true = auto query at interval, false = manual
	aiInterval        int                        // seconds between auto queries (5, 10, 30, 60)
	aiIntervalIdx     int                        // index into interval options
	aiResponses       map[string]string          // feedID -> current AI response (for streaming)
	aiOutputHistories map[string][]aiOutputEntry // feedID -> history of AI outputs (last 10)
	aiLoading         map[string]bool            // feedID -> whether AI query is in progress
	aiPaused          map[string]bool            // feedID -> whether AI is paused (won't send new queries)
	aiLastQuery       map[string]time.Time       // feedID -> last query time
	aiFocused         bool                       // whether AI panel is focused for editing
	aiRequestID       string                     // track current request (for selected feed display)
	aiRequestFeedID   string                     // track which feed the current request is for (for selected feed)
	aiActiveRequests  map[string]string          // requestID -> feedID (tracks ALL active concurrent requests)
	aiStartTimes      map[string]time.Time       // feedID -> when request started (for concurrent tracking)
	aiFirstTokens     map[string]time.Time       // feedID -> when first token was received (for TTFT per feed)
	aiViewport        viewport.Model             // scrollable viewport for AI output
	aiViewportReady   bool                       // whether viewport is initialized

	// Observability dashboard
	metricsCollector      *MetricsCollector
	dashboardMetrics      DashboardMetrics
	dashboardSelectedFeed int // Selected feed index in dashboard

	// Help section
	helpPage      int // Current help page index
	helpScrollPos int // Scroll position within current page

	// Terminal dimensions
	termWidth  int
	termHeight int
}

func main() {
	backendURL := getenvDefault("TURBOSTREAM_BACKEND_URL", "http://localhost:7210")
	wsURL := getenvDefault("TURBOSTREAM_WEBSOCKET_URL", "ws://localhost:7210/ws")
	token := os.Getenv("TURBOSTREAM_TOKEN")
	email := os.Getenv("TURBOSTREAM_EMAIL")

	client := api.NewClient(backendURL)
	if token != "" {
		client.SetToken(token)
	}

	m := newModel(client, backendURL, wsURL, token, email)
	p := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Println("failed to start TUI:", err)
		os.Exit(1)
	}
}

func newModel(client *api.Client, backendURL, wsURL, token, presetEmail string) model {
	email := textinput.New()
	email.Placeholder = ""
	email.SetValue(presetEmail)
	email.Focus()

	password := textinput.New()
	password.Placeholder = ""
	password.EchoMode = textinput.EchoPassword
	password.CharLimit = 64

	name := textinput.New()
	name.Placeholder = ""

	totp := textinput.New()
	totp.Placeholder = ""
	totp.CharLimit = 10

	sp := spinner.New()
	sp.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("205"))

	// Feed registration form inputs
	feedName := textinput.New()
	feedName.Placeholder = ""
	feedName.CharLimit = 100

	feedDescription := textinput.New()
	feedDescription.Placeholder = ""
	feedDescription.CharLimit = 500

	feedURL := textinput.New()
	feedURL.Placeholder = ""
	feedURL.CharLimit = 500

	feedCategory := textinput.New()
	feedCategory.Placeholder = ""
	feedCategory.CharLimit = 50

	feedEventName := textinput.New()
	feedEventName.Placeholder = ""
	feedEventName.CharLimit = 100

	feedSubMsg := textinput.New()
	feedSubMsg.Placeholder = ""
	feedSubMsg.CharLimit = 1000

	feedSystemPrompt := textinput.New()
	feedSystemPrompt.Placeholder = ""
	feedSystemPrompt.CharLimit = 2000

	return model{
		backendURL:       backendURL,
		wsURL:            wsURL,
		client:           client,
		screen:           screenLogin,
		authMode:         "login",
		email:            email,
		password:         password,
		name:             name,
		totp:             totp,
		token:            token,
		feedEntries:      map[string][]feedEntry{},
		spinner:          sp,
		loading:          token != "",
		statusMessage:    "TurboStream TUI (Bubble Tea)",
		feedName:         feedName,
		feedDescription:  feedDescription,
		feedURL:          feedURL,
		feedCategory:     feedCategory,
		feedEventName:    feedEventName,
		feedSubMsg:       feedSubMsg,
		feedSystemPrompt: feedSystemPrompt,
		feedFormFocus:    0,
		// AI defaults
		aiPrompts:         make(map[string]textarea.Model), // per-feed prompts
		aiAutoMode:        false,
		aiInterval:        10,
		aiIntervalIdx:     1, // 10 seconds default
		aiResponses:       make(map[string]string),
		aiOutputHistories: make(map[string][]aiOutputEntry),
		aiLoading:         make(map[string]bool),
		aiPaused:          make(map[string]bool),      // per-feed pause state
		aiLastQuery:       make(map[string]time.Time), // per-feed last query time
		aiActiveRequests:  make(map[string]string),    // requestID -> feedID for concurrent tracking
		aiStartTimes:      make(map[string]time.Time), // feedID -> start time
		aiFirstTokens:     make(map[string]time.Time), // feedID -> first token time
		// Dashboard
		metricsCollector:      NewMetricsCollector(),
		dashboardSelectedFeed: 0,
		termWidth:             120,
		termHeight:            40,
	}
}

func (m model) Init() tea.Cmd {
	cmds := []tea.Cmd{m.spinner.Tick}
	if m.token != "" {
		cmds = append(cmds, fetchMeCmd(m.client))
	}
	// Periodically refresh user data to get latest token usage
	cmds = append(cmds, tea.Tick(5*time.Minute, func(t time.Time) tea.Msg { return userTickMsg{} }))
	// Dashboard metrics refresh every 500ms
	cmds = append(cmds, tea.Tick(500*time.Millisecond, func(t time.Time) tea.Msg { return dashboardTickMsg{} }))
	return tea.Batch(cmds...)
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		return m.handleKey(msg)

	case tea.WindowSizeMsg:
		m.termWidth = msg.Width
		m.termHeight = msg.Height
	case authResultMsg:
		m.loading = false
		if msg.Err != nil {
			m.errorMessage = msg.Err.Error()
			return m, nil
		}
		m.token = msg.Token
		m.user = msg.User
		m.client.SetToken(msg.Token)
		m.screen = screenDashboard
		m.statusMessage = "Logged in"
		return m, tea.Batch(loadInitialDataCmd(m.client), connectWS(m.wsURL, m.user.ID, m.userAgent()))

	case meResultMsg:
		m.loading = false
		if msg.Err != nil {
			m.errorMessage = msg.Err.Error()
			m.screen = screenLogin
			return m, nil
		}
		m.user = msg.User
		if m.user != nil {
			m.user.TokenUsage = msg.User.TokenUsage
		}
		m.screen = screenDashboard
		m.statusMessage = "Session restored"
		return m, tea.Batch(loadInitialDataCmd(m.client), connectWS(m.wsURL, m.user.ID, m.userAgent()))

	case feedsMsg:
		m.loading = false
		if msg.Err != nil {
			m.errorMessage = msg.Err.Error()
			return m, nil
		}
		m.feeds = msg.Feeds
		m.errorMessage = ""
		// Initialize metrics for all feeds
		for _, feed := range msg.Feeds {
			m.metricsCollector.InitFeed(feed.ID, feed.Name)
		}
		return m, nil

	case subsMsg:
		m.loading = false
		if msg.Err != nil {
			m.errorMessage = msg.Err.Error()
			return m, nil
		}
		m.subs = msg.Subs
		// If WebSocket is already connected, subscribe to all feeds
		if m.wsClient != nil {
			for _, sub := range m.subs {
				_ = m.wsClient.Subscribe(sub.FeedID)
			}
		}
		return m, nil

	case feedDetailMsg:
		m.loading = false
		if msg.Err != nil {
			m.errorMessage = msg.Err.Error()
			return m, nil
		}
		m.selectedFeed = msg.Feed
		m.activeFeedID = msg.Feed.ID
		m.screen = screenFeedDetail
		m.errorMessage = ""
		return m, nil

	case subscribeResultMsg:
		if msg.Err != nil {
			m.errorMessage = msg.Err.Error()
			return m, nil
		}
		m.errorMessage = ""
		m.statusMessage = fmt.Sprintf("%s successful for feed %s", strings.ToUpper(msg.Action[:1])+msg.Action[1:], msg.FeedID)
		var cmds []tea.Cmd
		cmds = append(cmds, loadSubscriptionsCmd(m.client))
		if m.wsClient != nil {
			if msg.Action == "subscribe" {
				_ = m.wsClient.Subscribe(msg.FeedID)
			} else {
				_ = m.wsClient.Unsubscribe(msg.FeedID)
				// Clear feed entries when unsubscribing
				delete(m.feedEntries, msg.FeedID)
			}
			cmds = append(cmds, m.wsClient.ListenCmd())
		}
		return m, tea.Batch(cmds...)

	case wsConnectedMsg:
		if msg.Err != nil {
			m.wsStatus = "disconnected"
			m.errorMessage = msg.Err.Error()
			return m, nil
		}
		m.wsClient = msg.Client
		m.wsStatus = "connected"
		// Re-subscribe to all existing subscriptions via WebSocket
		var cmds []tea.Cmd
		cmds = append(cmds, m.wsClient.ListenCmd())
		for _, sub := range m.subs {
			_ = m.wsClient.Subscribe(sub.FeedID)
		}
		return m, tea.Batch(cmds...)

	case wsStatusMsg:
		m.wsStatus = msg.Status
		if msg.Err != nil {
			m.errorMessage = msg.Err.Error()
		}
		if msg.Status == "disconnected" {
			m.wsClient = nil
			// Update metrics for all feeds
			for _, feed := range m.feeds {
				m.metricsCollector.RecordWSStatus(feed.ID, false)
			}
		} else if msg.Status == "connected" {
			// Update metrics for all feeds
			for _, feed := range m.feeds {
				m.metricsCollector.RecordWSStatus(feed.ID, true)
			}
		}
		return m, m.nextWSListen()

	case feedDataMsg:
		// Record metrics for the feed
		m.metricsCollector.InitFeed(msg.FeedID, msg.FeedName)
		m.metricsCollector.RecordMessage(msg.FeedID, len(msg.Data))
		m.metricsCollector.RecordWSStatus(msg.FeedID, true)

		entries := m.feedEntries[msg.FeedID]
		entries = append([]feedEntry{{FeedID: msg.FeedID, FeedName: msg.FeedName, Event: msg.EventName, Data: msg.Data, Time: msg.Time}}, entries...)

		// Track evictions when context buffer overflows
		if len(entries) > 50 {
			evictedCount := len(entries) - 50
			m.metricsCollector.RecordContextEviction(msg.FeedID, evictedCount)
			entries = entries[:50]
		}
		m.feedEntries[msg.FeedID] = entries

		// Update cache metrics based on feed entries
		cacheBytes := uint64(0)
		for _, e := range entries {
			cacheBytes += uint64(len(e.Data))
		}
		m.metricsCollector.RecordCacheStats(msg.FeedID, len(entries), cacheBytes, 0)

		return m, m.nextWSListen()

	case packetDroppedMsg:
		// Record packet loss when message parsing fails
		m.metricsCollector.RecordPacketLoss(msg.FeedID, msg.Reason)
		return m, m.nextWSListen()

	case dashboardTickMsg:
		// Refresh dashboard metrics
		m.dashboardMetrics = m.metricsCollector.GetMetrics()
		m.dashboardMetrics.SelectedIdx = m.dashboardSelectedFeed
		// Continue the tick
		return m, tea.Tick(500*time.Millisecond, func(t time.Time) tea.Msg { return dashboardTickMsg{} })

	case feedCreateMsg:
		m.loading = false
		if msg.Err != nil {
			m.errorMessage = msg.Err.Error()
			return m, nil
		}
		m.statusMessage = fmt.Sprintf("Feed '%s' created! Auto-subscribing...", msg.Feed.Name)
		m.errorMessage = ""
		// Clear form
		m.feedName.SetValue("")
		m.feedDescription.SetValue("")
		m.feedURL.SetValue("")
		m.feedCategory.SetValue("")
		m.feedEventName.SetValue("")
		m.feedSubMsg.SetValue("")
		m.feedSystemPrompt.SetValue("")
		m.feedFormFocus = 0
		// Set selected feed and go to My Feeds tab to show it
		m.selectedFeed = msg.Feed
		m.activeFeedID = msg.Feed.ID
		m.screen = screenDashboard
		m.activeTab = tabMyFeeds
		m.selectedIdx = 0
		// Load feeds, then auto-subscribe to the newly created feed
		var cmds []tea.Cmd
		cmds = append(cmds, loadFeedsCmd(m.client))
		if m.user != nil {
			cmds = append(cmds, subscribeCmd(m.client, msg.Feed.ID, m.user.ID))
		}
		return m, tea.Batch(cmds...)

	case feedUpdateMsg:
		m.loading = false
		if msg.Err != nil {
			m.errorMessage = msg.Err.Error()
			return m, nil
		}
		m.statusMessage = fmt.Sprintf("Feed '%s' updated successfully!", msg.Feed.Name)
		m.errorMessage = ""
		// Clear form
		m.feedName.SetValue("")
		m.feedDescription.SetValue("")
		m.feedURL.SetValue("")
		m.feedCategory.SetValue("")
		m.feedEventName.SetValue("")
		m.feedSubMsg.SetValue("")
		m.feedSystemPrompt.SetValue("")
		m.feedFormFocus = 0

		// Return to My Feeds
		m.screen = screenFeeds

		// Reload feeds to show updated data
		return m, loadFeedsCmd(m.client)

	case feedDeleteMsg:
		m.loading = false
		if msg.Err != nil {
			m.errorMessage = msg.Err.Error()
			return m, nil
		}
		m.statusMessage = "Feed deleted successfully!"
		m.errorMessage = ""
		// Remove from feedEntries
		delete(m.feedEntries, msg.FeedID)
		// Reset selection if needed
		if m.selectedIdx >= len(m.feeds)-1 && m.selectedIdx > 0 {
			m.selectedIdx--
		}
		// Reload both feeds and subscriptions to ensure Dashboard is updated
		return m, tea.Batch(loadFeedsCmd(m.client), loadSubscriptionsCmd(m.client))

	case aiResponseMsg:
		// Look up which feed this response belongs to using the request ID
		feedID, exists := m.aiActiveRequests[msg.RequestID]
		if !exists {
			// Fallback to old behavior for backwards compatibility
			feedID = m.aiRequestFeedID
			if feedID == "" && m.selectedFeed != nil {
				feedID = m.selectedFeed.ID
			}
		}

		// Clean up the active request tracking
		delete(m.aiActiveRequests, msg.RequestID)

		m.aiLoading[feedID] = false
		if msg.Err != nil {
			m.aiResponses[feedID] = "Error: " + msg.Err.Error()
			// Add error to history for this feed
			history := m.aiOutputHistories[feedID]
			history = append(history, aiOutputEntry{
				Response:  "Error: " + msg.Err.Error(),
				Timestamp: time.Now(),
				Provider:  "error",
				Duration:  0,
			})
			// Keep only last 10 outputs
			if len(history) > 10 {
				history = history[len(history)-10:]
			}
			m.aiOutputHistories[feedID] = history
			// Record LLM error in metrics
			if feedID != "" {
				m.metricsCollector.RecordLLMRequest(feedID, 0, 0, 0, 0, 0, true)
			}
			return m, m.nextWSListen()
		}

		// Process successful response
		m.aiResponses[feedID] = msg.Answer
		m.statusMessage = fmt.Sprintf("AI response received for feed (%s, %dms)", msg.Provider, msg.Duration)

		// Add to output history for this feed
		history := m.aiOutputHistories[feedID]
		history = append(history, aiOutputEntry{
			Response:  msg.Answer,
			Timestamp: time.Now(),
			Provider:  msg.Provider,
			Duration:  msg.Duration,
		})
		// Keep only last 10 outputs
		if len(history) > 10 {
			history = history[len(history)-10:]
		}
		m.aiOutputHistories[feedID] = history

		// Record LLM metrics (estimate tokens: 1 token ≈ 4 chars)
		if feedID != "" {
			// Get per-feed prompt for token estimation
			promptValue := ""
			if feedPrompt, ok := m.aiPrompts[feedID]; ok {
				promptValue = feedPrompt.Value()
			}
			promptTokens := len(promptValue) / 4
			responseTokens := len(msg.Answer) / 4
			eventsInPrompt := len(m.feedEntries[feedID])

			// Calculate TTFT and generation time using per-feed tracking
			var ttftMs, genTimeMs float64
			if firstToken, ok := m.aiFirstTokens[feedID]; ok && !firstToken.IsZero() {
				if startTime, ok := m.aiStartTimes[feedID]; ok && !startTime.IsZero() {
					ttftMs = float64(firstToken.Sub(startTime).Milliseconds())
				}
			}
			if startTime, ok := m.aiStartTimes[feedID]; ok && !startTime.IsZero() {
				genTimeMs = float64(time.Since(startTime).Milliseconds())
			}

			m.metricsCollector.RecordLLMRequest(feedID, promptTokens, responseTokens, ttftMs, genTimeMs, eventsInPrompt, false)

			// Clean up per-feed timing
			delete(m.aiStartTimes, feedID)
			delete(m.aiFirstTokens, feedID)
		}
		return m, m.nextWSListen()

	case aiTokenMsg:
		// Streaming token - look up feed ID from request ID for concurrent support
		feedID, exists := m.aiActiveRequests[msg.RequestID]
		if !exists {
			// Fallback for backwards compatibility
			if msg.RequestID == m.aiRequestID {
				feedID = m.aiRequestFeedID
			} else {
				// Unknown request, ignore
				return m, m.nextWSListen()
			}
		}

		// Track first token time for TTFT (per-feed)
		if _, hasFirstToken := m.aiFirstTokens[feedID]; !hasFirstToken && len(msg.Token) > 0 {
			m.aiFirstTokens[feedID] = time.Now()
		}
		m.aiResponses[feedID] += msg.Token
		m.aiLoading[feedID] = true // Keep showing loading while streaming
		return m, m.nextWSListen()

	case aiTickMsg:
		// Auto-query tick - iterate over ALL subscribed feeds
		if m.aiAutoMode {
			var cmds []tea.Cmd

			// Check all subscribed feeds for auto-query eligibility
			for _, sub := range m.subs {
				feedID := sub.FeedID

				// Skip if paused for this feed
				if m.aiPaused[feedID] {
					continue
				}

				// Skip if already loading
				if m.aiLoading[feedID] {
					continue
				}

				// Check if enough time has passed for this specific feed
				lastQuery, hasQuery := m.aiLastQuery[feedID]
				if !hasQuery || time.Since(lastQuery) >= time.Duration(m.aiInterval)*time.Second {
					m.aiLastQuery[feedID] = time.Now()
					m.aiLoading[feedID] = true

					requestID := fmt.Sprintf("req-%d-%s", time.Now().UnixNano(), feedID)

					// If this is the currently selected feed, update the display ID
					if m.selectedFeed != nil && m.selectedFeed.ID == feedID {
						m.aiRequestID = requestID
						m.aiRequestFeedID = feedID
					}

					// Register for concurrent tracking
					m.aiActiveRequests[requestID] = feedID
					m.aiStartTimes[feedID] = time.Now()
					delete(m.aiFirstTokens, feedID) // Reset first token time for this feed
					m.aiResponses[feedID] = ""

					// Create a command for this specific feed query
					cmds = append(cmds, m.sendAIQueryForFeed(feedID, requestID))
				}
			}

			// Always schedule next tick and listen for WS
			cmds = append(cmds, m.nextWSListen(), tea.Tick(time.Second, func(t time.Time) tea.Msg { return aiTickMsg{} }))
			return m, tea.Batch(cmds...)
		}
		// Schedule next tick
		return m, tea.Tick(time.Second, func(t time.Time) tea.Msg { return aiTickMsg{} })

	case userTickMsg:
		if m.token != "" {
			return m, fetchMeCmd(m.client)
		}

	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd
	}

	return m, nil
}

func (m model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Global quit on Ctrl+C
	if msg.String() == "ctrl+c" {
		if m.wsClient != nil {
			m.wsClient.Close()
		}
		return m, tea.Quit
	}

	// Quit on 'q' only if not in an input mode
	if msg.String() == "q" {
		isInputMode := m.screen == screenLogin ||
			m.screen == screenRegisterFeed ||
			m.screen == screenEditFeed ||
			m.aiFocused

		if !isInputMode {
			if m.wsClient != nil {
				m.wsClient.Close()
			}
			return m, tea.Quit
		}
	}

	if m.screen == screenLogin {
		return m.updateAuth(msg)
	}

	// Handle tab switching globally (except on login screen)
	switch msg.String() {
	case "tab":
		// Cycle through tabs: Dashboard -> Register Feed -> My Feeds
		m.activeTab = (m.activeTab + 1) % tabCount
		// Blur all AI prompts on tab switch
		for feedID, prompt := range m.aiPrompts {
			prompt.Blur()
			m.aiPrompts[feedID] = prompt
		}
		m.aiFocused = false
		switch m.activeTab {
		case tabDashboard:
			m.screen = screenDashboard
		case tabRegisterFeed:
			m.screen = screenRegisterFeed
			m.feedName.Focus()
			m.feedFormFocus = 0
		case tabMyFeeds:
			m.screen = screenFeeds
		case tabAPI:
			m.screen = screenAPI
		case tabHelp:
			m.screen = screenHelp
		}
		return m, nil
	case "shift+tab":
		// Cycle backwards through tabs
		m.activeTab--
		if m.activeTab < 0 {
			m.activeTab = tabCount - 1
		}
		// Blur all AI prompts on tab switch
		for feedID, prompt := range m.aiPrompts {
			prompt.Blur()
			m.aiPrompts[feedID] = prompt
		}
		m.aiFocused = false
		switch m.activeTab {
		case tabDashboard:
			m.screen = screenDashboard
		case tabRegisterFeed:
			m.screen = screenRegisterFeed
			m.feedName.Focus()
			m.feedFormFocus = 0
		case tabMyFeeds:
			m.screen = screenFeeds
		case tabAPI:
			m.screen = screenAPI
		case tabHelp:
			m.screen = screenHelp
		}
		return m, nil
	}

	// Handle screen-specific key handling
	if m.screen == screenRegisterFeed {
		return m.updateRegisterFeed(msg)
	}

	if m.screen == screenEditFeed {
		return m.updateEditFeed(msg)
	}

	// Handle AI prompt input when focused
	if m.aiFocused {
		// Get current feed ID for per-feed prompt
		var currentFeedID string
		if len(m.feeds) > 0 && m.selectedIdx < len(m.feeds) {
			currentFeedID = m.feeds[m.selectedIdx].ID
		}

		switch msg.String() {
		case "esc":
			m.aiFocused = false
			if currentFeedID != "" {
				if prompt, ok := m.aiPrompts[currentFeedID]; ok {
					prompt.Blur()
					m.aiPrompts[currentFeedID] = prompt
				}
			}
			return m, nil
		case "enter":
			// Submit query and exit edit mode
			m.aiFocused = false
			if currentFeedID != "" {
				if prompt, ok := m.aiPrompts[currentFeedID]; ok {
					prompt.Blur()
					m.aiPrompts[currentFeedID] = prompt
				}
			}
			if len(m.feeds) > 0 && m.selectedIdx < len(m.feeds) {
				feed := m.feeds[m.selectedIdx]
				if m.isSubscribed(feed.ID) {
					// Check if paused
					if m.aiPaused[feed.ID] {
						m.statusMessage = "AI is paused for this feed. Press 'P' to resume."
						return m, nil
					}
					m.selectedFeed = &feed
					feedID := feed.ID
					m.aiLoading[feedID] = true
					requestID := fmt.Sprintf("req-%d", time.Now().UnixNano())
					m.aiRequestID = requestID
					m.aiRequestFeedID = feedID
					// Register for concurrent tracking
					m.aiActiveRequests[requestID] = feedID
					m.aiStartTimes[feedID] = time.Now()
					delete(m.aiFirstTokens, feedID) // Reset first token time for this feed
					m.aiResponses[feedID] = ""
					return m, tea.Batch(m.sendAIQuery(), m.nextWSListen())
				}
			}
			return m, nil
		default:
			// Update the per-feed prompt
			if currentFeedID != "" {
				prompt := m.getOrCreatePrompt(currentFeedID)
				var cmd tea.Cmd
				prompt, cmd = prompt.Update(msg)
				m.aiPrompts[currentFeedID] = prompt
				return m, cmd
			}
			return m, nil
		}
	}

	// Dashboard-specific key handling (up/down for vertical feed sidebar)
	if m.screen == screenDashboard {
		switch msg.String() {
		case "up", "k":
			// Previous feed in dashboard (vertical navigation)
			if len(m.dashboardMetrics.Feeds) > 0 {
				m.dashboardSelectedFeed--
				if m.dashboardSelectedFeed < 0 {
					m.dashboardSelectedFeed = len(m.dashboardMetrics.Feeds) - 1
				}
				m.dashboardMetrics.SelectedIdx = m.dashboardSelectedFeed
			}
			return m, nil
		case "down", "j":
			// Next feed in dashboard (vertical navigation)
			if len(m.dashboardMetrics.Feeds) > 0 {
				m.dashboardSelectedFeed++
				if m.dashboardSelectedFeed >= len(m.dashboardMetrics.Feeds) {
					m.dashboardSelectedFeed = 0
				}
				m.dashboardMetrics.SelectedIdx = m.dashboardSelectedFeed
			}
			return m, nil
		}
	}

	// Help screen key handling (page navigation)
	if m.screen == screenHelp {
		switch msg.String() {
		case "left", "h":
			// Previous help page
			if m.helpPage > 0 {
				m.helpPage--
				m.helpScrollPos = 0
			}
			return m, nil
		case "right", "l":
			// Next help page
			m.helpPage++
			// Bound check happens in viewHelp
			m.helpScrollPos = 0
			return m, nil
		case "up", "k":
			// Scroll up within page
			if m.helpScrollPos > 0 {
				m.helpScrollPos--
			}
			return m, nil
		case "down", "j":
			// Scroll down within page
			m.helpScrollPos++
			return m, nil
		case "1", "2", "3", "4", "5":
			// Jump to specific page
			pageNum := int(msg.String()[0] - '1')
			m.helpPage = pageNum
			m.helpScrollPos = 0
			return m, nil
		}
	}

	switch msg.String() {
	case "up":
		// Only for feed list navigation, not dashboard
		if m.screen != screenDashboard && m.selectedIdx > 0 {
			m.selectedIdx--
		}
	case "down":
		// Only for feed list navigation, not dashboard
		if m.screen != screenDashboard && m.selectedIdx < len(m.feeds)-1 {
			m.selectedIdx++
		}
	case "enter":
		if len(m.feeds) > 0 {
			feed := m.feeds[m.selectedIdx]
			return m, fetchFeedCmd(m.client, feed.ID)
		}
	case "s":
		// Subscribe/unsubscribe using selected feed from list OR selectedFeed if in detail view
		var feedID string
		var userID string
		if m.user != nil {
			userID = m.user.ID
		}
		if m.screen == screenFeeds && len(m.feeds) > 0 && m.selectedIdx < len(m.feeds) {
			feedID = m.feeds[m.selectedIdx].ID
		} else if m.selectedFeed != nil {
			feedID = m.selectedFeed.ID
		}
		if feedID != "" && userID != "" {
			if m.isSubscribed(feedID) {
				return m, unsubscribeCmd(m.client, feedID)
			}
			return m, subscribeCmd(m.client, feedID, userID)
		}
	case "e":
		// Edit feed (only on My Feeds screen)
		if m.screen == screenFeeds && len(m.feeds) > 0 && m.selectedIdx < len(m.feeds) {
			feed := m.feeds[m.selectedIdx]
			// Only allow editing own feeds
			if m.user != nil && feed.OwnerID == m.user.ID {
				m.screen = screenEditFeed
				m.feedName.SetValue(feed.Name)
				m.feedDescription.SetValue(feed.Description)
				m.feedURL.SetValue(feed.URL)
				m.feedCategory.SetValue(feed.Category)
				m.feedEventName.SetValue(feed.EventName)
				m.feedSubMsg.SetValue("") // Default or fetch if available
				m.feedSystemPrompt.SetValue(feed.SystemPrompt)
				m.feedFormFocus = 0
				m.errorMessage = ""
				return m, m.feedName.Focus()
			} else {
				m.errorMessage = "You can only edit your own feeds"
			}
		}
	case "D":
		// Delete feed (Shift+D, only on My Feeds screen)
		if m.screen == screenFeeds && len(m.feeds) > 0 && m.selectedIdx < len(m.feeds) {
			feed := m.feeds[m.selectedIdx]
			// Only allow deleting own feeds
			if m.user != nil && feed.OwnerID == m.user.ID {
				m.loading = true
				return m, deleteFeedCmd(m.client, feed.ID)
			} else {
				m.errorMessage = "You can only delete your own feeds"
			}
		}
	case "m":
		// Toggle AI mode (auto/manual)
		if (m.screen == screenFeeds || m.screen == screenDashboard) && !m.aiFocused {
			m.aiAutoMode = !m.aiAutoMode
			if m.aiAutoMode {
				m.statusMessage = fmt.Sprintf("AI Auto mode enabled (every %ds)", m.aiInterval)
				// Reset last query time for all feeds to trigger immediate update
				for _, f := range m.feeds {
					m.aiLastQuery[f.ID] = time.Now().Add(-time.Duration(m.aiInterval) * time.Second)
				}
				return m, m.startAIAutoQuery()
			} else {
				m.statusMessage = "AI Manual mode enabled"
			}
		}
	case "i":
		// Cycle AI interval (works on My Feeds and Dashboard)
		if (m.screen == screenFeeds || m.screen == screenDashboard) && !m.aiFocused {
			m.aiIntervalIdx = (m.aiIntervalIdx + 1) % len(aiIntervalOptions)
			m.aiInterval = aiIntervalOptions[m.aiIntervalIdx]
			m.statusMessage = fmt.Sprintf("AI query interval set to %ds", m.aiInterval)
		}
	case "P":
		// Toggle AI pause/play for current feed (Shift+P)
		if (m.screen == screenFeeds || m.screen == screenDashboard) && !m.aiFocused {
			if len(m.feeds) > 0 && m.selectedIdx < len(m.feeds) {
				feedID := m.feeds[m.selectedIdx].ID
				m.aiPaused[feedID] = !m.aiPaused[feedID]
				if m.aiPaused[feedID] {
					m.statusMessage = "AI Analysis PAUSED for this feed (Shift+P to resume)"
				} else {
					m.statusMessage = "AI Analysis RESUMED for this feed"
					// If in auto mode, restart the query cycle
					if m.aiAutoMode {
						m.aiLastQuery[feedID] = time.Now().Add(-time.Duration(m.aiInterval) * time.Second) // Force immediate query
						return m, m.startAIAutoQuery()
					}
				}
			}
		}
	case "p":
		// Focus AI prompt for editing
		if (m.screen == screenFeeds || m.screen == screenDashboard) && !m.aiFocused {
			m.aiFocused = true
			// Get or create per-feed prompt and focus it
			if len(m.feeds) > 0 && m.selectedIdx < len(m.feeds) {
				feedID := m.feeds[m.selectedIdx].ID
				prompt := m.getOrCreatePrompt(feedID)
				prompt.Focus()
				m.aiPrompts[feedID] = prompt
			}
		}
	case "esc":
		// Exit AI prompt editing or go back from Feed Detail
		if m.aiFocused {
			m.aiFocused = false
			// Blur per-feed prompt
			if len(m.feeds) > 0 && m.selectedIdx < len(m.feeds) {
				feedID := m.feeds[m.selectedIdx].ID
				if prompt, ok := m.aiPrompts[feedID]; ok {
					prompt.Blur()
					m.aiPrompts[feedID] = prompt
				}
			}
			return m, nil
		}
		// Go back from Feed Detail view to My Feeds
		if m.screen == screenFeedDetail {
			m.screen = screenFeeds
			m.selectedFeed = nil
			return m, nil
		}

	case "r":
		// Force reconnect - close existing connection if any and reconnect
		if m.user != nil {
			if m.wsClient != nil {
				m.wsClient.Close()
				m.wsClient = nil
			}
			m.wsStatus = "reconnecting"
			return m, connectWS(m.wsURL, m.user.ID, m.userAgent())
		}
	case "l":
		if m.wsClient != nil {
			m.wsClient.Close()
		}
		m.token = ""
		m.user = nil
		m.client.SetToken("")
		m.feeds = nil
		m.subs = nil
		m.selectedFeed = nil
		m.feedEntries = map[string][]feedEntry{}
		m.wsClient = nil
		m.wsStatus = ""
		m.screen = screenLogin
		m.statusMessage = "Logged out"
		m.errorMessage = ""
		m.email.SetValue("")
		m.password.SetValue("")
		m.name.SetValue("")
		m.totp.SetValue("")
		m.email.Focus()
		return m, nil
	}
	return m, nil
}

func (m model) updateAuth(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd
	switch msg.Type {
	case tea.KeyEnter:
		m.loading = true
		m.errorMessage = ""
		if m.authMode == "login" {
			return m, loginCmd(m.client, m.email.Value(), m.password.Value(), m.totp.Value())
		}
		return m, registerCmd(m.client, m.email.Value(), m.password.Value(), m.name.Value())
	case tea.KeyTab, tea.KeyShiftTab, tea.KeyDown:
		cmds = append(cmds, switchFocusNext(&m))
		return m, tea.Batch(cmds...)
	case tea.KeyUp:
		cmds = append(cmds, switchFocusPrev(&m))
		return m, tea.Batch(cmds...)
	case tea.KeyCtrlS:
		if m.authMode == "login" {
			m.authMode = "register"
		} else {
			m.authMode = "login"
		}
		return m, nil
	}
	// Only update the focused input field
	var cmd tea.Cmd
	if m.email.Focused() {
		m.email, cmd = m.email.Update(msg)
		cmds = append(cmds, cmd)
	} else if m.password.Focused() {
		m.password, cmd = m.password.Update(msg)
		cmds = append(cmds, cmd)
	} else if m.totp.Focused() {
		m.totp, cmd = m.totp.Update(msg)
		cmds = append(cmds, cmd)
	} else if m.name.Focused() {
		m.name, cmd = m.name.Update(msg)
		cmds = append(cmds, cmd)
	}
	return m, tea.Batch(cmds...)
}

func switchFocusNext(m *model) tea.Cmd {
	if m.email.Focused() {
		m.email.Blur()
		return m.password.Focus()
	}
	if m.password.Focused() {
		m.password.Blur()
		return m.totp.Focus()
	}
	if m.totp.Focused() {
		m.totp.Blur()
		if m.authMode == "register" {
			return m.name.Focus()
		}
		return m.email.Focus()
	}
	if m.name.Focused() {
		m.name.Blur()
		return m.email.Focus()
	}
	return m.email.Focus()
}

func switchFocusPrev(m *model) tea.Cmd {
	if m.email.Focused() {
		m.email.Blur()
		if m.authMode == "register" {
			return m.name.Focus()
		}
		return m.totp.Focus()
	}
	if m.password.Focused() {
		m.password.Blur()
		return m.email.Focus()
	}
	if m.totp.Focused() {
		m.totp.Blur()
		return m.password.Focus()
	}
	if m.name.Focused() {
		m.name.Blur()
		return m.totp.Focus()
	}
	return m.email.Focus()
}

func (m model) updateRegisterFeed(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg.Type {
	case tea.KeyEsc:
		m.screen = screenDashboard
		m.feedName.Blur()
		m.feedDescription.Blur()
		m.feedURL.Blur()
		m.feedCategory.Blur()
		m.feedEventName.Blur()
		m.feedSubMsg.Blur()
		return m, nil
	case tea.KeyEnter:
		if msg.String() == "enter" {
			// Submit form
			m.loading = true
			m.errorMessage = ""
			return m, createFeedCmd(m.client, m.feedName.Value(), m.feedDescription.Value(),
				m.feedURL.Value(), m.feedCategory.Value(),
				m.feedEventName.Value(), m.feedSubMsg.Value(), m.feedSystemPrompt.Value())
		}
	case tea.KeyDown:
		return m, m.nextFeedFormFocus()
	case tea.KeyUp:
		return m, m.prevFeedFormFocus()
	}

	// Update the focused input
	var cmd tea.Cmd
	switch m.feedFormFocus {
	case 0:
		m.feedName, cmd = m.feedName.Update(msg)
	case 1:
		m.feedDescription, cmd = m.feedDescription.Update(msg)
	case 2:
		m.feedURL, cmd = m.feedURL.Update(msg)
	case 3:
		m.feedCategory, cmd = m.feedCategory.Update(msg)
	case 4:
		m.feedEventName, cmd = m.feedEventName.Update(msg)
	case 5:
		m.feedSubMsg, cmd = m.feedSubMsg.Update(msg)
	case 6:
		m.feedSystemPrompt, cmd = m.feedSystemPrompt.Update(msg)
	}
	cmds = append(cmds, cmd)

	return m, tea.Batch(cmds...)
}

func (m model) updateEditFeed(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg.Type {
	case tea.KeyEsc:
		m.screen = screenFeeds
		m.errorMessage = ""
		return m, nil
	case tea.KeyEnter:
		// Submit update
		if m.feedName.Value() == "" || m.feedURL.Value() == "" {
			m.errorMessage = "Name and URL are required"
			return m, nil
		}
		m.loading = true
		m.errorMessage = ""

		updates := map[string]interface{}{
			"name":         m.feedName.Value(),
			"description":  m.feedDescription.Value(),
			"url":          m.feedURL.Value(),
			"category":     m.feedCategory.Value(),
			"eventName":    m.feedEventName.Value(),
			"systemPrompt": m.feedSystemPrompt.Value(),
		}

		return m, updateFeedCmd(m.client, m.feeds[m.selectedIdx].ID, updates)
	case tea.KeyUp, tea.KeyShiftTab:
		return m, m.prevFeedFormFocus()
	case tea.KeyDown, tea.KeyTab:
		return m, m.nextFeedFormFocus()
	}

	// Handle text input updates
	var cmd tea.Cmd
	switch m.feedFormFocus {
	case 0:
		m.feedName, cmd = m.feedName.Update(msg)
	case 1:
		m.feedDescription, cmd = m.feedDescription.Update(msg)
	case 2:
		m.feedURL, cmd = m.feedURL.Update(msg)
	case 3:
		m.feedCategory, cmd = m.feedCategory.Update(msg)
	case 4:
		m.feedEventName, cmd = m.feedEventName.Update(msg)
	case 5:
		m.feedSubMsg, cmd = m.feedSubMsg.Update(msg)
	case 6:
		m.feedSystemPrompt, cmd = m.feedSystemPrompt.Update(msg)
	}
	cmds = append(cmds, cmd)

	return m, tea.Batch(cmds...)
}

func (m *model) nextFeedFormFocus() tea.Cmd {
	inputs := []struct {
		input *textinput.Model
		index int
	}{
		{&m.feedName, 0},
		{&m.feedDescription, 1},
		{&m.feedURL, 2},
		{&m.feedCategory, 3},
		{&m.feedEventName, 4},
		{&m.feedSubMsg, 5},
		{&m.feedSystemPrompt, 6},
	}

	inputs[m.feedFormFocus].input.Blur()
	m.feedFormFocus = (m.feedFormFocus + 1) % len(inputs)
	return inputs[m.feedFormFocus].input.Focus()
}

func (m *model) prevFeedFormFocus() tea.Cmd {
	inputs := []struct {
		input *textinput.Model
		index int
	}{
		{&m.feedName, 0},
		{&m.feedDescription, 1},
		{&m.feedURL, 2},
		{&m.feedCategory, 3},
		{&m.feedEventName, 4},
		{&m.feedSubMsg, 5},
		{&m.feedSystemPrompt, 6},
	}

	inputs[m.feedFormFocus].input.Blur()
	m.feedFormFocus--
	if m.feedFormFocus < 0 {
		m.feedFormFocus = len(inputs) - 1
	}
	return inputs[m.feedFormFocus].input.Focus()
}

func (m model) View() string {
	if m.screen == screenLogin {
		return m.viewAuth()
	}
	return m.viewApp()
}

func (m model) viewAuth() string {
	builder := strings.Builder{}

	// Render gradient ASCII logo
	builder.WriteString(renderGradientLogo())
	builder.WriteString("\n")

	if m.authMode == "login" {
		builder.WriteString(lipgloss.NewStyle().Foreground(brightCyanColor).Render("Login"))
		builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render(" (Ctrl+S for register)"))
	} else {
		builder.WriteString(lipgloss.NewStyle().Foreground(brightCyanColor).Render("Register"))
		builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render(" (Ctrl+S for login)"))
	}
	builder.WriteString("\n\n")

	if m.authMode == "register" {
		builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Name: "))
		builder.WriteString(m.name.View())
		builder.WriteString("\n")
	}
	builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Email: "))
	builder.WriteString(m.email.View())
	builder.WriteString("\n")
	builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Password: "))
	builder.WriteString(m.password.View())
	builder.WriteString("\n")
	if m.authMode == "login" {
		builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("TOTP (optional): "))
		builder.WriteString(m.totp.View())
		builder.WriteString("\n")
	}

	builder.WriteString("\n")
	builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Enter to submit | ↑↓ navigate | q to quit"))

	if m.loading {
		builder.WriteString("\n")
		builder.WriteString(fmt.Sprintf("%s Authenticating...", m.spinner.View()))
	}
	if m.errorMessage != "" {
		builder.WriteString("\n")
		builder.WriteString(lipgloss.NewStyle().Foreground(redColor).Render(m.errorMessage))
	}

	return boxStyle.Render(builder.String())
}

func (m model) viewApp() string {
	top := m.viewTopBar()
	tabBar := m.viewTabBar()
	content := m.viewContent()
	footer := m.viewFooter()
	return lipgloss.JoinVertical(lipgloss.Left, top, tabBar, content, footer)
}

func (m model) viewTabBar() string {
	tabs := []string{"Dashboard", "Register Feed", "My Feeds", "API", "Help"}
	var renderedTabs []string

	for i, tab := range tabs {
		var style lipgloss.Style
		if i == m.activeTab {
			style = activeTabStyle
		} else {
			style = inactiveTabStyle
		}
		renderedTabs = append(renderedTabs, style.Render(tab))
	}

	tabRow := lipgloss.JoinHorizontal(lipgloss.Top, renderedTabs...)
	return tabBarStyle.Render(tabRow)
}

func (m model) viewTopBar() string {
	left := lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render("⚡ TurboStream")
	status := fmt.Sprintf("Backend: %s | WS: %s", m.backendURL, m.wsStatus)
	if m.user != nil && m.user.TokenUsage != nil {
		status += fmt.Sprintf(" | Tokens %d/%d", m.user.TokenUsage.TokensUsed, m.user.TokenUsage.Limit)
	}
	userInfo := ""
	if m.user != nil {
		userInfo = lipgloss.NewStyle().Foreground(dimCyanColor).Render(fmt.Sprintf(" | %s [l to logout]", m.user.Email))
	}
	return lipgloss.JoinHorizontal(lipgloss.Top, left, "  ", status, userInfo)
}

func (m model) viewContent() string {
	switch m.screen {
	case screenDashboard:
		return m.viewDashboard()
	case screenFeedDetail:
		return m.viewFeedDetail()
	case screenRegisterFeed:
		return m.viewRegisterFeed()
	case screenEditFeed:
		return m.viewEditFeed()
	case screenFeeds:
		return m.viewMyFeeds()
	case screenAPI:
		return m.viewAPI()
	case screenHelp:
		return m.viewHelp()
	default:
		return ""
	}
}

func (m model) viewMyFeeds() string {
	if len(m.feeds) == 0 {
		builder := strings.Builder{}
		builder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render("My Feeds"))
		builder.WriteString("\n\n")
		builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("No feeds registered yet. Use 'Register Feed' tab to add a WebSocket feed!"))
		return contentStyle.Render(builder.String())
	}

	// Calculate layout dimensions based on terminal size
	leftColWidth := 35
	middleColWidth := 60
	margin := 2 // space between columns

	// Calculate AI panel width to extend to terminal edge with safe margin
	// Total: leftCol + margin + middleCol + margin + aiCol + rightMargin
	rightMargin := 6 // extra margin to prevent right side cutoff on smaller screens
	usedWidth := leftColWidth + margin + middleColWidth + margin + rightMargin
	aiColWidth := m.termWidth - usedWidth
	if aiColWidth < 40 {
		aiColWidth = 40 // minimum width
	}

	// Height calculations: Feed list is 12, we want Instructions + Feed list bottom to align with Live Stream bottom
	feedListHeight := 12
	streamHeight := 25
	infoBoxHeight := 10 // approximate height of info box

	// Total right column height = infoBox + streamBox
	// Instructions should fill remaining space so its bottom aligns with stream bottom
	// Left column total should equal right column total
	instructHeight := infoBoxHeight + streamHeight - feedListHeight
	if instructHeight < 8 {
		instructHeight = 8
	}

	// AI panel height should match the full right column (infoBox + streamBox)
	aiHeight := infoBoxHeight + streamHeight + 2 // +2 for borders

	// Feed list section (top-left) - build content without title (title goes in border)
	// Calculate visible feeds based on box height (subtract 2 for borders)
	visibleFeeds := feedListHeight - 2
	if visibleFeeds < 3 {
		visibleFeeds = 3
	}

	// Determine scroll window for feeds
	feedStartIdx := 0
	feedEndIdx := len(m.feeds)
	if len(m.feeds) > visibleFeeds {
		// Center selected item in visible window
		halfVisible := visibleFeeds / 2
		feedStartIdx = m.selectedIdx - halfVisible
		if feedStartIdx < 0 {
			feedStartIdx = 0
		}
		feedEndIdx = feedStartIdx + visibleFeeds
		if feedEndIdx > len(m.feeds) {
			feedEndIdx = len(m.feeds)
			feedStartIdx = feedEndIdx - visibleFeeds
			if feedStartIdx < 0 {
				feedStartIdx = 0
			}
		}
	}

	feedListBuilder := strings.Builder{}

	// Show scroll indicator at top if needed
	if feedStartIdx > 0 {
		feedListBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("  ▲ more\n"))
	}

	for i := feedStartIdx; i < feedEndIdx; i++ {
		f := m.feeds[i]
		cursor := "  "
		style := lipgloss.NewStyle()
		if i == m.selectedIdx {
			cursor = lipgloss.NewStyle().Foreground(cyanColor).Render("> ")
			style = style.Foreground(brightCyanColor)
		}
		subscribed := ""
		if m.isSubscribed(f.ID) {
			subscribed = " [ok]"
		}
		// Calculate max name length: leftColWidth - 4 (borders) - 2 (cursor) - category - subscribed - brackets
		maxNameLen := leftColWidth - 18
		if maxNameLen < 10 {
			maxNameLen = 10
		}
		feedName := truncate(f.Name, maxNameLen)
		category := truncate(f.Category, 8)
		line := fmt.Sprintf("%s%s [%s]%s", cursor, feedName, category, subscribed)
		feedListBuilder.WriteString(style.Render(line))
		feedListBuilder.WriteString("\n")
	}

	// Show scroll indicator at bottom if needed
	if feedEndIdx < len(m.feeds) {
		feedListBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("  ▼ more"))
	}

	feedListBox := renderBoxWithTitle("My Feeds", feedListBuilder.String(), leftColWidth, feedListHeight, darkCyanColor, cyanColor)

	// Instructions section (bottom-left) - content without title
	instructBuilder := strings.Builder{}
	instructBuilder.WriteString(lipgloss.NewStyle().Foreground(brightCyanColor).Render("Navigation"))
	instructBuilder.WriteString("\n")
	instructBuilder.WriteString("  Up/Down  Select feed\n")
	instructBuilder.WriteString("  Tab      Next tab\n")
	instructBuilder.WriteString("  Shift+Tab Previous tab\n")
	instructBuilder.WriteString("\n")
	instructBuilder.WriteString(lipgloss.NewStyle().Foreground(brightCyanColor).Render("Actions"))
	instructBuilder.WriteString("\n")
	instructBuilder.WriteString("  s        Sub/Unsub\n")
	instructBuilder.WriteString("  e        Edit feed\n")
	instructBuilder.WriteString("  r        Reconnect to WS\n")
	instructBuilder.WriteString("  Shift+D  Delete my feed\n")
	instructBuilder.WriteString("  l        Logout\n")
	instructBuilder.WriteString("  q        Quit\n")
	instructBuilder.WriteString("\n")
	instructBuilder.WriteString(lipgloss.NewStyle().Foreground(brightCyanColor).Render("AI Analysis"))
	instructBuilder.WriteString("\n")
	instructBuilder.WriteString("  p        Edit prompt\n")
	instructBuilder.WriteString("  Enter    Send prompt\n")
	instructBuilder.WriteString("  Esc      Exit prompt\n")
	instructBuilder.WriteString("  m        Auto/Manual\n")
	instructBuilder.WriteString("  [ ]      Scroll output\n")

	instructBox := renderBoxWithTitle("Instructions", instructBuilder.String(), leftColWidth, instructHeight, darkMagentaColor, magentaColor)

	// Left column: Feed list + Instructions
	leftColumn := lipgloss.JoinVertical(lipgloss.Left, feedListBox, instructBox)

	// Right column: Feed Info + Live Stream
	rightBuilder := strings.Builder{}

	if m.selectedIdx < len(m.feeds) {
		feed := m.feeds[m.selectedIdx]

		// Calculate max content width: middleColWidth - 4 (borders/padding)
		maxContentWidth := middleColWidth - 6
		if maxContentWidth < 30 {
			maxContentWidth = 30
		}

		// Feed Info Box (top-right) - content without title
		infoBuilder := strings.Builder{}
		infoBuilder.WriteString(truncate(feed.Name, maxContentWidth))
		infoBuilder.WriteString("\n")
		infoBuilder.WriteString(fmt.Sprintf("Category: %s\n", truncate(feed.Category, maxContentWidth-10)))
		infoBuilder.WriteString(fmt.Sprintf("URL: %s\n", truncate(feed.URL, maxContentWidth-5)))
		if feed.EventName != "" {
			infoBuilder.WriteString(fmt.Sprintf("Event: %s\n", truncate(feed.EventName, maxContentWidth-7)))
		}

		subStatus := "[-] Not Subscribed"
		if m.isSubscribed(feed.ID) {
			subStatus = "[+] Subscribed"
		}
		infoBuilder.WriteString(fmt.Sprintf("Status: %s\n", subStatus))
		infoBuilder.WriteString(fmt.Sprintf("WS: %s", m.wsStatus))

		infoBox := renderBoxWithTitle("Feed Info", infoBuilder.String(), middleColWidth, infoBoxHeight, darkCyanColor, cyanColor)

		// Live Stream Box (bottom-right) - content without title
		streamBuilder := strings.Builder{}

		// Calculate max data width: middleColWidth - 4 (borders) - 9 (timestamp + space)
		maxDataWidth := middleColWidth - 15
		if maxDataWidth < 20 {
			maxDataWidth = 20
		}

		entries := m.feedEntries[feed.ID]
		if len(entries) == 0 {
			if m.wsStatus != "connected" {
				streamBuilder.WriteString("[!] WS not connected\n")
				streamBuilder.WriteString("Reconnecting...")
			} else if !m.isSubscribed(feed.ID) {
				streamBuilder.WriteString("Press 's' to subscribe...")
			} else {
				streamBuilder.WriteString("[+] Connected & Subscribed\n")
				streamBuilder.WriteString("Waiting for data...")
			}
		} else {
			// Show latest entries (up to fit in box)
			showCount := streamHeight - 3 // account for borders
			if len(entries) < showCount {
				showCount = len(entries)
			}
			for i := 0; i < showCount; i++ {
				e := entries[i]
				timestamp := e.Time.Format("15:04:05")
				streamBuilder.WriteString(fmt.Sprintf("%s %s\n", timestamp, truncate(e.Data, maxDataWidth)))
			}
		}

		streamBox := renderBoxWithTitle("Live Stream", streamBuilder.String(), middleColWidth, streamHeight, darkCyanColor, cyanColor)

		// AI Analysis Box (right column) - with scrollable output
		aiBuilder := strings.Builder{}

		// Mode toggle + Pause state
		modeLabel := "Manual"
		if m.aiAutoMode {
			modeLabel = fmt.Sprintf("Auto (%ds)", m.aiInterval)
		}
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Mode: "))
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(brightCyanColor).Render(modeLabel))

		// Show pause status
		if m.aiPaused[feed.ID] {
			aiBuilder.WriteString("  ")
			aiBuilder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#FF6B6B")).Render("⏸ PAUSED"))
		} else {
			aiBuilder.WriteString("  ")
			aiBuilder.WriteString(lipgloss.NewStyle().Foreground(greenColor).Render("▶ Active"))
		}
		aiBuilder.WriteString("\n")

		// Dynamic separator based on AI panel width
		separatorWidth := aiColWidth - 8 // account for padding and border
		if separatorWidth < 20 {
			separatorWidth = 20
		}
		separator := strings.Repeat("-", separatorWidth)
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(darkMagentaColor).Render(separator))
		aiBuilder.WriteString("\n\n")

		// Output stream - show last 3 responses
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Output Stream (last 3):"))
		aiBuilder.WriteString("\n")

		// Calculate available height for output area
		// Total height - header(3) - mode(2) - separator(2) - prompt(3) - controls(2) - borders/padding(4)
		outputAreaHeight := aiHeight - 16
		if outputAreaHeight < 6 {
			outputAreaHeight = 6
		}

		// Calculate text wrap width for AI output
		aiTextWidth := aiColWidth - 10 // account for padding, border, and some margin
		if aiTextWidth < 30 {
			aiTextWidth = 30
		}

		// Get per-feed AI state
		feedAIHistory := m.aiOutputHistories[feed.ID]
		feedAIResponse := m.aiResponses[feed.ID]
		feedAILoading := m.aiLoading[feed.ID]

		if feedAILoading && len(feedAIHistory) == 0 {
			aiBuilder.WriteString(lipgloss.NewStyle().Foreground(magentaColor).Render("[...] Querying LLM..."))
			aiBuilder.WriteString("\n")
		}

		if len(feedAIHistory) == 0 && !feedAILoading {
			aiBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("No outputs yet. Press 'p' then Enter."))
			aiBuilder.WriteString("\n")
		} else {
			// Build scrollable content for last 3 outputs
			var outputContent strings.Builder
			maxOutputs := 3
			startIdx := 0
			if len(feedAIHistory) > maxOutputs {
				startIdx = len(feedAIHistory) - maxOutputs
			}

			for i := startIdx; i < len(feedAIHistory); i++ {
				entry := feedAIHistory[i]
				// Header line with timestamp and provider
				timestamp := entry.Timestamp.Format("15:04:05")
				header := fmt.Sprintf("[%s | %s | %dms]", timestamp, entry.Provider, entry.Duration)
				outputContent.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render(header))
				outputContent.WriteString("\n")

				// Full output content - wrapped to fit panel width
				wrapped := wrapText(entry.Response, aiTextWidth)
				outputContent.WriteString(lipgloss.NewStyle().Foreground(whiteColor).Render(wrapped))
				outputContent.WriteString("\n")

				// Add separator between outputs
				if i < len(feedAIHistory)-1 {
					outputContent.WriteString(lipgloss.NewStyle().Foreground(grayColor).Render("---"))
					outputContent.WriteString("\n")
				}
			}

			// Show current streaming output if loading
			if feedAILoading && feedAIResponse != "" {
				outputContent.WriteString(lipgloss.NewStyle().Foreground(grayColor).Render("---"))
				outputContent.WriteString("\n")
				outputContent.WriteString(lipgloss.NewStyle().Foreground(magentaColor).Render("[...] Streaming..."))
				outputContent.WriteString("\n")
				wrapped := wrapText(feedAIResponse, aiTextWidth)
				outputContent.WriteString(lipgloss.NewStyle().Foreground(whiteColor).Render(wrapped))
				outputContent.WriteString("\n")
			}

			// Render output with truncation to prevent overflow
			fullOutput := outputContent.String()
			lines := strings.Split(fullOutput, "\n")

			// If content exceeds available height, keep only the last N lines (scrolling effect)
			if len(lines) > outputAreaHeight {
				startIndex := len(lines) - outputAreaHeight
				if startIndex < 0 {
					startIndex = 0
				}
				lines = lines[startIndex:]
				fullOutput = strings.Join(lines, "\n")
			}

			aiBuilder.WriteString(fullOutput)
		}

		aiBuilder.WriteString("\n")
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(darkMagentaColor).Render(separator))
		aiBuilder.WriteString("\n")

		// Prompt input area - with green > prefix and per-feed prompt
		promptPrefix := lipgloss.NewStyle().Foreground(greenColor).Render("> ")
		aiBuilder.WriteString(promptPrefix)

		// Get per-feed prompt (view-only version)
		feedPrompt := m.getPrompt(feed.ID)

		// Update width to fit panel
		promptWidth := aiColWidth - 12
		if promptWidth < 20 {
			promptWidth = 20
		}
		feedPrompt.SetWidth(promptWidth)

		if m.aiFocused {
			feedPrompt.Focus()
		} else {
			feedPrompt.Blur()
		}

		aiBuilder.WriteString(feedPrompt.View())
		aiBuilder.WriteString("\n\n")

		// AI Controls hint - updated with pause info
		controlHint := "Enter: send | m: mode | p: edit | Shift+P: pause"
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render(controlHint))

		aiBox := renderBoxWithTitle("AI Analysis", aiBuilder.String(), aiColWidth, aiHeight, darkMagentaColor, magentaColor)

		middleColumn := lipgloss.JoinVertical(lipgloss.Left, infoBox, streamBox)
		rightBuilder.WriteString(lipgloss.JoinHorizontal(lipgloss.Top, middleColumn, "  ", aiBox))
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, leftColumn, "  ", rightBuilder.String())
}

func (m model) viewDashboard() string {
	// If we have metrics data, show the observability dashboard
	if len(m.dashboardMetrics.Feeds) > 0 {
		return renderDashboardView(m.dashboardMetrics, m.termWidth, m.termHeight)
	}

	// Fallback to simple dashboard when no feed metrics yet
	builder := strings.Builder{}

	builder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render("Observability Dashboard"))
	builder.WriteString("\n\n")

	stats := []string{
		fmt.Sprintf("Total Feeds: %d", len(m.feeds)),
		fmt.Sprintf("Active Subscriptions: %d", len(m.subs)),
	}
	if m.user != nil && m.user.TokenUsage != nil {
		stats = append(stats, fmt.Sprintf("Token Usage: %d/%d", m.user.TokenUsage.TokensUsed, m.user.TokenUsage.Limit))
	}

	for _, stat := range stats {
		builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("• "))
		builder.WriteString(stat)
		builder.WriteString("\n")
	}

	builder.WriteString("\n")
	builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Subscribe to a feed to see streaming metrics."))
	builder.WriteString("\n\n")
	builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Tab/Shift+Tab: switch tabs | h/l: prev/next feed | q: quit"))

	return contentStyle.Render(builder.String())
}

func (m model) viewFeedDetail() string {
	if m.selectedFeed == nil {
		return contentStyle.Render("Select a feed to view details.")
	}
	feed := m.selectedFeed
	builder := strings.Builder{}

	// Feed info section
	builder.WriteString(fmt.Sprintf("Category: %s | Owner: %s\n", feed.Category, feed.OwnerName))
	builder.WriteString(fmt.Sprintf("URL: %s\n", truncate(feed.URL, 80)))
	builder.WriteString(fmt.Sprintf("Event: %s\n", feed.EventName))
	builder.WriteString(fmt.Sprintf("Public: %v | Active: %v\n", feed.IsPublic, feed.IsActive))

	subStatus := lipgloss.NewStyle().Foreground(redColor).Render("not subscribed")
	if m.isSubscribed(feed.ID) {
		subStatus = lipgloss.NewStyle().Foreground(greenColor).Render("subscribed [ok]")
	}
	builder.WriteString(fmt.Sprintf("Status: %s | WS: %s\n", subStatus, m.wsStatus))

	builder.WriteString("\n")
	builder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(dimCyanColor).Render("Live data (latest first):"))
	builder.WriteString("\n")

	// Calculate available height for entries
	// Total height - info section (~7 lines) - footer (~2 lines) - borders (~4 lines)
	availableHeight := m.termHeight - 20
	if availableHeight < 5 {
		availableHeight = 5
	}

	entries := m.feedEntries[feed.ID]
	if len(entries) == 0 {
		builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("No data yet. Subscribe (s) or wait for updates."))
	} else {
		// Limit entries to available height
		showCount := availableHeight
		if len(entries) < showCount {
			showCount = len(entries)
		}
		for i := 0; i < showCount; i++ {
			e := entries[i]
			builder.WriteString(fmt.Sprintf("[%s] %s\n", e.Time.Format("15:04:05"), truncate(e.Data, 100)))
		}
		if len(entries) > showCount {
			builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render(fmt.Sprintf("  ... and %d more entries", len(entries)-showCount)))
		}
	}

	builder.WriteString("\n")
	builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("s: subscribe/unsubscribe | Esc: go back to My Feeds"))

	// Calculate box dimensions
	boxWidth := m.termWidth - 4
	if boxWidth > 120 {
		boxWidth = 120
	}
	boxHeight := m.termHeight - 10
	if boxHeight < 15 {
		boxHeight = 15
	}

	return renderBoxWithTitle(feed.Name, builder.String(), boxWidth, boxHeight, darkCyanColor, cyanColor)
}

func (m model) viewRegisterFeed() string {
	builder := strings.Builder{}
	builder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render("📝 Register New WebSocket Feed"))
	builder.WriteString("\n\n")

	labels := []string{
		"Feed Name *",
		"Description",
		"WebSocket URL *",
		"Category",
		"Event Name",
		"Subscription Message (JSON)",
		"AI System Prompt",
	}
	inputs := []*textinput.Model{
		&m.feedName,
		&m.feedDescription,
		&m.feedURL,
		&m.feedCategory,
		&m.feedEventName,
		&m.feedSubMsg,
		&m.feedSystemPrompt,
	}

	for i, label := range labels {
		labelStyle := lipgloss.NewStyle().Foreground(dimCyanColor)
		if i == m.feedFormFocus {
			labelStyle = lipgloss.NewStyle().Foreground(cyanColor).Bold(true)
		}
		builder.WriteString(labelStyle.Render(label + ": "))
		builder.WriteString(inputs[i].View())
		builder.WriteString("\n")
	}

	builder.WriteString("\n")
	builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("↑↓ navigate | Enter submit | Esc cancel | * required"))

	if m.loading {
		builder.WriteString("\n")
		builder.WriteString(fmt.Sprintf("%s Creating feed...", m.spinner.View()))
	}
	if m.errorMessage != "" {
		builder.WriteString("\n")
		builder.WriteString(lipgloss.NewStyle().Foreground(redColor).Render(m.errorMessage))
	}

	return contentStyle.Render(builder.String())
}

func (m model) viewEditFeed() string {
	builder := strings.Builder{}
	builder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render("✏️ Edit Feed"))
	builder.WriteString("\n\n")

	labels := []string{
		"Feed Name *",
		"Description",
		"WebSocket URL *",
		"Category",
		"Event Name",
		"Subscription Message (JSON)",
		"AI System Prompt",
	}
	inputs := []*textinput.Model{
		&m.feedName,
		&m.feedDescription,
		&m.feedURL,
		&m.feedCategory,
		&m.feedEventName,
		&m.feedSubMsg,
		&m.feedSystemPrompt,
	}

	for i, label := range labels {
		labelStyle := lipgloss.NewStyle().Foreground(dimCyanColor)
		if i == m.feedFormFocus {
			labelStyle = lipgloss.NewStyle().Foreground(cyanColor).Bold(true)
		}
		builder.WriteString(labelStyle.Render(label + ": "))
		builder.WriteString(inputs[i].View())
		builder.WriteString("\n")
	}

	builder.WriteString("\n")
	builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("↑↓ navigate | Enter save | Esc cancel | * required"))

	if m.loading {
		builder.WriteString("\n")
		builder.WriteString(fmt.Sprintf("%s Updating feed...", m.spinner.View()))
	}
	if m.errorMessage != "" {
		builder.WriteString("\n")
		builder.WriteString(lipgloss.NewStyle().Foreground(redColor).Render(m.errorMessage))
	}

	return contentStyle.Render(builder.String())
}

func (m model) viewAPI() string {
	builder := strings.Builder{}
	builder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render("API & Integration"))
	builder.WriteString("\n\n")
	builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Use these Feed IDs to subscribe via WebSocket or API."))
	builder.WriteString("\n\n")

	if len(m.feeds) == 0 {
		builder.WriteString("No feeds available. Register a feed first.")
	} else {
		// Table header
		builder.WriteString(lipgloss.NewStyle().Bold(true).Render(fmt.Sprintf("%-30s %-40s", "Feed Name", "Feed ID")))
		builder.WriteString("\n")
		builder.WriteString(strings.Repeat("-", 70))
		builder.WriteString("\n")

		for _, f := range m.feeds {
			builder.WriteString(fmt.Sprintf("%-30s %-40s\n", truncate(f.Name, 28), f.ID))
		}
	}

	builder.WriteString("\n\n")
	builder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render("WebSocket Subscription"))
	builder.WriteString("\n")
	builder.WriteString("Connect to: " + m.backendURL + "/ws")
	builder.WriteString("\n")
	builder.WriteString("Event: 'subscribe-feed' Payload: { \"feedId\": \"<FEED_ID>\" }")
	builder.WriteString("\n")
	builder.WriteString("Listen for: 'llm-broadcast' event for AI updates.")

	return contentStyle.Render(builder.String())
}

func (m model) viewHelp() string {
	// Define help pages content
	helpPages := []struct {
		title   string
		content string
	}{
		{
			title: "Getting Started",
			content: `Welcome to TurboStream TUI!

TurboStream is a real-time data streaming platform that allows you to 
subscribe to WebSocket feeds and get AI-powered analysis of incoming data.

NAVIGATION
----------
  Tab / Shift+Tab    Switch between tabs
  Arrow Keys         Navigate within views
  Enter              Select/Confirm
  Esc                Go back/Cancel
  q                  Quit application

TABS OVERVIEW
-------------
  Dashboard       View your subscribed feeds in real-time
  Register Feed   Create and register new WebSocket feeds  
  My Feeds        Manage your registered feeds
  Help            You are here! Documentation and guides

Use <- and -> arrow keys to navigate between help pages.`,
		},
		{
			title: "Dashboard",
			content: `DASHBOARD VIEW
==============

The Dashboard is your main view for monitoring real-time data streams.

LAYOUT
------
  Left Panel      List of your subscribed feeds
  Middle Panel    Live stream data from selected feed
  Right Panel     AI-powered analysis of the data

KEYBOARD SHORTCUTS
------------------
  Up/Down         Select different feed in sidebar

The Dashboard displays real-time streaming data from your subscribed feeds.`,
		},
		{
			title: "Register Feed",
			content: `REGISTERING A NEW FEED
======================

Create custom WebSocket feeds to stream data from any source.

REQUIRED FIELDS
---------------
  Feed Name *       A unique name for your feed
  WebSocket URL *   The WebSocket endpoint URL (wss:// or ws://)

OPTIONAL FIELDS
---------------
  Description       Brief description of what the feed provides
  Category          Category for organization (crypto, stocks, etc.)
  Event Name        Socket.io event name (if applicable)
  Subscription Msg  JSON message to send after connecting
  AI System Prompt  Custom prompt for AI analysis of this feed

EXAMPLE: CRYPTO FEED
--------------------
  Name: Bitcoin Price
  URL: wss://stream.binance.com:9443/ws/btcusdt@ticker
  Category: crypto
  AI Prompt: Analyze this cryptocurrency price data and identify trends

TIPS
----
  - Test your WebSocket URL before registering
  - Use descriptive names for easy identification
  - Set a good AI prompt for better analysis`,
		},
		{
			title: "My Feeds",
			content: `MANAGING YOUR FEEDS
===================

The My Feeds view shows all your registered feeds and their status,
with live data streaming and AI-powered analysis.

LAYOUT
------
  Left Panel      Feed list with subscription status
  Middle Panel    Live stream data from selected feed
  Right Panel     AI-powered analysis of the data

KEYBOARD SHORTCUTS
------------------
  Up/Down     Navigate feed list
  Enter       View feed details
  s           Subscribe/Unsubscribe to feed
  D           Delete selected feed (Shift+D)
  r           Reconnect WebSocket
  p           Open custom AI prompt input (per-feed)
  Shift+P     Pause/Resume AI Analysis
  Esc         Return from feed details

AI ANALYSIS
-----------
The AI panel provides intelligent insights about your data streams.
Press 'p' to enter a custom prompt for analysis.
Press 'Shift+P' to pause/resume AI queries for current feed.

Each feed has its own prompt - prompts are preserved when switching feeds.

The AI uses your feed's system prompt combined with recent data to 
generate contextual analysis and insights.

AI PROMPT TIPS
--------------
  - Be specific about what you want analyzed
  - Reference data fields in your prompt
  - Ask for trends, anomalies, or summaries

FEED DETAILS VIEW
-----------------
  Press Enter on a feed to see:
  - Full feed information and WebSocket URL
  - AI system prompt configuration
  - Recent data samples

  Press Esc to return to feed list

SUBSCRIPTIONS
-------------
  - Subscribe to feeds you want on your Dashboard
  - Subscribed feeds show data in real-time
  - You can have multiple active subscriptions`,
		},
		{
			title: "API & WebSockets",
			content: `API & WEBSOCKET INTEGRATION
===========================

TurboStream allows external applications to consume feed data and AI 
analysis in real-time via WebSockets.

STEP 1: CONNECT
---------------
  URL: ws://localhost:7210/ws
  
  In Postman: Enter URL and click "Connect"

STEP 2: SUBSCRIBE
-----------------
  Choose what data you want to receive:

  LLM Output Only (recommended for most use cases):
  {
    "type": "subscribe-llm",
    "payload": { "feedId": "<YOUR_FEED_ID>" }
  }

  Raw Feed Data Only:
  {
    "type": "subscribe-feed",
    "payload": { "feedId": "<YOUR_FEED_ID>" }
  }

  Both LLM + Raw Data:
  {
    "type": "subscribe-all",
    "payload": { "feedId": "<YOUR_FEED_ID>" }
  }

STEP 3: RECEIVE DATA
--------------------
  Based on your subscription, you'll receive:

  AI Analysis (llm-broadcast):
  {
    "type": "llm-broadcast",
    "payload": {
      "feedId": "...",
      "answer": "<AI analysis text>",
      "provider": "openai",
      "timestamp": "2025-12-24T..."
    }
  }

  Raw Feed Data (feed-data):
  {
    "type": "feed-data",
    "payload": { "feedId": "...", "data": {...} }
  }

UNSUBSCRIBE
-----------
  {
    "type": "unsubscribe-feed",
    "payload": { "feedId": "<YOUR_FEED_ID>" }
  }

Use the "API" tab to find your Feed IDs.`,
		},
		{
			title: "Tips & Tricks",
			content: `TIPS & TRICKS
=============

PERFORMANCE
-----------
  - Limit active subscriptions for better performance
  - Use specific AI prompts for more relevant analysis
  - Close unused feeds to reduce bandwidth

TROUBLESHOOTING
---------------
  Connection Issues:
  - Check your internet connection
  - Verify WebSocket URL is correct
  - Some feeds require authentication

  No Data Showing:
  - Ensure you're subscribed to the feed
  - Check if the feed requires a subscription message
  - Try reconnecting with 'r'

  AI Not Working:
  - Check your API keys in environment variables
  - Ensure you have API credits
  - Try a simpler prompt

KEYBOARD REFERENCE
------------------
  Global:
    Tab/Shift+Tab   Switch tabs
    q               Quit
    
  Dashboard & My Feeds:
    Up/Down         Navigate feed list
    i               Change AI interval
    m               Toggle AI auto/manual
    p               Custom AI prompt (per-feed)
    Shift+P         Pause/Resume AI
    r               Reconnect WebSocket
    
  My Feeds Only:
    s               Subscribe/Unsubscribe
    D               Delete feed (Shift+D)
    Enter           View feed details
    Esc             Back to list
    
  Help:
    Left/Right      Navigate pages
    Up/Down         Scroll content
    1-5             Jump to page`,
		},
	}

	// Ensure helpPage is in bounds
	if m.helpPage < 0 {
		m.helpPage = 0
	}
	if m.helpPage >= len(helpPages) {
		m.helpPage = len(helpPages) - 1
	}

	currentPage := helpPages[m.helpPage]

	// Build content
	builder := strings.Builder{}

	// Page navigation header
	navStyle := lipgloss.NewStyle().Foreground(dimCyanColor)
	pageIndicator := fmt.Sprintf("Page %d of %d", m.helpPage+1, len(helpPages))

	// Build page dots
	dots := ""
	for i := 0; i < len(helpPages); i++ {
		if i == m.helpPage {
			dots += lipgloss.NewStyle().Foreground(cyanColor).Render(" ● ")
		} else {
			dots += lipgloss.NewStyle().Foreground(dimCyanColor).Render(" ○ ")
		}
	}

	builder.WriteString(navStyle.Render(pageIndicator))
	builder.WriteString("  ")
	builder.WriteString(dots)
	builder.WriteString("\n\n")

	// Content with scroll support
	contentLines := strings.Split(currentPage.content, "\n")

	// Apply scroll offset
	startLine := m.helpScrollPos
	if startLine >= len(contentLines) {
		startLine = len(contentLines) - 1
	}
	if startLine < 0 {
		startLine = 0
	}

	// Calculate visible lines based on box height (reserve space for header and footer)
	visibleLines := m.termHeight - 16
	if visibleLines < 10 {
		visibleLines = 10
	}

	endLine := startLine + visibleLines
	if endLine > len(contentLines) {
		endLine = len(contentLines)
	}

	// Show scroll indicators
	if startLine > 0 {
		builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("  ▲ scroll up for more"))
		builder.WriteString("\n")
	}

	for _, line := range contentLines[startLine:endLine] {
		// Style headers (lines with === or ---)
		if strings.HasPrefix(line, "===") || strings.HasPrefix(line, "---") {
			builder.WriteString(lipgloss.NewStyle().Foreground(darkCyanColor).Render(line))
		} else if len(line) > 0 && line[0] != ' ' && strings.HasSuffix(strings.TrimSpace(line), ":") {
			// Section headers ending with :
			builder.WriteString(lipgloss.NewStyle().Foreground(cyanColor).Bold(true).Render(line))
		} else if strings.HasPrefix(strings.TrimSpace(line), "-") || strings.HasPrefix(strings.TrimSpace(line), "*") {
			// Bullet points
			builder.WriteString(lipgloss.NewStyle().Foreground(lipgloss.Color("#AAAAAA")).Render(line))
		} else {
			builder.WriteString(lipgloss.NewStyle().Foreground(lipgloss.Color("#DDDDDD")).Render(line))
		}
		builder.WriteString("\n")
	}

	// Show scroll down indicator if there's more content
	if endLine < len(contentLines) {
		builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("  ▼ scroll down for more"))
		builder.WriteString("\n")
	}

	// Navigation hint at bottom
	builder.WriteString("\n")
	navHint := "<- -> navigate pages | Tab switch tabs | q quit"
	builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render(navHint))

	// Render in a box
	boxWidth := m.termWidth - 4
	if boxWidth > 100 {
		boxWidth = 100
	}
	boxHeight := m.termHeight - 10
	if boxHeight < 20 {
		boxHeight = 20
	}

	return renderBoxWithTitle(currentPage.title, builder.String(), boxWidth, boxHeight, darkCyanColor, cyanColor)
}

func (m model) viewFooter() string {
	if m.errorMessage != "" {
		return lipgloss.NewStyle().Foreground(redColor).Render(m.errorMessage)
	}
	if m.statusMessage != "" {
		return lipgloss.NewStyle().Foreground(dimCyanColor).Render(m.statusMessage)
	}
	return ""
}

func (m model) isSubscribed(feedID string) bool {
	for _, s := range m.subs {
		if s.FeedID == feedID {
			return true
		}
	}
	return false
}

func (m model) userAgent() string {
	return "TurboStream TUI"
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-1] + "…"
}

func wrapText(s string, width int) string {
	if width <= 0 {
		return s
	}
	var result strings.Builder
	words := strings.Fields(s)
	lineLen := 0
	for i, word := range words {
		wordLen := len(word)
		if lineLen+wordLen+1 > width && lineLen > 0 {
			result.WriteString("\n")
			lineLen = 0
		}
		if lineLen > 0 {
			result.WriteString(" ")
			lineLen++
		}
		result.WriteString(word)
		lineLen += wordLen
		_ = i
	}
	return result.String()
}

func (m model) nextWSListen() tea.Cmd {
	if m.wsClient == nil {
		return nil
	}
	return m.wsClient.ListenCmd()
}

// ---- Commands ----

func loginCmd(client *api.Client, email, password, totp string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		token, user, err := client.Login(ctx, email, password, totp)
		return authResultMsg{Token: token, User: user, Err: err}
	}
}

func registerCmd(client *api.Client, email, password, name string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		token, user, err := client.Register(ctx, email, password, name)
		return authResultMsg{Token: token, User: user, Err: err}
	}
}

func fetchMeCmd(client *api.Client) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()
		user, err := client.Me(ctx)
		return meResultMsg{User: user, Err: err}
	}
}

func loadInitialDataCmd(client *api.Client) tea.Cmd {
	return tea.Batch(loadFeedsCmd(client), loadSubscriptionsCmd(client))
}

func loadFeedsCmd(client *api.Client) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		feeds, err := client.MyFeeds(ctx)
		return feedsMsg{Feeds: feeds, Err: err}
	}
}

func loadSubscriptionsCmd(client *api.Client) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		subs, err := client.Subscriptions(ctx)
		return subsMsg{Subs: subs, Err: err}
	}
}

func fetchFeedCmd(client *api.Client, id string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		feed, err := client.Feed(ctx, id)
		return feedDetailMsg{Feed: feed, Err: err}
	}
}

func subscribeCmd(client *api.Client, feedID, userID string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()
		err := client.Subscribe(ctx, feedID)
		if err == nil && client.Token() != "" {
			// Best-effort websocket subscribe.
		}
		return subscribeResultMsg{FeedID: feedID, Action: "subscribe", Err: err}
	}
}

func unsubscribeCmd(client *api.Client, feedID string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()
		err := client.Unsubscribe(ctx, feedID)
		return subscribeResultMsg{FeedID: feedID, Action: "unsubscribe", Err: err}
	}
}

func connectWS(url, userID, userAgent string) tea.Cmd {
	return func() tea.Msg {
		client, err := dialWS(url, userID, userAgent)
		return wsConnectedMsg{Client: client, Err: err}
	}
}

func createFeedCmd(client *api.Client, name, description, url, category, eventName, subMsg, systemPrompt string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		feed, err := client.CreateFeed(ctx, name, description, url, category, eventName, subMsg, systemPrompt)
		return feedCreateMsg{Feed: feed, Err: err}
	}
}

func updateFeedCmd(client *api.Client, feedID string, updates map[string]interface{}) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		feed, err := client.UpdateFeed(ctx, feedID, updates)
		return feedUpdateMsg{Feed: feed, Err: err}
	}
}

func deleteFeedCmd(client *api.Client, feedID string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		err := client.DeleteFeed(ctx, feedID)
		return feedDeleteMsg{FeedID: feedID, Err: err}
	}
}

// AI interval options in seconds
var aiIntervalOptions = []int{5, 10, 30, 60}

// getOrCreatePrompt gets the prompt for a feed, creating a new one if it doesn't exist
// NOTE: Uses pointer receiver to allow modification
func (m *model) getOrCreatePrompt(feedID string) textarea.Model {
	if prompt, ok := m.aiPrompts[feedID]; ok {
		return prompt
	}
	// Create new prompt for this feed
	newPrompt := textarea.New()
	newPrompt.Placeholder = "Enter a prompt to start AI analysis..."
	newPrompt.SetWidth(50)
	newPrompt.SetHeight(3)
	newPrompt.ShowLineNumbers = false
	newPrompt.Prompt = "" // Remove default > prefix since we add our own
	m.aiPrompts[feedID] = newPrompt
	return newPrompt
}

// getPrompt returns the prompt for a feed if it exists, or creates a default view-only version
// NOTE: Uses value receiver for view functions - does NOT persist new prompts
func (m model) getPrompt(feedID string) textarea.Model {
	if prompt, ok := m.aiPrompts[feedID]; ok {
		return prompt
	}
	// Return a new prompt for display purposes only
	newPrompt := textarea.New()
	newPrompt.Placeholder = "Enter a prompt to start AI analysis..."
	newPrompt.SetWidth(50)
	newPrompt.SetHeight(3)
	newPrompt.ShowLineNumbers = false
	return newPrompt
}

// sendAIQuery sends a query to the LLM via WebSocket for the currently selected feed
// NOTE: Caller must set m.aiLoading, m.aiRequestID, and clear m.aiResponse before calling
func (m model) sendAIQuery() tea.Cmd {
	if m.wsClient == nil || m.selectedFeed == nil {
		return func() tea.Msg {
			return aiResponseMsg{RequestID: m.aiRequestID, Err: fmt.Errorf("not connected or no feed selected")}
		}
	}
	return m.sendAIQueryForFeed(m.selectedFeed.ID, m.aiRequestID)
}

// sendAIQueryForFeed sends a query to the LLM via WebSocket for a specific feed
func (m model) sendAIQueryForFeed(feedID, requestID string) tea.Cmd {
	if m.wsClient == nil {
		return func() tea.Msg {
			return aiResponseMsg{RequestID: requestID, Err: fmt.Errorf("not connected")}
		}
	}

	// Check if paused - return nil (no-op) instead of error
	if m.aiPaused[feedID] {
		return nil
	}

	// Get per-feed prompt
	prompt := ""
	if feedPrompt, ok := m.aiPrompts[feedID]; ok {
		prompt = feedPrompt.Value()
	}

	// If prompt is empty, do not send query (user must enter a prompt first)
	if prompt == "" {
		return nil
	}

	// Find feed to get system prompt
	systemPrompt := ""
	for _, f := range m.feeds {
		if f.ID == feedID {
			systemPrompt = f.SystemPrompt
			break
		}
	}

	wsClient := m.wsClient

	return func() tea.Msg {
		err := wsClient.SendLLMQuery(feedID, prompt, systemPrompt, requestID)
		if err != nil {
			return aiResponseMsg{RequestID: requestID, Err: err}
		}
		return nil
	}
}

// startAIAutoQuery starts the auto-query ticker
func (m model) startAIAutoQuery() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg { return aiTickMsg{} })
}

// ---- Helpers ----

func getenvDefault(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
