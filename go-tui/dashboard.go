package main

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Dashboard panel styles
var (
	summaryBarStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(whiteColor).
			Background(lipgloss.Color("#1a1a2e")).
			Padding(0, 2).
			MarginBottom(1)

	metricLabelStyle = lipgloss.NewStyle().
				Foreground(dimCyanColor)

	metricValueStyle = lipgloss.NewStyle().
				Foreground(whiteColor).
				Bold(true)

	goodValueStyle = lipgloss.NewStyle().
			Foreground(greenColor).
			Bold(true)

	warnValueStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FFD700")).
			Bold(true)

	badValueStyle = lipgloss.NewStyle().
			Foreground(redColor).
			Bold(true)

	// Sparkline character styles
	sparklineChars = []string{"▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"}

	sparklineGreenStyle  = lipgloss.NewStyle().Foreground(greenColor)
	sparklineCyanStyle   = lipgloss.NewStyle().Foreground(cyanColor)
	sparklineYellowStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#F1C40F"))
	sparklineRedStyle    = lipgloss.NewStyle().Foreground(redColor)
)

// renderSparkline renders a sparkline chart from data values
// width determines how many of the most recent values to show
// invertColor: if true, higher values are red (bad), if false, higher values are green (good)
func renderSparkline(data []float64, width int, invertColor bool) string {
	if len(data) == 0 {
		return strings.Repeat("▁", width)
	}

	// Take most recent 'width' values
	start := 0
	if len(data) > width {
		start = len(data) - width
	}
	values := data[start:]

	// Find min/max for scaling
	minVal, maxVal := values[0], values[0]
	for _, v := range values {
		if v < minVal {
			minVal = v
		}
		if v > maxVal {
			maxVal = v
		}
	}

	// Build sparkline
	var sb strings.Builder
	for _, v := range values {
		// Normalize to 0-7 (8 levels)
		level := 0
		if maxVal > minVal {
			level = int((v - minVal) / (maxVal - minVal) * 7)
		}
		if level > 7 {
			level = 7
		}
		if level < 0 {
			level = 0
		}

		char := sparklineChars[level]

		// Color based on level and invertColor setting
		var style lipgloss.Style
		if invertColor {
			// For latency: high = red (bad)
			switch {
			case level >= 6:
				style = sparklineRedStyle
			case level >= 4:
				style = sparklineYellowStyle
			default:
				style = sparklineGreenStyle
			}
		} else {
			// For throughput: high = green (good)
			switch {
			case level >= 6:
				style = sparklineGreenStyle
			case level >= 4:
				style = sparklineCyanStyle
			default:
				style = sparklineYellowStyle
			}
		}

		sb.WriteString(style.Render(char))
	}

	// Pad with empty bars if not enough data
	for i := len(values); i < width; i++ {
		sb.WriteString(lipgloss.NewStyle().Foreground(grayColor).Render("▁"))
	}

	return sb.String()
}

// humanizeBytes converts bytes to human-readable format
func humanizeBytes(bytes uint64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
	)

	switch {
	case bytes >= GB:
		return fmt.Sprintf("%.2f GB", float64(bytes)/GB)
	case bytes >= MB:
		return fmt.Sprintf("%.2f MB", float64(bytes)/MB)
	case bytes >= KB:
		return fmt.Sprintf("%.2f KB", float64(bytes)/KB)
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}

// humanizeBytesInt converts int bytes to human-readable format
func humanizeBytesInt(bytes int) string {
	// Prevent integer overflow: handle negative values
	if bytes < 0 {
		return "0 B"
	}
	return humanizeBytes(uint64(bytes))
}

// humanizeDuration converts seconds to human-readable duration
func humanizeDuration(seconds float64) string {
	if seconds < 60 {
		return fmt.Sprintf("%.1fs", seconds)
	} else if seconds < 3600 {
		return fmt.Sprintf("%.1fm", seconds/60)
	} else if seconds < 86400 {
		return fmt.Sprintf("%.1fh", seconds/3600)
	}
	return fmt.Sprintf("%.1fd", seconds/86400)
}

// colorByThreshold returns appropriate style based on thresholds
func colorByThreshold(value, warnThreshold, badThreshold float64, inverted bool) lipgloss.Style {
	if inverted {
		if value >= badThreshold {
			return goodValueStyle
		} else if value >= warnThreshold {
			return warnValueStyle
		}
		return badValueStyle
	}

	if value >= badThreshold {
		return badValueStyle
	} else if value >= warnThreshold {
		return warnValueStyle
	}
	return goodValueStyle
}

// renderMetric renders a single metric line
func renderMetric(label string, value string) string {
	return metricLabelStyle.Render(label+": ") + metricValueStyle.Render(value)
}

// renderColoredMetric renders a metric with conditional coloring
func renderColoredMetric(label string, value string, style lipgloss.Style) string {
	return metricLabelStyle.Render(label+": ") + style.Render(value)
}

// renderPanel renders a titled panel with title embedded in the top border
func renderPanel(title string, content string, width int) string {
	// Build custom top border with embedded title
	// Format: ╭─ Title ─────────────╮
	titleText := " " + title + " "
	border := lipgloss.RoundedBorder()

	// Calculate remaining dashes needed
	// width - 2 (corners) - len(titleText) - 1 (initial dash)
	remainingWidth := width - 3 - len(titleText)
	if remainingWidth < 0 {
		remainingWidth = 0
	}

	// Render content with side and bottom borders only
	contentLines := strings.Split(content, "\n")
	var result strings.Builder

	// Add styled top border with title
	result.WriteString(lipgloss.NewStyle().Foreground(darkCyanColor).Render(border.TopLeft + border.Top))
	result.WriteString(lipgloss.NewStyle().Bold(true).Foreground(brightCyanColor).Render(titleText))
	result.WriteString(lipgloss.NewStyle().Foreground(darkCyanColor).Render(strings.Repeat(border.Top, remainingWidth) + border.TopRight))
	result.WriteString("\n")

	// Add content lines with side borders
	innerWidth := width - 4 // account for borders and padding
	for _, line := range contentLines {
		// Pad line to fill width
		paddedLine := line
		lineLen := lipgloss.Width(line)
		if lineLen < innerWidth {
			paddedLine = line + strings.Repeat(" ", innerWidth-lineLen)
		}
		result.WriteString(lipgloss.NewStyle().Foreground(darkCyanColor).Render(border.Left))
		result.WriteString(" " + paddedLine + " ")
		result.WriteString(lipgloss.NewStyle().Foreground(darkCyanColor).Render(border.Right))
		result.WriteString("\n")
	}

	// Add bottom border
	result.WriteString(lipgloss.NewStyle().Foreground(darkCyanColor).Render(border.BottomLeft + strings.Repeat(border.Bottom, width-2) + border.BottomRight))

	return result.String()
}

// renderDashboardView renders the complete observability dashboard for a feed
func renderDashboardView(dm DashboardMetrics, termWidth, termHeight int) string {
	if len(dm.Feeds) == 0 {
		return renderNoFeeds(termWidth)
	}

	// Ensure selected index is valid
	if dm.SelectedIdx < 0 || dm.SelectedIdx >= len(dm.Feeds) {
		dm.SelectedIdx = 0
	}

	fm := dm.Feeds[dm.SelectedIdx]

	// Sidebar width for feed list
	sidebarWidth := 22
	contentWidth := termWidth - sidebarWidth - 3 // 3 for spacing

	// Account for top bar (1), tab bar (~3), footer (~2), and dashboard chrome (~4)
	// Render feed sidebar (vertical list)
	sidebar := renderFeedSidebar(dm, sidebarWidth, termHeight-10)

	// Build main content area
	var contentBuilder strings.Builder

	// Header
	statusIcon := "●"
	statusStyle := goodValueStyle
	if !fm.WSConnected {
		statusStyle = badValueStyle
	}
	title := fmt.Sprintf("%s  %s", fm.Name, statusStyle.Render(statusIcon))
	contentBuilder.WriteString(lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render(title))
	contentBuilder.WriteString("\n")

	// Summary bar
	contentBuilder.WriteString(renderSummaryBar(fm, contentWidth))
	contentBuilder.WriteString("\n")

	// Calculate panel widths for the content area
	panelWidth := (contentWidth - 2) / 2
	if panelWidth < 35 {
		panelWidth = contentWidth - 2
	}

	// Top row: Stream Health | Cache Health
	streamPanel := renderStreamHealthPanel(fm, panelWidth)
	cachePanel := renderCacheHealthPanel(fm, panelWidth)

	if contentWidth >= 72 {
		contentBuilder.WriteString(lipgloss.JoinHorizontal(lipgloss.Top, streamPanel, " ", cachePanel))
	} else {
		contentBuilder.WriteString(streamPanel)
		contentBuilder.WriteString("\n")
		contentBuilder.WriteString(cachePanel)
	}
	contentBuilder.WriteString("\n")

	// Middle row: Payload Histogram | LLM Usage
	payloadPanel := renderPayloadPanel(fm, panelWidth)
	llmPanel := renderLLMPanel(fm, panelWidth)

	if contentWidth >= 72 {
		contentBuilder.WriteString(lipgloss.JoinHorizontal(lipgloss.Top, payloadPanel, " ", llmPanel))
	} else {
		contentBuilder.WriteString(payloadPanel)
		contentBuilder.WriteString("\n")
		contentBuilder.WriteString(llmPanel)
	}

	// Join sidebar and content horizontally
	mainView := lipgloss.JoinHorizontal(lipgloss.Top, sidebar, "  ", contentBuilder.String())

	// Help line
	helpLine := helpStyle.Render("↑/↓: select feed | Tab: switch tab | q: quit")

	return lipgloss.JoinVertical(lipgloss.Left, mainView, "", helpLine)
}

// renderNoFeeds renders the no feeds message
func renderNoFeeds(width int) string {
	msg := lipgloss.NewStyle().
		Foreground(dimCyanColor).
		Align(lipgloss.Center).
		Width(width).
		Render("No feeds connected.\n\nSubscribe to a feed to see metrics.")
	return msg
}

// Sidebar styles
var (
	feedItemSelectedStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#000000")).
				Background(cyanColor).
				Bold(true).
				Padding(0, 1)

	feedItemNormalStyle = lipgloss.NewStyle().
				Foreground(dimCyanColor).
				Padding(0, 1)

	feedItemConnectedIcon    = lipgloss.NewStyle().Foreground(greenColor).Render("●")
	feedItemDisconnectedIcon = lipgloss.NewStyle().Foreground(redColor).Render("●")
)

// renderFeedSidebar renders the vertical feed list sidebar with title in border
func renderFeedSidebar(dm DashboardMetrics, width, maxHeight int) string {
	var lines []string

	// Calculate how many feeds we can show (reduced for title in border)
	visibleFeeds := maxHeight - 6 // Account for borders, count, etc.
	if visibleFeeds < 3 {
		visibleFeeds = 3
	}

	// Determine scroll window
	startIdx := 0
	endIdx := len(dm.Feeds)

	if len(dm.Feeds) > visibleFeeds {
		// Center the selected item in the visible window
		halfVisible := visibleFeeds / 2
		startIdx = dm.SelectedIdx - halfVisible
		if startIdx < 0 {
			startIdx = 0
		}
		endIdx = startIdx + visibleFeeds
		if endIdx > len(dm.Feeds) {
			endIdx = len(dm.Feeds)
			startIdx = endIdx - visibleFeeds
			if startIdx < 0 {
				startIdx = 0
			}
		}
	}

	// Show scroll indicator at top if needed
	if startIdx > 0 {
		lines = append(lines, lipgloss.NewStyle().Foreground(dimCyanColor).Render("  ▲ more"))
	}

	// Render feed items
	for i := startIdx; i < endIdx; i++ {
		feed := dm.Feeds[i]

		// Connection status icon
		icon := feedItemDisconnectedIcon
		if feed.WSConnected {
			icon = feedItemConnectedIcon
		}

		// Truncate name to fit sidebar
		name := feed.Name
		maxNameLen := width - 6 // Account for icon, padding, borders
		if maxNameLen < 8 {
			maxNameLen = 8
		}
		if len(name) > maxNameLen {
			name = name[:maxNameLen-1] + "…"
		}

		// Format the line
		itemText := fmt.Sprintf("%s %s", icon, name)

		if i == dm.SelectedIdx {
			lines = append(lines, feedItemSelectedStyle.Width(width-4).Render(itemText))
		} else {
			lines = append(lines, feedItemNormalStyle.Width(width-4).Render(itemText))
		}
	}

	// Show scroll indicator at bottom if needed
	if endIdx < len(dm.Feeds) {
		lines = append(lines, lipgloss.NewStyle().Foreground(dimCyanColor).Render("  ▼ more"))
	}

	// Add feed count at bottom
	lines = append(lines, "")
	countText := fmt.Sprintf("%d/%d", dm.SelectedIdx+1, len(dm.Feeds))
	lines = append(lines, lipgloss.NewStyle().Foreground(grayColor).Align(lipgloss.Center).Width(width-4).Render(countText))

	content := strings.Join(lines, "\n")
	return renderPanel("Feeds", content, width)
}

// renderSummaryBar renders the top summary bar
func renderSummaryBar(fm FeedMetrics, width int) string {
	// WS Status
	wsStatus := goodValueStyle.Render("● Connected")
	if !fm.WSConnected {
		wsStatus = badValueStyle.Render("● Disconnected")
	}

	// Message rate
	msgRate := fmt.Sprintf("%.1f msg/s", fm.MessagesPerSecond10s)

	// Byte rate
	byteRate := fmt.Sprintf("%.1f KB/s", fm.BytesPerSecond10s/1024)

	// Cache
	cacheInfo := fmt.Sprintf("ctx: %d items", fm.CacheItemsCurrent)

	// LLM tokens
	tokens := fmt.Sprintf("in: %d out: %d", fm.InputTokensLast, fm.OutputTokensLast)

	// Generation time
	genTime := fmt.Sprintf("gen: %.0fms", fm.GenerationTimeAvgMs)

	parts := []string{wsStatus, msgRate, byteRate, cacheInfo, tokens, genTime}
	summary := strings.Join(parts, "  │  ")

	return summaryBarStyle.Width(width - 4).Render(summary)
}

// renderStreamHealthPanel renders the WebSocket health panel
func renderStreamHealthPanel(fm FeedMetrics, width int) string {
	var lines []string

	// Connection status
	connStatus := goodValueStyle.Render("Connected ✓")
	if !fm.WSConnected {
		connStatus = badValueStyle.Render("Disconnected ✗")
	}
	lines = append(lines, renderColoredMetric("Status", connStatus, metricValueStyle))

	// Message counts
	lines = append(lines, renderMetric("Messages Received", fmt.Sprintf("%d", fm.MessagesReceivedTotal)))

	// Message rate
	lines = append(lines, renderMetric("Rate", fmt.Sprintf("%.1f msg/s", fm.MessagesPerSecond10s)))

	// Message rate sparkline (throughput: higher = better)
	if len(fm.MsgRateHistory) > 0 {
		sparkWidth := width - 12
		if sparkWidth > 40 {
			sparkWidth = 40
		}
		sparkline := renderSparkline(fm.MsgRateHistory, sparkWidth, false)
		lines = append(lines, metricLabelStyle.Render("Trend: ")+sparkline)
	}

	// Byte rate
	lines = append(lines, renderMetric("Throughput", fmt.Sprintf("%.1f KB/s", fm.BytesPerSecond10s/1024)))

	// Total bytes
	lines = append(lines, renderMetric("Total Bytes", humanizeBytes(fm.BytesReceivedTotal)))

	// Last message age
	ageStyle := goodValueStyle
	if fm.LastMessageAgeSeconds > 30 {
		ageStyle = warnValueStyle
	}
	if fm.LastMessageAgeSeconds > 60 {
		ageStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("Last Msg",
		humanizeDuration(fm.LastMessageAgeSeconds)+" ago", ageStyle))

	// Reconnects and uptime
	lines = append(lines, renderMetric("Reconnects", fmt.Sprintf("%d", fm.ReconnectsTotal)))
	lines = append(lines, renderMetric("Uptime", humanizeDuration(fm.CurrentUptimeSeconds)))

	return renderPanel("Stream / WebSocket", strings.Join(lines, "\n"), width)
}

// renderCacheHealthPanel renders the LLM context panel
func renderCacheHealthPanel(fm FeedMetrics, width int) string {
	var lines []string

	// Items in context
	lines = append(lines, renderMetric("Events in Context", fmt.Sprintf("%d", fm.CacheItemsCurrent)))

	// Memory usage
	memStyle := goodValueStyle
	if fm.CacheApproxBytes > 50*1024*1024 { // > 50MB
		memStyle = warnValueStyle
	}
	if fm.CacheApproxBytes > 100*1024*1024 { // > 100MB
		memStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("Context Size", humanizeBytes(fm.CacheApproxBytes), memStyle))

	// Cache memory sparkline (inverted: higher = more memory = warning)
	if len(fm.CacheBytesHistory) > 0 {
		sparkWidth := width - 12
		if sparkWidth > 40 {
			sparkWidth = 40
		}
		sparkline := renderSparkline(fm.CacheBytesHistory, sparkWidth, true)
		lines = append(lines, metricLabelStyle.Render("Trend: ")+sparkline)
	}

	// Age stats - how far back context goes
	lines = append(lines, renderMetric("Context Age", humanizeDuration(fm.OldestItemAgeSeconds)))

	// Packet loss / eviction metrics
	lines = append(lines, "")
	lines = append(lines, metricLabelStyle.Render("Packet Loss:"))

	// Messages dropped (not included in context)
	droppedStyle := goodValueStyle
	if fm.MessagesDroppedTotal > 0 {
		droppedStyle = warnValueStyle
	}
	if fm.DropRatePercent > 5 {
		droppedStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("  Dropped", fmt.Sprintf("%d", fm.MessagesDroppedTotal), droppedStyle))

	// Context evictions (older messages pushed out)
	evictStyle := goodValueStyle
	if fm.ContextEvictionsTotal > 10 {
		evictStyle = warnValueStyle
	}
	if fm.ContextEvictionsTotal > 50 {
		evictStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("  Evicted", fmt.Sprintf("%d", fm.ContextEvictionsTotal), evictStyle))

	// Drop rate percentage
	dropRateStyle := goodValueStyle
	if fm.DropRatePercent > 1 {
		dropRateStyle = warnValueStyle
	}
	if fm.DropRatePercent > 5 {
		dropRateStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("  Drop Rate", fmt.Sprintf("%.1f%%", fm.DropRatePercent), dropRateStyle))

	return renderPanel("💾 LLM Context", strings.Join(lines, "\n"), width)
}

// renderPayloadPanel renders the payload size panel
func renderPayloadPanel(fm FeedMetrics, width int) string {
	var lines []string

	// Numeric stats
	lines = append(lines, renderMetric("Last Payload", humanizeBytesInt(fm.PayloadSizeLastBytes)))
	lines = append(lines, renderMetric("Avg Payload", humanizeBytesInt(int(fm.PayloadSizeAvgBytes))))
	lines = append(lines, renderMetric("Max Payload", humanizeBytesInt(fm.PayloadSizeMaxBytes)))

	return renderPanel("Payload Size", strings.Join(lines, "\n"), width)
}

// renderLLMPanel renders the LLM usage panel
func renderLLMPanel(fm FeedMetrics, width int) string {
	var lines []string

	// Request counts
	lines = append(lines, renderMetric("Total Requests", fmt.Sprintf("%d", fm.LLMRequestsTotal)))

	// Token usage - Last request (most important)
	lines = append(lines, "")
	lines = append(lines, metricLabelStyle.Render("Last Request:"))
	lines = append(lines, renderMetric("  Input Tokens", fmt.Sprintf("%d", fm.InputTokensLast)))
	lines = append(lines, renderMetric("  Output Tokens", fmt.Sprintf("%d", fm.OutputTokensLast)))

	// Token totals
	lines = append(lines, "")
	lines = append(lines, metricLabelStyle.Render("Session Totals:"))
	lines = append(lines, renderMetric("  Input Tokens", fmt.Sprintf("%d", fm.InputTokensTotal)))
	lines = append(lines, renderMetric("  Output Tokens", fmt.Sprintf("%d", fm.OutputTokensTotal)))
	totalTokens := fm.InputTokensTotal + fm.OutputTokensTotal
	lines = append(lines, renderMetric("  Total Tokens", fmt.Sprintf("%d", totalTokens)))

	// Events in context
	lines = append(lines, "")
	lines = append(lines, renderMetric("Events in Context", fmt.Sprintf("%d", fm.EventsInContextCurrent)))

	// Context utilization
	ctxStyle := colorByThreshold(fm.ContextUtilizationPercent, 50, 80, false)
	ctxBar := renderContextBar(fm.ContextUtilizationPercent, width-20)
	lines = append(lines, renderColoredMetric("Context Usage",
		fmt.Sprintf("%.1f%%", fm.ContextUtilizationPercent), ctxStyle))
	lines = append(lines, ctxBar)

	// Timing metrics - TTFT and Generation Time
	lines = append(lines, "")
	lines = append(lines, metricLabelStyle.Render("Timing:"))

	// TTFT (Time to First Token)
	ttftStyle := goodValueStyle
	if fm.TTFTMs > 1000 {
		ttftStyle = warnValueStyle
	}
	if fm.TTFTMs > 3000 {
		ttftStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("  TTFT (last)",
		fmt.Sprintf("%.0fms", fm.TTFTMs), ttftStyle))
	lines = append(lines, renderMetric("  TTFT (avg)", fmt.Sprintf("%.0fms", fm.TTFTAvgMs)))

	// Total Generation Time
	genStyle := goodValueStyle
	if fm.GenerationTimeMs > 5000 {
		genStyle = warnValueStyle
	}
	if fm.GenerationTimeMs > 10000 {
		genStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("  Gen Time (last)",
		fmt.Sprintf("%.0fms", fm.GenerationTimeMs), genStyle))
	lines = append(lines, renderMetric("  Gen Time (avg)", fmt.Sprintf("%.0fms", fm.GenerationTimeAvgMs)))

	// Generation time sparkline (inverted: higher latency = bad)
	if len(fm.GenTimeHistory) > 0 {
		sparkWidth := width - 14
		if sparkWidth > 35 {
			sparkWidth = 35
		}
		sparkline := renderSparkline(fm.GenTimeHistory, sparkWidth, true)
		lines = append(lines, metricLabelStyle.Render("  Trend: ")+sparkline)
	}

	// Errors
	lines = append(lines, "")
	errStyle := goodValueStyle
	if fm.LLMErrorsTotal > 0 {
		errStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("Errors", fmt.Sprintf("%d", fm.LLMErrorsTotal), errStyle))

	return renderPanel("LLM / Tokens", strings.Join(lines, "\n"), width)
}

// renderContextBar renders a visual bar for context utilization
func renderContextBar(percent float64, width int) string {
	if width < 10 {
		width = 10
	}

	filled := int(percent / 100 * float64(width))
	if filled > width {
		filled = width
	}

	var bar strings.Builder
	for i := 0; i < width; i++ {
		if i < filled {
			if percent > 80 {
				bar.WriteString(badValueStyle.Render("█"))
			} else if percent > 50 {
				bar.WriteString(warnValueStyle.Render("█"))
			} else {
				bar.WriteString(goodValueStyle.Render("█"))
			}
		} else {
			bar.WriteString(lipgloss.NewStyle().Foreground(grayColor).Render("░"))
		}
	}

	return "  [" + bar.String() + "]"
}
