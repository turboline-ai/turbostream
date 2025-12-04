package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/textinput"
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
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(cyanColor).
			MarginBottom(1)

	headerStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(brightCyanColor).
			Background(darkGrayColor).
			Padding(0, 2).
			MarginBottom(1)

	boxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(darkCyanColor).
			Padding(1, 2)

	selectedItemStyle = lipgloss.NewStyle().
				Foreground(brightCyanColor).
				Bold(true)

	normalItemStyle = lipgloss.NewStyle().
			Foreground(grayColor)

	statusBarStyle = lipgloss.NewStyle().
			Foreground(dimCyanColor).
			Background(darkGrayColor).
			Padding(0, 1)

	errorStyle = lipgloss.NewStyle().
			Foreground(redColor).
			Bold(true)

	successStyle = lipgloss.NewStyle().
			Foreground(greenColor).
			Bold(true)

	labelStyle = lipgloss.NewStyle().
			Foreground(cyanColor).
			Bold(true)

	helpStyle = lipgloss.NewStyle().
			Foreground(dimCyanColor)

	contentStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(darkCyanColor).
			Padding(1, 2).
			Width(100)
)

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
	screenFeeds
)

// Tab indices for main navigation
const (
	tabDashboard = iota
	tabRegisterFeed
	tabMyFeeds
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
	tokenUsageUpdateMsg struct {
		Usage *api.TokenUsage
	}
	feedCreateMsg struct {
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

	// AI Analysis panel
	aiPrompt      textinput.Model
	aiAutoMode    bool      // true = auto query at interval, false = manual
	aiInterval    int       // seconds between auto queries (5, 10, 30, 60)
	aiIntervalIdx int       // index into interval options
	aiResponse    string    // latest AI response
	aiLoading     bool      // whether AI query is in progress
	aiLastQuery   time.Time // last query time
	aiFocused     bool      // whether AI panel is focused for editing
	aiRequestID   string    // track current request
	aiStartTime   time.Time // when the current request started
	aiFirstToken  time.Time // when first token was received (for TTFT)

	// Observability dashboard
	metricsCollector      *MetricsCollector
	dashboardMetrics      DashboardMetrics
	dashboardSelectedFeed int // Selected feed index in dashboard

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
	if err := p.Start(); err != nil {
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

	// AI prompt input
	aiPrompt := textinput.New()
	aiPrompt.Placeholder = "Ask about the streaming data..."
	aiPrompt.CharLimit = 500
	aiPrompt.Width = 50

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
		aiPrompt:      aiPrompt,
		aiAutoMode:    false,
		aiInterval:    10,
		aiIntervalIdx: 1, // 10 seconds default
		aiResponse:    "",
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
		if len(entries) > 50 {
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
		return m, loadFeedsCmd(m.client)

	case aiResponseMsg:
		m.aiLoading = false
		if msg.Err != nil {
			m.aiResponse = "Error: " + msg.Err.Error()
			// Record LLM error in metrics
			if m.selectedFeed != nil {
				m.metricsCollector.RecordLLMRequest(m.selectedFeed.ID, 0, 0, 0, 0, 0, true)
			}
			return m, m.nextWSListen()
		}
		if msg.RequestID == m.aiRequestID {
			m.aiResponse = msg.Answer
			m.statusMessage = fmt.Sprintf("AI response received (%s, %dms)", msg.Provider, msg.Duration)
			// Record LLM metrics (estimate tokens: 1 token ≈ 4 chars)
			if m.selectedFeed != nil {
				promptTokens := len(m.aiPrompt.Value()) / 4
				responseTokens := len(msg.Answer) / 4
				eventsInPrompt := len(m.feedEntries[m.selectedFeed.ID])

				// Calculate TTFT and generation time
				var ttftMs, genTimeMs float64
				if !m.aiFirstToken.IsZero() && !m.aiStartTime.IsZero() {
					ttftMs = float64(m.aiFirstToken.Sub(m.aiStartTime).Milliseconds())
				}
				if !m.aiStartTime.IsZero() {
					genTimeMs = float64(time.Since(m.aiStartTime).Milliseconds())
				}

				m.metricsCollector.RecordLLMRequest(m.selectedFeed.ID, promptTokens, responseTokens, ttftMs, genTimeMs, eventsInPrompt, false)
			}
		}
		return m, m.nextWSListen()

	case aiTokenMsg:
		// Streaming token - append to response
		if msg.RequestID == m.aiRequestID {
			// Track first token time for TTFT
			if m.aiFirstToken.IsZero() && len(msg.Token) > 0 {
				m.aiFirstToken = time.Now()
			}
			m.aiResponse += msg.Token
			m.aiLoading = true // Keep showing loading while streaming
		}
		return m, m.nextWSListen()

	case aiTickMsg:
		// Auto-query tick
		if m.aiAutoMode && m.selectedFeed != nil && m.isSubscribed(m.selectedFeed.ID) {
			// Check if enough time has passed
			if time.Since(m.aiLastQuery) >= time.Duration(m.aiInterval)*time.Second {
				m.aiLastQuery = time.Now()
				m.aiLoading = true
				m.aiRequestID = fmt.Sprintf("req-%d", time.Now().UnixNano())
				m.aiStartTime = time.Now()
				m.aiFirstToken = time.Time{} // Reset first token time
				m.aiResponse = ""
				return m, tea.Batch(m.sendAIQuery(), m.nextWSListen(), tea.Tick(time.Second, func(t time.Time) tea.Msg { return aiTickMsg{} }))
			}
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
	switch msg.String() {
	case "ctrl+c", "q":
		if m.wsClient != nil {
			m.wsClient.Close()
		}
		return m, tea.Quit
	}

	if m.screen == screenLogin {
		return m.updateAuth(msg)
	}

	// Handle tab switching globally (except on login screen)
	switch msg.String() {
	case "tab":
		// Cycle through tabs: Dashboard -> Register Feed -> My Feeds
		m.activeTab = (m.activeTab + 1) % tabCount
		switch m.activeTab {
		case tabDashboard:
			m.screen = screenDashboard
		case tabRegisterFeed:
			m.screen = screenRegisterFeed
			m.feedName.Focus()
			m.feedFormFocus = 0
		case tabMyFeeds:
			m.screen = screenFeeds
		}
		return m, nil
	case "shift+tab":
		// Cycle backwards through tabs
		m.activeTab--
		if m.activeTab < 0 {
			m.activeTab = tabCount - 1
		}
		switch m.activeTab {
		case tabDashboard:
			m.screen = screenDashboard
		case tabRegisterFeed:
			m.screen = screenRegisterFeed
			m.feedName.Focus()
			m.feedFormFocus = 0
		case tabMyFeeds:
			m.screen = screenFeeds
		}
		return m, nil
	}

	// Handle screen-specific key handling
	if m.screen == screenRegisterFeed {
		return m.updateRegisterFeed(msg)
	}

	// Handle AI prompt input when focused
	if m.aiFocused {
		switch msg.String() {
		case "esc":
			m.aiFocused = false
			m.aiPrompt.Blur()
			return m, nil
		case "enter":
			// Submit query and exit edit mode
			m.aiFocused = false
			m.aiPrompt.Blur()
			if len(m.feeds) > 0 && m.selectedIdx < len(m.feeds) {
				feed := m.feeds[m.selectedIdx]
				if m.isSubscribed(feed.ID) {
					m.selectedFeed = &feed
					m.aiLoading = true
					m.aiRequestID = fmt.Sprintf("req-%d", time.Now().UnixNano())
					m.aiStartTime = time.Now()
					m.aiFirstToken = time.Time{} // Reset first token time
					m.aiResponse = ""
					return m, tea.Batch(m.sendAIQuery(), m.nextWSListen())
				}
			}
			return m, nil
		default:
			var cmd tea.Cmd
			m.aiPrompt, cmd = m.aiPrompt.Update(msg)
			return m, cmd
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
	case "a":
		// Send AI query (only on My Feeds screen with a subscribed feed)
		if m.screen == screenFeeds && !m.aiFocused {
			if len(m.feeds) > 0 && m.selectedIdx < len(m.feeds) {
				feed := m.feeds[m.selectedIdx]
				if m.isSubscribed(feed.ID) {
					m.selectedFeed = &feed
					m.aiLoading = true
					m.aiRequestID = fmt.Sprintf("req-%d", time.Now().UnixNano())
					m.aiStartTime = time.Now()
					m.aiFirstToken = time.Time{} // Reset first token time
					m.aiResponse = ""
					return m, tea.Batch(m.sendAIQuery(), m.nextWSListen())
				} else {
					m.statusMessage = "Subscribe to feed first to use AI analysis"
				}
			}
		}
	case "m":
		// Toggle AI mode (auto/manual)
		if m.screen == screenFeeds && !m.aiFocused {
			m.aiAutoMode = !m.aiAutoMode
			if m.aiAutoMode {
				m.statusMessage = fmt.Sprintf("AI Auto mode enabled (every %ds)", m.aiInterval)
				m.aiLastQuery = time.Now()
				return m, m.startAIAutoQuery()
			} else {
				m.statusMessage = "AI Manual mode enabled"
			}
		}
	case "i":
		// Cycle AI interval (only on My Feeds screen)
		if m.screen == screenFeeds && !m.aiFocused {
			m.aiIntervalIdx = (m.aiIntervalIdx + 1) % len(aiIntervalOptions)
			m.aiInterval = aiIntervalOptions[m.aiIntervalIdx]
			m.statusMessage = fmt.Sprintf("AI query interval set to %ds", m.aiInterval)
		}
	case "p":
		// Toggle AI prompt editing
		if m.screen == screenFeeds {
			m.aiFocused = !m.aiFocused
			if m.aiFocused {
				m.aiPrompt.Focus()
			} else {
				m.aiPrompt.Blur()
			}
		}
	case "esc":
		// Exit AI prompt editing
		if m.aiFocused {
			m.aiFocused = false
			m.aiPrompt.Blur()
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
	var cmd tea.Cmd
	m.email, cmd = m.email.Update(msg)
	cmds = append(cmds, cmd)
	m.password, cmd = m.password.Update(msg)
	cmds = append(cmds, cmd)
	m.totp, cmd = m.totp.Update(msg)
	cmds = append(cmds, cmd)
	m.name, cmd = m.name.Update(msg)
	cmds = append(cmds, cmd)
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
	tabs := []string{"Dashboard", "Register Feed", "My Feeds"}
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
	case screenFeeds:
		return m.viewMyFeeds()
	default:
		return ""
	}
}

func (m model) viewMyFeeds() string {
	if len(m.feeds) == 0 {
		builder := strings.Builder{}
		builder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render("📡 My Feeds"))
		builder.WriteString("\n\n")
		builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("No feeds registered yet. Use 'Register Feed' tab to add a WebSocket feed!"))
		return contentStyle.Render(builder.String())
	}

	// Feed list section (top-left)
	feedListBuilder := strings.Builder{}
	feedListBuilder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render("📡 My Feeds"))
	feedListBuilder.WriteString("\n\n")

	for i, f := range m.feeds {
		cursor := "  "
		style := lipgloss.NewStyle()
		if i == m.selectedIdx {
			cursor = lipgloss.NewStyle().Foreground(cyanColor).Render("▶ ")
			style = style.Foreground(brightCyanColor)
		}
		subscribed := ""
		if m.isSubscribed(f.ID) {
			subscribed = lipgloss.NewStyle().Foreground(greenColor).Render(" ✓")
		}
		line := fmt.Sprintf("%s%s [%s]%s", cursor, truncate(f.Name, 22), f.Category, subscribed)
		feedListBuilder.WriteString(style.Render(line))
		feedListBuilder.WriteString("\n")
	}

	feedListBox := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(darkCyanColor).
		Padding(1, 2).
		Width(35).
		Height(12).
		Render(feedListBuilder.String())

	// Instructions section (bottom-left)
	instructBuilder := strings.Builder{}
	instructBuilder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(magentaColor).Render("📖 Instructions"))
	instructBuilder.WriteString("\n\n")
	instructBuilder.WriteString(lipgloss.NewStyle().Foreground(brightCyanColor).Render("Navigation"))
	instructBuilder.WriteString("\n")
	instructBuilder.WriteString("  ↑/↓      Select feed\n")
	instructBuilder.WriteString("  Tab      Next tab\n")
	instructBuilder.WriteString("  Shift+Tab Previous tab\n")
	instructBuilder.WriteString("\n")
	instructBuilder.WriteString(lipgloss.NewStyle().Foreground(brightCyanColor).Render("Actions"))
	instructBuilder.WriteString("\n")
	instructBuilder.WriteString("  s        Sub/Unsub\n")
	instructBuilder.WriteString("  r        Reconnect to WS\n")
	instructBuilder.WriteString("  Shift+D  Delete my feed\n")
	instructBuilder.WriteString("  l        Logout\n")
	instructBuilder.WriteString("  q        Quit\n")

	instructBox := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(darkMagentaColor).
		Padding(1, 2).
		Width(35).
		Render(instructBuilder.String())

	// Left column: Feed list + Instructions
	leftColumn := lipgloss.JoinVertical(lipgloss.Left, feedListBox, instructBox)

	// Right column: Feed Info + Live Stream
	rightBuilder := strings.Builder{}

	if m.selectedIdx < len(m.feeds) {
		feed := m.feeds[m.selectedIdx]

		// Feed Info Box (top-right)
		infoBuilder := strings.Builder{}
		infoBuilder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render(fmt.Sprintf("📋 %s", feed.Name)))
		infoBuilder.WriteString("\n\n")
		infoBuilder.WriteString(fmt.Sprintf("Category: %s\n", feed.Category))
		infoBuilder.WriteString(fmt.Sprintf("URL: %s\n", truncate(feed.URL, 50)))
		if feed.EventName != "" {
			infoBuilder.WriteString(fmt.Sprintf("Event: %s\n", feed.EventName))
		}

		subStatus := lipgloss.NewStyle().Foreground(redColor).Render("● Not Subscribed")
		if m.isSubscribed(feed.ID) {
			subStatus = lipgloss.NewStyle().Foreground(greenColor).Render("● Subscribed")
		}
		infoBuilder.WriteString(fmt.Sprintf("Status: %s\n", subStatus))
		infoBuilder.WriteString(fmt.Sprintf("WS: %s", m.wsStatus))

		infoBox := lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(darkCyanColor).
			Padding(1, 2).
			Width(60).
			Render(infoBuilder.String())

		// Live Stream Box (bottom-right)
		streamBuilder := strings.Builder{}
		streamBuilder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render("📺 Live Stream"))
		streamBuilder.WriteString("\n\n")

		entries := m.feedEntries[feed.ID]
		if len(entries) == 0 {
			if m.wsStatus != "connected" {
				streamBuilder.WriteString(lipgloss.NewStyle().Foreground(redColor).Render("⚠ WebSocket not connected\n"))
				streamBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Reconnecting..."))
			} else if !m.isSubscribed(feed.ID) {
				streamBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Press 's' to subscribe and start streaming..."))
			} else {
				streamBuilder.WriteString(lipgloss.NewStyle().Foreground(greenColor).Render("● Connected & Subscribed\n"))
				streamBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Waiting for data from WebSocket..."))
			}
		} else {
			// Show latest entries (up to 10)
			showCount := 10
			if len(entries) < showCount {
				showCount = len(entries)
			}
			for i := 0; i < showCount; i++ {
				e := entries[i]
				timestamp := lipgloss.NewStyle().Foreground(dimCyanColor).Render(e.Time.Format("15:04:05"))
				streamBuilder.WriteString(fmt.Sprintf("%s %s\n", timestamp, truncate(e.Data, 70)))
			}
		}

		streamBox := lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(darkCyanColor).
			Padding(1, 2).
			Width(55).
			Height(12).
			Render(streamBuilder.String())

		// AI Analysis Box (right column)
		aiBuilder := strings.Builder{}
		aiTitle := "🤖 AI Analysis"
		if m.aiFocused {
			aiTitle = "🤖 AI Analysis (editing)"
		}
		aiBuilder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(magentaColor).Render(aiTitle))
		aiBuilder.WriteString("\n\n")

		// Mode toggle
		modeLabel := "Manual"
		if m.aiAutoMode {
			modeLabel = fmt.Sprintf("Auto (%ds)", m.aiInterval)
		}
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Mode: "))
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(brightCyanColor).Render(modeLabel))
		aiBuilder.WriteString("\n\n")

		// Prompt input
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Prompt:"))
		aiBuilder.WriteString("\n")
		if m.aiFocused {
			aiBuilder.WriteString(m.aiPrompt.View())
		} else {
			promptVal := m.aiPrompt.Value()
			if promptVal == "" {
				promptVal = "(default: Analyze the data)"
			}
			aiBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render(truncate(promptVal, 40)))
		}
		aiBuilder.WriteString("\n\n")

		// Response
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("Response:"))
		aiBuilder.WriteString("\n")
		if m.aiLoading {
			aiBuilder.WriteString(lipgloss.NewStyle().Foreground(magentaColor).Render("⏳ Querying LLM..."))
		} else if m.aiResponse != "" {
			// Word wrap the response
			wrapped := wrapText(m.aiResponse, 38)
			lines := strings.Split(wrapped, "\n")
			maxLines := 8
			if len(lines) > maxLines {
				lines = lines[:maxLines]
				lines = append(lines, "...")
			}
			aiBuilder.WriteString(lipgloss.NewStyle().Foreground(whiteColor).Render(strings.Join(lines, "\n")))
		} else {
			aiBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("No response yet.\nPress 'a' to query AI."))
		}

		// AI Controls hint
		aiBuilder.WriteString("\n\n")
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(darkMagentaColor).Render("─────────────────────"))
		aiBuilder.WriteString("\n")
		aiBuilder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("a: query | m: mode | i: interval | p: edit prompt"))

		aiBox := lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(darkMagentaColor).
			Padding(1, 2).
			Width(45).
			Height(22).
			Render(aiBuilder.String())

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

	builder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render("📊 Observability Dashboard"))
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

	builder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render(fmt.Sprintf("📡 %s", feed.Name)))
	builder.WriteString("\n\n")

	builder.WriteString(fmt.Sprintf("Category: %s | Owner: %s\n", feed.Category, feed.OwnerName))
	builder.WriteString(fmt.Sprintf("URL: %s\n", feed.URL))
	builder.WriteString(fmt.Sprintf("Event: %s\n", feed.EventName))
	builder.WriteString(fmt.Sprintf("Public: %v | Active: %v\n", feed.IsPublic, feed.IsActive))

	subStatus := lipgloss.NewStyle().Foreground(redColor).Render("not subscribed")
	if m.isSubscribed(feed.ID) {
		subStatus = lipgloss.NewStyle().Foreground(greenColor).Render("subscribed ✓")
	}
	builder.WriteString(fmt.Sprintf("Status: %s | WS: %s\n", subStatus, m.wsStatus))

	builder.WriteString("\n")
	builder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(dimCyanColor).Render("Live data (latest first):"))
	builder.WriteString("\n")

	entries := m.feedEntries[feed.ID]
	if len(entries) == 0 {
		builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("No data yet. Subscribe (s) or wait for updates."))
	} else {
		for _, e := range entries {
			builder.WriteString(fmt.Sprintf("[%s] %s\n", e.Time.Format("15:04:05"), truncate(e.Data, 120)))
		}
	}

	builder.WriteString("\n")
	builder.WriteString(lipgloss.NewStyle().Foreground(dimCyanColor).Render("s to subscribe/unsubscribe | Esc to go back"))

	return contentStyle.Render(builder.String())
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
		feeds, err := client.ListFeeds(ctx)
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

// sendAIQuery sends a query to the LLM via WebSocket
// NOTE: Caller must set m.aiLoading, m.aiRequestID, and clear m.aiResponse before calling
func (m model) sendAIQuery() tea.Cmd {
	if m.wsClient == nil || m.selectedFeed == nil {
		return func() tea.Msg {
			return aiResponseMsg{RequestID: m.aiRequestID, Err: fmt.Errorf("not connected or no feed selected")}
		}
	}

	prompt := m.aiPrompt.Value()
	if prompt == "" {
		prompt = "Analyze the recent data and provide insights"
	}

	feedID := m.selectedFeed.ID
	systemPrompt := m.selectedFeed.SystemPrompt
	requestID := m.aiRequestID
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
