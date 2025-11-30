"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import useWebSocketLib, { ReadyState } from "react-use-websocket";
import { FeedData } from "@/types/marketplace";
import { FilteredFeedData } from "@/types/filters";
import { useAuth } from "@/contexts/AuthContext";

interface WSMessage<T = any> {
  type: string;
  payload?: T;
}

interface AIAnalysisCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (response: string, duration?: number) => void;
  onError?: (error: string) => void;
}

interface WebSocketContextType {
  feedData: Map<string, FeedData>;
  filteredFeedData: Map<string, FilteredFeedData>;
  isConnected: boolean;
  analyzeWithAI: (
    cryptoData: any[],
    query?: string,
    callbacks?: AIAnalysisCallbacks
  ) => void;
  analyzeUniversalFeed: (
    feedId: string,
    customPrompt?: string,
    callbacks?: AIAnalysisCallbacks
  ) => void;
  registerUser: (userId: string) => void;
  subscribeToFeed: (feedId: string, userId?: string) => void;
  unsubscribeFromFeed: (feedId: string, userId?: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const buildWsUrl = () => {
  // Use NEXT_PUBLIC_WEBSOCKET_URL if available, otherwise fall back to BACKEND_URL
  const base = process.env.NEXT_PUBLIC_WEBSOCKET_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7210";
  const scheme = base.startsWith("https") ? "wss" : "ws";
  const normalized = base.replace(/^https?/, scheme).replace(/\/$/, "");
  return `${normalized}/ws`;
};

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [feedData, setFeedData] = useState<Map<string, FeedData>>(new Map());
  const [filteredFeedData, setFilteredFeedData] = useState<Map<string, FilteredFeedData>>(new Map());
  const { updateTokenUsage } = useAuth();

  const aiCallbacksRef = useRef<AIAnalysisCallbacks | null>(null);
  const universalCallbacksRef = useRef(new Map<string, AIAnalysisCallbacks>());

  const wsUrl = useMemo(buildWsUrl, []);

  const {
    sendJsonMessage,
    lastJsonMessage,
    readyState,
  } = useWebSocketLib(wsUrl, {
    shouldReconnect: () => true,
    retryOnError: true,
    reconnectAttempts: Infinity,
    onOpen: () => console.log('[WS] Connection opened'),
    onClose: () => console.log('[WS] Connection closed'),
    onError: (event) => console.error('[WS] Error:', event),
  });

  const isConnected = readyState === ReadyState.OPEN;

  useEffect(() => {
    console.log(`[WS] Connection state changed: ${readyState} (OPEN=${ReadyState.OPEN})`);
  }, [readyState]);

  const sendMessage = useCallback(
    (type: string, payload?: any) => {
      console.log(`[WS] Attempting to send message type: ${type}, isConnected: ${isConnected}`);
      if (!isConnected) {
        console.warn(`⚠️ Cannot send ${type} - socket disconnected`);
        return false;
      }
      console.log(`[WS] Sending message:`, { type, payload });
      sendJsonMessage({ type, payload });
      return true;
    },
    [isConnected, sendJsonMessage]
  );

  useEffect(() => {
    if (!lastJsonMessage) return;

    const message = lastJsonMessage as WSMessage;
    const payload = message.payload;

    switch (message.type) {
      case "feed-data": {
        const data = payload as FeedData;
        if (!data?.feedId) {
          console.warn("⚠️ Received feed-data without feedId");
          return;
        }

        setFeedData((prev) => {
          const updated = new Map(prev);
          updated.set(data.feedId, {
            ...data,
            timestamp: new Date(data.timestamp || Date.now()),
          });
          return updated;
        });

        setFilteredFeedData((prev) => {
          const updated = new Map(prev);
          const filteredEntry: FilteredFeedData = {
            feedId: data.feedId,
            feedName: data.feedName,
            eventName: data.eventName,
            originalData: data.data,
            filteredData: data.data,
            filterApplied: false,
            timestamp: new Date(data.timestamp || Date.now()),
          };
          updated.set(data.feedId, filteredEntry);
          return updated;
        });
        break;
      }

      case "token-usage-update":
        if (payload) {
          updateTokenUsage(payload as any);
        }
        break;

      case "ai-stream":
        if (payload && typeof (payload as any).token === "string") {
          aiCallbacksRef.current?.onToken?.((payload as any).token);
        }
        break;

      case "ai-complete":
        aiCallbacksRef.current?.onComplete?.(
          (payload as any)?.response,
          (payload as any)?.duration
        );
        aiCallbacksRef.current = null;
        break;

      case "ai-error":
        aiCallbacksRef.current?.onError?.((payload as any)?.error || "AI error");
        aiCallbacksRef.current = null;
        break;

      case "universal-ai-stream": {
        const analysisId = (payload as any)?.analysisId;
        if (analysisId) {
          universalCallbacksRef.current
            .get(analysisId)?.onToken?.((payload as any)?.token);
        }
        break;
      }

      case "universal-ai-complete": {
        const analysisId = (payload as any)?.analysisId;
        if (analysisId) {
          const callbacks = universalCallbacksRef.current.get(analysisId);
          callbacks?.onComplete?.((payload as any)?.response, (payload as any)?.duration);
          universalCallbacksRef.current.delete(analysisId);
        }
        break;
      }

      case "universal-ai-error": {
        const analysisId = (payload as any)?.analysisId;
        if (analysisId) {
          const callbacks = universalCallbacksRef.current.get(analysisId);
          callbacks?.onError?.((payload as any)?.error || "AI error");
          universalCallbacksRef.current.delete(analysisId);
        }
        break;
      }

      case "subscription-error":
      case "unsubscription-error":
      case "registration-error":
      case "error":
        console.error("WebSocket error:", payload);
        break;

      default:
        break;
    }
  }, [lastJsonMessage, updateTokenUsage]);

  const analyzeWithAI = useCallback(
    (cryptoData: any[], query?: string, callbacks?: AIAnalysisCallbacks) => {
      aiCallbacksRef.current = callbacks || null;
      if (!sendMessage("analyze-crypto", { query, cryptoData }) && callbacks?.onError) {
        callbacks.onError("WebSocket not connected");
      }
    },
    [sendMessage]
  );

  const analyzeUniversalFeed = useCallback(
    (feedId: string, customPrompt?: string, callbacks?: AIAnalysisCallbacks) => {
      const analysisId = `${feedId}-${Date.now()}`;
      if (callbacks) {
        universalCallbacksRef.current.set(analysisId, callbacks);
      }
      if (!sendMessage("analyze-universal-feed", { feedId, customPrompt, analysisId }) && callbacks?.onError) {
        callbacks.onError("WebSocket not connected");
        universalCallbacksRef.current.delete(analysisId);
      }
    },
    [sendMessage]
  );

  const registerUser = useCallback(
    (userId: string) => {
      if (!userId) return;
      sendMessage("register-user", {
        userId,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        timestamp: new Date().toISOString(),
      });
    },
    [sendMessage]
  );

  const subscribeToFeed = useCallback(
    (feedId: string, userId?: string) => {
      const userIdToUse = userId || localStorage.getItem("userId") || `temp_${Date.now()}`;
      localStorage.setItem("userId", userIdToUse);
      sendMessage("subscribe-feed", { feedId, userId: userIdToUse });
    },
    [sendMessage]
  );

  const unsubscribeFromFeed = useCallback(
    (feedId: string, userId?: string) => {
      const userIdToUse = userId || localStorage.getItem("userId");
      if (!userIdToUse) {
        console.warn("⚠️ Cannot unsubscribe - no userId available");
        return;
      }
      sendMessage("unsubscribe-feed", { feedId, userId: userIdToUse });
    },
    [sendMessage]
  );

  const value: WebSocketContextType = {
    feedData,
    filteredFeedData,
    isConnected,
    analyzeWithAI,
    analyzeUniversalFeed,
    registerUser,
    subscribeToFeed,
    unsubscribeFromFeed,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
