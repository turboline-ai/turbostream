package main

import (
	"fmt"
	"math"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Dashboard panel styles
var (
	panelBorderStyle = lipgloss.NewStyle().
				Border(lipgloss.RoundedBorder()).
				BorderForeground(darkCyanColor).
				Padding(0, 1)

	panelTitleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(brightCyanColor).
			Background(darkGrayColor).
			Padding(0, 1)

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

	chartBarStyle = lipgloss.NewStyle().
			Foreground(cyanColor)

	chartLabelStyle = lipgloss.NewStyle().
			Foreground(dimCyanColor).
			Width(8)
)

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

// formatRate formats a rate value
func formatRate(rate float64, unit string) string {
	if rate < 0.01 {
		return fmt.Sprintf("0 %s", unit)
	} else if rate < 10 {
		return fmt.Sprintf("%.2f %s", rate, unit)
	} else if rate < 100 {
		return fmt.Sprintf("%.1f %s", rate, unit)
	}
	return fmt.Sprintf("%.0f %s", rate, unit)
}

// renderBar renders a horizontal bar chart bar
func renderBar(value, maxValue uint64, width int) string {
	if maxValue == 0 || width <= 0 {
		return strings.Repeat("░", width)
	}

	filledWidth := int(float64(value) / float64(maxValue) * float64(width))
	if filledWidth > width {
		filledWidth = width
	}

	filled := strings.Repeat("█", filledWidth)
	empty := strings.Repeat("░", width-filledWidth)

	return chartBarStyle.Render(filled) + lipgloss.NewStyle().Foreground(grayColor).Render(empty)
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

// renderPanel renders a titled panel with content
func renderPanel(title string, content string, width int) string {
	titleRendered := panelTitleStyle.Render(title)
	panel := panelBorderStyle.Width(width - 2).Render(content)
	return lipgloss.JoinVertical(lipgloss.Left, titleRendered, panel)
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

	// Render feed sidebar (vertical list)
	sidebar := renderFeedSidebar(dm, sidebarWidth, termHeight-6)

	// Build main content area
	var contentBuilder strings.Builder

	// Header
	statusIcon := "●"
	statusStyle := goodValueStyle
	if !fm.WSConnected {
		statusStyle = badValueStyle
	}
	title := fmt.Sprintf("📊 %s  %s", fm.Name, statusStyle.Render(statusIcon))
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
	contentBuilder.WriteString("\n")

	// Bottom row: Backpressure (full content width)
	contentBuilder.WriteString(renderBackpressurePanel(fm, contentWidth-2))

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
	sidebarStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(darkCyanColor).
			Padding(0, 1)

	sidebarTitleStyle = lipgloss.NewStyle().
				Bold(true).
				Foreground(brightCyanColor).
				MarginBottom(1)

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

// renderFeedSidebar renders the vertical feed list sidebar
func renderFeedSidebar(dm DashboardMetrics, width, maxHeight int) string {
	var lines []string

	// Title
	lines = append(lines, sidebarTitleStyle.Render("📡 Feeds"))
	lines = append(lines, "")

	// Calculate how many feeds we can show
	visibleFeeds := maxHeight - 4 // Account for title, borders, etc.
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
	return sidebarStyle.Width(width - 2).Render(content)
}

// renderFeedSelector is kept for backwards compatibility but not used in new layout
func renderFeedSelector(dm DashboardMetrics, width int) string {
	if len(dm.Feeds) == 0 {
		return ""
	}

	fm := dm.Feeds[dm.SelectedIdx]

	// Status indicator
	statusIcon := "●"
	statusStyle := goodValueStyle
	if !fm.WSConnected {
		statusStyle = badValueStyle
	}

	title := fmt.Sprintf("📊 Observability Dashboard  %s", statusStyle.Render(statusIcon))
	return lipgloss.NewStyle().Bold(true).Foreground(cyanColor).Render(title)
}

// renderSummaryBar renders the top summary bar
func renderSummaryBar(fm FeedMetrics, width int) string {
	// WS Status
	wsStatus := goodValueStyle.Render("● Connected")
	if !fm.WSConnected {
		wsStatus = badValueStyle.Render("● Disconnected")
	}

	// Message rates
	msgRate := fmt.Sprintf("msg/s: %.1f/%.1f/%.1f",
		fm.MessagesPerSecond1s, fm.MessagesPerSecond10s, fm.MessagesPerSecond60s)

	// Byte rates
	byteRate := fmt.Sprintf("%.1f/%.1f/%.1f KB/s",
		fm.BytesPerSecond1s/1024, fm.BytesPerSecond10s/1024, fm.BytesPerSecond60s/1024)

	// Cache
	cacheInfo := fmt.Sprintf("cache: %d items (%.2f MB)",
		fm.CacheItemsCurrent, float64(fm.CacheApproxBytes)/(1024*1024))

	// Context utilization
	ctxUtil := fmt.Sprintf("ctx: %.1f%%", fm.ContextUtilizationPercent)
	ctxStyle := colorByThreshold(fm.ContextUtilizationPercent, 50, 80, false)
	ctxStyled := ctxStyle.Render(ctxUtil)

	// LLM latency
	latency := fmt.Sprintf("lat: %.0fms", fm.LLMLatencyAvgMs)

	parts := []string{wsStatus, msgRate, byteRate, cacheInfo, ctxStyled, latency}
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
	lines = append(lines, renderMetric("Messages", fmt.Sprintf("%d recv / %d parsed / %d failed",
		fm.MessagesReceivedTotal, fm.MessagesParsedTotal, fm.MessagesFailedTotal)))

	// Message rates
	lines = append(lines, renderMetric("Rate (1s/10s/60s)",
		fmt.Sprintf("%.1f / %.1f / %.1f msg/s",
			fm.MessagesPerSecond1s, fm.MessagesPerSecond10s, fm.MessagesPerSecond60s)))

	// Byte rates
	lines = append(lines, renderMetric("Throughput",
		fmt.Sprintf("%.1f / %.1f / %.1f KB/s",
			fm.BytesPerSecond1s/1024, fm.BytesPerSecond10s/1024, fm.BytesPerSecond60s/1024)))

	// Total bytes
	lines = append(lines, renderMetric("Total Bytes", humanizeBytes(fm.BytesReceivedTotal)))

	// Sequence gaps and late messages
	gapStyle := goodValueStyle
	if fm.SequenceGapsDetectedTotal > 0 {
		gapStyle = warnValueStyle
	}
	lines = append(lines, renderColoredMetric("Seq Gaps",
		fmt.Sprintf("%d", fm.SequenceGapsDetectedTotal), gapStyle))

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

	if fm.LastDisconnectReason != "" {
		lines = append(lines, renderColoredMetric("Last DC",
			truncateString(fm.LastDisconnectReason, 20), warnValueStyle))
	}

	return renderPanel("📡 Stream / WebSocket", strings.Join(lines, "\n"), width)
}

// renderCacheHealthPanel renders the cache health panel
func renderCacheHealthPanel(fm FeedMetrics, width int) string {
	var lines []string

	// Item counts
	itemStyle := goodValueStyle
	if fm.CacheItemsCurrent > fm.CacheItemsMaxSeen*80/100 {
		itemStyle = warnValueStyle
	}
	lines = append(lines, renderColoredMetric("Items",
		fmt.Sprintf("%d / %d max", fm.CacheItemsCurrent, fm.CacheItemsMaxSeen), itemStyle))

	// Memory usage
	memStyle := goodValueStyle
	if fm.CacheApproxBytes > 50*1024*1024 { // > 50MB
		memStyle = warnValueStyle
	}
	if fm.CacheApproxBytes > 100*1024*1024 { // > 100MB
		memStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("Memory", humanizeBytes(fm.CacheApproxBytes), memStyle))

	// Per-item size
	lines = append(lines, renderMetric("Avg Item Size", humanizeBytesInt(int(fm.CacheApproxBytesPerItem))))

	// Age stats
	lines = append(lines, renderMetric("Oldest Item", humanizeDuration(fm.OldestItemAgeSeconds)))
	lines = append(lines, renderMetric("Avg Age", humanizeDuration(fm.AverageItemAgeSeconds)))

	// Operations
	lines = append(lines, renderMetric("Inserts", fmt.Sprintf("%d", fm.CacheInsertsTotal)))
	lines = append(lines, renderMetric("Deletes", fmt.Sprintf("%d", fm.CacheDeletesTotal)))

	// Evictions
	evictStyle := goodValueStyle
	if fm.CacheEvictionsTotal > 0 {
		evictStyle = warnValueStyle
	}
	lines = append(lines, renderColoredMetric("Evictions",
		fmt.Sprintf("%d (%.1f/s)", fm.CacheEvictionsTotal, fm.CacheEvictionsPerSecond), evictStyle))

	return renderPanel("💾 In-Memory Cache", strings.Join(lines, "\n"), width)
}

// renderPayloadPanel renders the payload size panel with histogram
func renderPayloadPanel(fm FeedMetrics, width int) string {
	var lines []string

	// Numeric stats
	lines = append(lines, renderMetric("Last", humanizeBytesInt(fm.PayloadSizeLastBytes)))
	lines = append(lines, renderMetric("Avg", humanizeBytesInt(int(fm.PayloadSizeAvgBytes))))
	lines = append(lines, renderMetric("P50/P95/P99",
		fmt.Sprintf("%s / %s / %s",
			humanizeBytesInt(fm.PayloadSizeP50Bytes),
			humanizeBytesInt(fm.PayloadSizeP95Bytes),
			humanizeBytesInt(fm.PayloadSizeP99Bytes))))
	lines = append(lines, renderMetric("Min/Max",
		fmt.Sprintf("%s / %s",
			humanizeBytesInt(fm.PayloadSizeMinBytes),
			humanizeBytesInt(fm.PayloadSizeMaxBytes))))

	lines = append(lines, "")
	lines = append(lines, metricLabelStyle.Render("Size Distribution:"))

	// Histogram
	bucketLabels := []string{"<1KB", "1-4KB", "4-16KB", "16-64KB", ">64KB"}
	var maxCount uint64
	for _, count := range fm.PayloadHistogramCounts {
		if count > maxCount {
			maxCount = count
		}
	}

	barWidth := width - 24 // Account for label and count
	if barWidth < 10 {
		barWidth = 10
	}

	for i, label := range bucketLabels {
		count := fm.PayloadHistogramCounts[i]
		bar := renderBar(count, maxCount, barWidth)
		line := fmt.Sprintf("%s %s %d", chartLabelStyle.Render(label), bar, count)
		lines = append(lines, line)
	}

	return renderPanel("📊 Payload Size (bytes)", strings.Join(lines, "\n"), width)
}

// renderLLMPanel renders the LLM usage panel
func renderLLMPanel(fm FeedMetrics, width int) string {
	var lines []string

	// Request counts
	lines = append(lines, renderMetric("Requests", fmt.Sprintf("%d (%.2f/s)",
		fm.LLMRequestsTotal, fm.LLMRequestsPerSecond)))

	// Token usage
	lines = append(lines, renderMetric("Prompt Tokens", fmt.Sprintf("%.0f avg / %.0f P95",
		fm.PromptTokensAvg, fm.PromptTokensP95)))
	lines = append(lines, renderMetric("Response Tokens", fmt.Sprintf("%.0f avg", fm.ResponseTokensAvg)))
	lines = append(lines, renderMetric("Total Tokens", fmt.Sprintf("%.0f avg", fm.TotalTokensAvg)))

	// Context utilization
	ctxStyle := colorByThreshold(fm.ContextUtilizationPercent, 50, 80, false)
	ctxBar := renderContextBar(fm.ContextUtilizationPercent, width-20)
	lines = append(lines, renderColoredMetric("Context Usage",
		fmt.Sprintf("%.1f%%", fm.ContextUtilizationPercent), ctxStyle))
	lines = append(lines, ctxBar)

	// Latency
	latStyle := goodValueStyle
	if fm.LLMLatencyAvgMs > 2000 {
		latStyle = warnValueStyle
	}
	if fm.LLMLatencyAvgMs > 5000 {
		latStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("Latency",
		fmt.Sprintf("%.0fms avg / %.0fms P95", fm.LLMLatencyAvgMs, fm.LLMLatencyP95Ms), latStyle))

	// Errors
	errStyle := goodValueStyle
	if fm.LLMErrorsTotal > 0 {
		errStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("Errors", fmt.Sprintf("%d", fm.LLMErrorsTotal), errStyle))

	// Events per prompt
	lines = append(lines, renderMetric("Events/Prompt",
		fmt.Sprintf("%.1f avg / %d max", fm.EventsPerPromptAvg, fm.EventsPerPromptMax)))

	// Warning for high context utilization
	if fm.ContextUtilizationPercent > 95 {
		lines = append(lines, "")
		lines = append(lines, badValueStyle.Render("⚠ Context window nearly full!"))
		lines = append(lines, warnValueStyle.Render("  Consider pruning or summarization"))
	}

	return renderPanel("🤖 LLM / Tokens", strings.Join(lines, "\n"), width)
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

// renderBackpressurePanel renders the backpressure panel
func renderBackpressurePanel(fm FeedMetrics, width int) string {
	var lines []string

	// Queue length
	queueStyle := goodValueStyle
	if fm.PendingEventsQueueLength > 10 {
		queueStyle = warnValueStyle
	}
	if fm.PendingEventsQueueLength > 100 {
		queueStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("Queue Length",
		fmt.Sprintf("%d / %d max seen", fm.PendingEventsQueueLength, fm.PendingEventsQueueMaxSeen), queueStyle))

	// Queue age
	ageStyle := goodValueStyle
	if fm.PendingEventsOldestAgeSeconds > 5 {
		ageStyle = warnValueStyle
	}
	if fm.PendingEventsOldestAgeSeconds > 30 {
		ageStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("Oldest Event Age",
		humanizeDuration(fm.PendingEventsOldestAgeSeconds), ageStyle))

	// Dropped events
	dropStyle := goodValueStyle
	if fm.EventsDroppedDueToBackpressure > 0 {
		dropStyle = badValueStyle
	}
	lines = append(lines, renderColoredMetric("Events Dropped",
		fmt.Sprintf("%d", fm.EventsDroppedDueToBackpressure), dropStyle))

	// Warning for backpressure
	if fm.PendingEventsQueueLength > 0 && fm.PendingEventsOldestAgeSeconds > 10 {
		lines = append(lines, "")
		lines = append(lines, badValueStyle.Render("⚠ System falling behind! Consider scaling or reducing load."))
	}

	content := strings.Join(lines, "  │  ")
	return renderPanel("⚡ Pipeline / Backpressure", content, width)
}

// truncateString truncates a string to a maximum length
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-1] + "…"
}

// clamp clamps a value between min and max
func clamp(value, min, max float64) float64 {
	return math.Max(min, math.Min(max, value))
}
