"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, Switch, Select, Input, Space, Tag, Tooltip, Modal, Badge } from "antd";
import Button from "@/components/ui/Button";
import { 
  Send,
  Bot,
  PlayCircle,
  PauseCircle,
  Settings,
  Lightbulb,
  Clock,
  Edit,
  User,
  Zap,
  Filter,
  History,
  Plus
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { WebSocketFeed } from "@/types/marketplace";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/contexts/AuthContext";
import { useFilters } from "@/contexts/FilterContext";
import { normalizeDataForAI, createDataPrompt, getCompressionMetrics } from "@/utils/dataNomalizer";
import { chatHistoryAPI, ChatMessage, createChatMessage } from "@/services/chatHistoryAPI";
import { estimateTokenCountDetailed, formatTokenCount } from "@/utils/tokenCounter";

const { TextArea } = Input;

interface AnalysisResult {
  id: string;
  timestamp: number;
  feedId: string;
  content: string;
  prompt: string;
  duration?: number;
  dataSnapshot?: any;
}

interface UniversalAIInsightsProps {
  feed: WebSocketFeed;
  realTimeData?: any;
  userCustomPrompt?: string;
  onPromptChange?: (prompt: string) => void;
  className?: string;
}

export default function UniversalAIInsights({
  feed,
  realTimeData,
  userCustomPrompt,
  onPromptChange,
  className = "",
}: UniversalAIInsightsProps) {
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoAnalysis, setAutoAnalysis] = useState(false);
  const [analysisInterval, setAnalysisInterval] = useState<number>(30);
  const [customPrompt, setCustomPrompt] = useState<string>(userCustomPrompt || "");
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [chatInput, setChatInput] = useState<string>("");
  const [currentUserPrompt, setCurrentUserPrompt] = useState<string>("");
  const [maxDataRows, setMaxDataRows] = useState<number>(50);
  
  // Chat history state
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const { analyzeUniversalFeed, isConnected } = useWebSocket();
  const { user } = useAuth();
  const { activeFilters, applyFilters, removeFeedFilter } = useFilters();
  
  // Ref for auto-scrolling chat messages
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Update local state when userCustomPrompt changes
  useEffect(() => {
    setCustomPrompt(userCustomPrompt || "");
  }, [userCustomPrompt]);
  
  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTo({
        top: chatMessagesRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [currentAnalysis, analysisHistory, currentUserPrompt]);
  
  // Get effective prompt (user custom > feed default > system default)
  const getEffectivePrompt = useCallback(() => {
    if (customPrompt.trim()) {
      return customPrompt;
    }
    if (feed.defaultAIPrompt?.trim()) {
      return feed.defaultAIPrompt;
    }
    return getDefaultPromptForCategory(feed.category);
  }, [customPrompt, feed.defaultAIPrompt, feed.category]);

  // Format token count for display
  const formatTokenCount = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${Math.floor(tokens / 1000)}K`;
    }
    return tokens.toString();
  };

  // Default prompts based on feed category
  const getDefaultPromptForCategory = (category: string): string => {
    switch (category) {
      case 'crypto':
        return 'Analyze this cryptocurrency data and provide insights about market trends, price movements, and potential trading opportunities. Focus on actionable information.';
      case 'stocks':
        return 'Analyze this stock market data and provide insights about market performance, sector trends, and investment opportunities.';
      case 'forex':
        return 'Analyze this forex data and provide insights about currency movements, economic indicators, and trading opportunities.';
      case 'commodities':
        return 'Analyze this commodities data and provide insights about supply/demand factors, price trends, and market opportunities.';
      default:
        return 'Analyze this real-time data and extract meaningful insights, trends, and actionable information.';
    }
  };

  // Check if user has exceeded token limit
  const hasExceededTokenLimit = (): boolean => {
    if (!user?.tokenUsage) return false;
    return user.tokenUsage.tokensUsed >= user.tokenUsage.limit;
  };

  // Real AI analysis using WebSocket
  const performAnalysis = useCallback((customChatPrompt?: string) => {
    if (!feed.aiAnalysisEnabled) {
      console.log(`❌ AI Analysis skipped - not enabled for feed ${feed.name}`);
      return;
    }
    if (!realTimeData) {
      console.log(`❌ AI Analysis skipped - no real-time data for feed ${feed.name}`);
      return;
    }
    if (hasExceededTokenLimit()) {
      setCurrentAnalysis(`⚠️ Token quota exceeded. You have used all ${formatTokenCount(user!.tokenUsage!.limit)} tokens this month. Quota resets on the 1st of next month.`);
      console.log(`❌ AI Analysis skipped - token quota exceeded`);
      return;
    }
    if (!isConnected) {
      console.log(`❌ AI Analysis skipped - not connected for feed ${feed.name}`);
      return;
    }
    if (!feed._id) {
      console.log(`❌ AI Analysis skipped - no feed ID for feed ${feed.name}`);
      return;
    }

    console.log(`🤖 Starting AI analysis for feed ${feed.name} (${feed._id})`);
    setIsAnalyzing(true);
    setCurrentAnalysis("🔄 Analyzing data...");

    const startTime = Date.now();
    const analysisId = `analysis-${startTime}`;
    const effectivePrompt = customChatPrompt || getEffectivePrompt();

    // Store the user prompt if it's a custom chat prompt
    if (customChatPrompt) {
      setCurrentUserPrompt(customChatPrompt);
      
      // Create conversation immediately when user sends first message
      const createConversationIfNeeded = async () => {
        try {
          let conversationId = currentConversationId;
          
          if (!conversationId) {
            const userTokens = estimateTokenCountDetailed(customChatPrompt);
            console.log(`🆕 Creating new conversation for user message in feed ${feed.name} (${userTokens} tokens)`);
            const conversation = await chatHistoryAPI.createConversation({
              feedId: feed._id || '',
              feedName: feed.name,
              category: feed.category,
              name: undefined, // Will be auto-generated from first message
              initialMessage: {
                type: 'user',
                content: customChatPrompt,
                metadata: {
                  tokenUsage: userTokens
                }
              }
            });
            conversationId = conversation._id!;
            setCurrentConversationId(conversationId);
            console.log(`✅ Created conversation with ID: ${conversationId}`);
          } else {
            // Add user message to existing conversation
            const userTokens = estimateTokenCountDetailed(customChatPrompt);
            console.log(`📝 Adding user message to existing conversation ${conversationId} (${userTokens} tokens)`);
            await chatHistoryAPI.addMessage(conversationId, {
              type: 'user',
              content: customChatPrompt,
              metadata: {
                tokenUsage: userTokens
              }
            });
          }
          
          // Calculate token usage for user message
          const userTokens = estimateTokenCountDetailed(customChatPrompt);
          console.log(`💬 User message: ${userTokens} tokens`);
          
          // Add user message to local state
          const userMessage: ChatMessage = {
            conversationId,
            type: 'user',
            content: customChatPrompt,
            timestamp: new Date().toISOString(),
            metadata: {
              tokenUsage: userTokens
            }
          };
          setChatMessages(prev => [...prev, userMessage]);
          
        } catch (error) {
          console.error('❌ Failed to create conversation for user message:', error);
          // Still add to local state even if backend save fails
          const userTokens = estimateTokenCountDetailed(customChatPrompt);
          const userMessage: ChatMessage = {
            conversationId: currentConversationId || '',
            type: 'user',
            content: customChatPrompt,
            timestamp: new Date().toISOString(),
            metadata: {
              tokenUsage: userTokens
            }
          };
          setChatMessages(prev => [...prev, userMessage]);
        }
      };
      
      // Execute conversation creation immediately
      createConversationIfNeeded();
    }

    console.log(`📝 Using prompt: ${effectivePrompt.substring(0, 100)}...`);

    // Note: Data is now accumulated in Redis backend, no need to send from frontend
    console.log(`� Triggering AI analysis for feed ${feed.name} - data will be retrieved from Redis accumulation`);

    analyzeUniversalFeed(
      feed._id,
      effectivePrompt, // Send only the prompt, data comes from Redis
      {
        onToken: (token: string) => {
          setCurrentAnalysis(prev => prev + token);
        },
        onComplete: (response: string, duration?: number) => {
          console.log(`✅ AI Analysis completed for feed ${feed.name} in ${duration || (Date.now() - startTime)}ms`);
          
          // Calculate token usage for AI response
          const aiTokens = estimateTokenCountDetailed(response);
          console.log(`🤖 AI response: ${aiTokens} tokens`);
          
          // Add AI response to local chat history (temporary, will be replaced by saved message)
          const tempAiMessage: ChatMessage = {
            conversationId: currentConversationId || '',
            type: 'ai',
            content: response,
            timestamp: new Date().toISOString(),
            metadata: {
              prompt: effectivePrompt,
              dataSnapshot: null, // Data now comes from Redis accumulation
              feedId: feed._id,
              analysisId,
              tokenUsage: aiTokens
            }
          };
          setChatMessages(prev => [...prev, tempAiMessage]);
          
          // Save AI response to backend (conversation should already exist)
          const saveAIResponse = async () => {
            try {
              const conversationId = currentConversationId;
              
              if (!conversationId) {
                console.warn('⚠️ No conversation ID available for AI response - creating new conversation');
                // Fallback: create conversation for AI response only (shouldn't normally happen)
                const aiTokens = estimateTokenCountDetailed(response);
                const conversation = await chatHistoryAPI.createConversation({
                  feedId: feed._id || '',
                  feedName: feed.name,
                  category: feed.category,
                  name: undefined, // Will be auto-generated
                  initialMessage: {
                    type: 'ai',
                    content: response,
                    metadata: {
                      tokenUsage: aiTokens
                    }
                  }
                });
                setCurrentConversationId(conversation._id!);
                console.log(`✅ Created fallback conversation with ID: ${conversation._id}`);
                return;
              }
              
              // Add AI response message to existing conversation
              const aiTokens = estimateTokenCountDetailed(response);
              console.log(`💾 Adding AI response to conversation ${conversationId} (${aiTokens} tokens)`);
              const savedMessage = await chatHistoryAPI.addMessage(conversationId, {
                type: 'ai',
                content: response,
                metadata: {
                  prompt: effectivePrompt,
                  dataSnapshot: null, // Data now comes from Redis accumulation
                  feedId: feed._id,
                  analysisId,
                  tokenUsage: aiTokens
                }
              });
              
              // Update local state with saved message
              setChatMessages(prev => {
                // Replace the temporary message with the saved one
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = savedMessage;
                return newMessages;
              });
              
              console.log(`✅ AI response saved to conversation ${conversationId}`);
            } catch (error) {
              console.error('❌ Failed to save AI response:', error);
              if (error instanceof Error) {
                console.error('Error details:', error.message);
                console.error('Stack trace:', error.stack);
              }
              // Test if backend is accessible
              try {
                const healthResponse = await fetch('http://localhost:7210/health');
                if (healthResponse.ok) {
                  console.log('✅ Backend is accessible');
                } else {
                  console.error('❌ Backend health check failed');
                }
              } catch (healthError) {
                console.error('❌ Backend is not accessible:', healthError);
              }
              // Continue without saving - don't break the user experience
            }
          };
          
          // Execute the save operation
          saveAIResponse();

          const newAnalysis: AnalysisResult = {
            id: analysisId,
            timestamp: startTime,
            feedId: feed._id || '',
            content: response,
            prompt: effectivePrompt,
            duration: duration || (Date.now() - startTime),
            dataSnapshot: realTimeData
          };

          setAnalysisHistory(prev => [newAnalysis, ...prev].slice(0, 10)); // Keep last 10
          setCurrentAnalysis("");
          setCurrentUserPrompt("");
          setIsAnalyzing(false);
        },
        onError: (error: string) => {
          console.error(`❌ AI Analysis error for feed ${feed.name}:`, error);
          setCurrentAnalysis(`⚠️ Failed to analyze data: ${error}`);
          setCurrentUserPrompt("");
          setIsAnalyzing(false);
        }
      }
    );
  }, [feed.aiAnalysisEnabled, feed._id, feed.name, realTimeData, isConnected, getEffectivePrompt, analyzeUniversalFeed, user]);

  // Auto analysis effect - use ref to avoid dependency issues
  const autoAnalysisRef = useRef<NodeJS.Timeout | null>(null);
  const performAnalysisRef = useRef(performAnalysis);

  // Update the ref when performAnalysis changes
  useEffect(() => {
    performAnalysisRef.current = performAnalysis;
  }, [performAnalysis]);

  useEffect(() => {
    // Clear existing interval
    if (autoAnalysisRef.current) {
      clearInterval(autoAnalysisRef.current);
      autoAnalysisRef.current = null;
    }

    // Only start new interval if auto analysis is enabled and we have data
    if (autoAnalysis && realTimeData && isConnected && feed.aiAnalysisEnabled) {
      //console.log(`🤖 Starting auto-analysis with ${analysisInterval}s interval for feed ${feed.name}`);
      
      autoAnalysisRef.current = setInterval(() => {
        //console.log(`🔄 Auto-analysis triggered for feed ${feed.name}`);
        performAnalysisRef.current();
      }, analysisInterval * 1000);
    } else {
      // console.log(`⏸️ Auto-analysis paused for feed ${feed.name}:`, {
      //   autoAnalysis,
      //   hasRealTimeData: !!realTimeData,
      //   isConnected,
      //   aiEnabled: feed.aiAnalysisEnabled
      // });
    }

    return () => {
      if (autoAnalysisRef.current) {
        clearInterval(autoAnalysisRef.current);
        autoAnalysisRef.current = null;
      }
    };
  }, [autoAnalysis, analysisInterval, isConnected, feed.aiAnalysisEnabled, feed.name, !!realTimeData]);

  // Handle prompt changes
  const handlePromptSave = () => {
    onPromptChange?.(customPrompt);
    setShowPromptModal(false);
  };

  const handlePromptClear = () => {
    setCustomPrompt("");
  };

  const handlePromptReset = () => {
    setCustomPrompt(feed.defaultAIPrompt || getDefaultPromptForCategory(feed.category));
  };

  // Handle new conversation
  const startNewConversation = () => {
    setChatMessages([]);
    setCurrentConversationId(null);
    setCurrentAnalysis("");
    setCurrentUserPrompt("");
    console.log(`🆕 Started new conversation for feed ${feed.name}`);
  };

  // Handle chat input
  const handleSendChat = () => {
    if (!chatInput.trim() || isAnalyzing) return;
    performAnalysis(chatInput.trim());
    setChatInput("");
  };

  const handleChatKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  if (!feed.aiAnalysisEnabled) {
    return (
      <Card className={`panel ${className}`} style={{ borderColor: 'var(--line)' }}>
        <div className="text-center py-8">
          <Bot size={48} style={{ color: 'var(--muted)' }} />
          <p style={{ color: 'var(--muted)', marginTop: '16px' }}>
            AI analysis is not enabled for this feed
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card 
        className="panel transition-all duration-200 hover:shadow-lg h-full flex flex-col"
        style={{ borderColor: 'var(--line)' }}
        styles={{ body: { padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' } }}
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Bot size={16} style={{ color: 'var(--blue)' }} />
              </div>
            </div>
            <Space size="small">
              <Tooltip title={
                hasExceededTokenLimit() 
                  ? "Token quota exceeded" 
                  : autoAnalysis ? "Pause auto-analysis" : "Start analysis or enable auto mode"
              }>
                <Button
                  variant="milkyway"
                  size="small"
                  icon={autoAnalysis ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                  onClick={() => {
                    if (autoAnalysis) {
                      // If auto is on, clicking pauses it
                      setAutoAnalysis(false);
                    } else {
                      // If auto is off, clicking triggers one analysis
                      performAnalysis();
                    }
                  }}
                  disabled={!realTimeData || !isConnected || (isAnalyzing && !autoAnalysis) || hasExceededTokenLimit()}
                  loading={isAnalyzing && !autoAnalysis}
                >
                  {autoAnalysis ? 'Pause' : isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </Button>
              </Tooltip>
              <Tooltip title="Start new conversation">
                <Button 
                  variant="ghost"
                  size="small"
                  icon={<Plus size={16} />}
                  onClick={startNewConversation}
                  style={{ color: 'var(--muted)' }}
                />
              </Tooltip>
              <Tooltip title="View chat history (coming soon)">
                <Button 
                  variant="ghost"
                  size="small"
                  icon={<History size={16} />}
                  onClick={() => {
                    alert('Chat history page is being updated. Check browser console for saved conversations.');
                  }}
                  style={{ color: 'var(--muted)' }}
                />
              </Tooltip>
              <Tooltip title="Configure AI prompt">
                <Button 
                  variant="ghost"
                  size="small"
                  icon={<Settings size={16} />}
                  onClick={() => {
                    setShowPromptModal(true);
                  }}
                  style={{ color: 'var(--muted)' }}
                />
              </Tooltip>
              <Switch
                size="small"
                checked={autoAnalysis}
                onChange={setAutoAnalysis}
                disabled={!realTimeData || hasExceededTokenLimit()}
                checkedChildren="Auto"
                unCheckedChildren="Manual"
              />
              {autoAnalysis && (
                <Select
                  size="small"
                  value={analysisInterval}
                  onChange={setAnalysisInterval}
                  style={{ width: '70px' }}
                  options={[
                    { label: '10s', value: 10 },
                    { label: '30s', value: 30 },
                    { label: '1m', value: 60 },
                    { label: '2m', value: 120 },
                    { label: '5m', value: 300 },
                  ]}
                />
              )}
            </Space>
          </div>
        }
      >
        {/* Token Quota Warning */}
        {user?.tokenUsage && (user.tokenUsage.tokensUsed / user.tokenUsage.limit) >= 0.9 && (
          <div 
            className="p-3 mb-3 rounded border"
            style={{
              backgroundColor: hasExceededTokenLimit() ? 'var(--red-bg)' : 'var(--amber-bg)',
              borderColor: hasExceededTokenLimit() ? 'var(--red)' : 'var(--amber)',
              color: hasExceededTokenLimit() ? 'var(--red)' : 'var(--amber)'
            }}
          >
            <div className="flex items-start gap-2">
              <Zap size={16} style={{ marginTop: '2px' }} />
              <div>
                {hasExceededTokenLimit() ? (
                  <>
                    <strong>Token Quota Exceeded</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                      You've used all {formatTokenCount(user.tokenUsage.limit)} tokens this month. 
                      AI analysis is disabled until your quota resets on the 1st of next month.
                    </p>
                  </>
                ) : (
                  <>
                    <strong>Token Quota Warning</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                      You've used {formatTokenCount(user.tokenUsage.tokensUsed)} of {formatTokenCount(user.tokenUsage.limit)} tokens ({Math.round((user.tokenUsage.tokensUsed / user.tokenUsage.limit) * 100)}%). 
                      Consider limiting AI analysis usage.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter Status */}
        {(() => {
          const activeFilter = activeFilters.get(feed._id || '');
          
          if (activeFilter && realTimeData) {
            // Calculate simple filter statistics
            let totalCount = 0;
            let matchCount = 0;
            
            if (Array.isArray(realTimeData)) {
              totalCount = realTimeData.length;
              const filteredData = applyFilters(feed._id || '', realTimeData);
              matchCount = Array.isArray(filteredData) ? filteredData.length : 0;
            } else if (realTimeData) {
              totalCount = 1;
              const filteredData = applyFilters(feed._id || '', realTimeData);
              matchCount = filteredData ? 1 : 0;
            }
            
            return (
              <div 
                className="flex items-center justify-between p-2 mb-3 rounded border"
                style={{
                  backgroundColor: 'var(--blue-bg)',
                  borderColor: 'var(--blue)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Filter size={14} style={{ color: 'var(--blue)' }} />
                  <span style={{ color: 'var(--blue)', fontSize: '13px', fontWeight: 500 }}>
                    {activeFilter.name}
                  </span>
                  <Badge 
                    count={`${matchCount}/${totalCount}`}
                    style={{ 
                      backgroundColor: 'var(--blue)',
                      fontSize: '10px'
                    }}
                  />
                </div>
                
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => removeFeedFilter(feed._id || '')}
                  style={{ 
                    color: 'var(--blue)',
                    fontSize: '11px',
                    padding: '2px 6px',
                    height: 'auto'
                  }}
                >
                  Turn Off
                </Button>
              </div>
            );
          }
          
          return null;
        })()}
        
        {/* Chat Messages */}
        <div 
          ref={chatMessagesRef}
          className="flex-1 overflow-y-auto space-y-3 mb-3"
          style={{ scrollBehavior: 'smooth' }}
        >
          {chatMessages.length === 0 && !currentAnalysis ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <Lightbulb size={48} style={{ color: 'var(--muted)', marginBottom: '16px' }} />
                <p className="text-xs" style={{ color: 'var(--muted)', fontWeight: 'normal' }}>
                  Please add your prompt first to see output
                </p>
                {!isConnected && (
                  <p style={{ color: 'var(--amber)', fontSize: '12px', marginTop: '8px' }}>
                    ⚠️ Backend disconnected
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {chatMessages.map((message) => {
                return (
                  <div key={message._id || message.timestamp} className="space-y-3">
                    {message.type === 'user' && (
                      <div className="flex justify-end">
                        <div 
                          className="p-3 max-w-[85%] rounded-lg border"
                          style={{ 
                            backgroundColor: 'var(--blue)',
                            borderColor: 'var(--blue)',
                            borderRadius: '12px 12px 4px 12px'
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <User size={14} style={{ color: 'white' }} />
                            <span className="text-sm font-medium" style={{ color: 'white' }}>You</span>
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                            {message.metadata?.tokenUsage && (
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                • {formatTokenCount(message.metadata.tokenUsage)}
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'white', fontSize: '14px' }}>
                            {message.content}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {message.type === 'ai' && (
                      <div className="flex justify-start">
                        <div 
                          className="p-3 max-w-[85%] rounded-lg border"
                          style={{ 
                            backgroundColor: 'var(--bg-0)',
                            borderColor: 'var(--line)',
                            borderRadius: '12px 12px 12px 4px'
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Bot size={14} style={{ color: 'var(--blue)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>AI Assistant</span>
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                            {message.metadata?.tokenUsage && (
                              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                                • {formatTokenCount(message.metadata.tokenUsage)}
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--ink)', fontSize: '14px' }} className="prose prose-invert max-w-none prose-p:mb-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Current User Prompt (when analyzing) */}
              {currentUserPrompt && (
                <div className="flex justify-end">
                  <div 
                    className="p-3 max-w-[85%] rounded-lg border"
                    style={{ 
                      backgroundColor: 'var(--blue)',
                      borderColor: 'var(--blue)',
                      borderRadius: '12px 12px 4px 12px'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <User size={14} style={{ color: 'white' }} />
                      <span className="text-sm font-medium" style={{ color: 'white' }}>You</span>
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ color: 'white', fontSize: '14px' }}>
                      {currentUserPrompt}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Current Analysis (Streaming) */}
              {currentAnalysis && (
                <div className="flex justify-start">
                  <div 
                    className="p-3 max-w-[85%] rounded-lg border"
                    style={{ 
                      backgroundColor: 'var(--bg-0)',
                      borderColor: 'var(--blue)',
                      borderRadius: '12px 12px 12px 4px'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--blue)' }}></div>
                      <Bot size={14} style={{ color: 'var(--blue)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>AI Assistant</span>
                      <span style={{ color: 'var(--blue)', fontSize: '10px', fontWeight: 'bold' }}>
                        typing...
                      </span>
                    </div>
                    <div style={{ color: 'var(--ink)', fontSize: '14px' }} className="prose prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentAnalysis}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat Input Footer */}
        <div className="flex-shrink-0 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-start gap-2">
            <TextArea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyPress}
              placeholder={
                hasExceededTokenLimit() 
                  ? "Token quota exceeded - AI analysis disabled"
                  : autoAnalysis ? "Auto-analysis is running... Pause to ask custom questions" 
                  : "Ask AI anything about the current data... (Press Enter to send)"
              }
              disabled={autoAnalysis || isAnalyzing || !realTimeData || !isConnected || hasExceededTokenLimit()}
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{
                backgroundColor: 'var(--bg-0)',
                color: 'var(--ink)',
                borderColor: 'var(--line)',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'none',
                opacity: autoAnalysis ? 0.6 : 1
              }}
              className="flex-1"
            />
            <Button
              variant="milkyway"
              onClick={handleSendChat}
              disabled={autoAnalysis || isAnalyzing || !realTimeData || !isConnected || !chatInput.trim() || hasExceededTokenLimit()}
              loading={isAnalyzing && !autoAnalysis}
              style={{
                height: '32px',
                flexShrink: 0,
                opacity: autoAnalysis ? 0.6 : 1
              }}
            >
              <Send className="w-4 h-4 mr-1" />
              Send
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs flex-1" style={{ color: 'var(--muted)' }}>
              {autoAnalysis ? '🤖 Auto-analysis mode: Using default prompts' : !isConnected ? '⚠️ Backend disconnected' : !realTimeData ? 'Waiting for data...' : 'Type your question or click Analyze for default insights'}
            </span>
          </div>
        </div>

        {/* Custom Prompt Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2" style={{ color: 'var(--ink)' }}>
              <Settings size={16} style={{ color: 'var(--blue)' }} />
              <span className="font-bold">AI Settings</span>
            </div>
          }
          open={showPromptModal}
          onOk={handlePromptSave}
          onCancel={() => setShowPromptModal(false)}
          okText="Save Settings"
          cancelText="Cancel"
          width={700}
          centered
          destroyOnHidden
          maskClosable={false}
          keyboard={true}
          className="ai-prompt-modal"
          styles={{
            mask: { 
              backgroundColor: 'rgba(14, 17, 22, 0.8)',
              backdropFilter: 'blur(4px)'
            },
            content: { 
              backgroundColor: 'var(--bg-1)', 
              borderRadius: '8px',
              border: '1px solid var(--line)',
              padding: 0,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            },
            header: { 
              backgroundColor: 'var(--bg-1)', 
              borderBottom: '1px solid var(--line)',
              padding: '20px 24px 16px 24px',
              borderRadius: '8px 8px 0 0',
              marginBottom: 0
            },
            body: { 
              backgroundColor: 'var(--bg-1)', 
              padding: '0 24px 20px 24px',
              color: 'var(--ink)'
            },
            footer: {
              backgroundColor: 'var(--bg-1)',
              borderTop: '1px solid var(--line)',
              padding: '16px 24px',
              borderRadius: '0 0 8px 8px',
              textAlign: 'right'
            }
          }}
          okButtonProps={{
            size: 'large',
            style: {
              backgroundColor: 'var(--blue)',
              borderColor: 'var(--blue)',
              color: 'white',
              fontWeight: '600',
              height: '40px',
              paddingLeft: '20px',
              paddingRight: '20px',
              borderRadius: '6px'
            },
            icon: <Edit size={16} />
          }}
          cancelButtonProps={{
            size: 'large',
            style: {
              backgroundColor: 'transparent',
              borderColor: 'var(--line)',
              color: 'var(--muted)',
              marginRight: '12px',
              height: '40px',
              paddingLeft: '20px',
              paddingRight: '20px',
              borderRadius: '6px',
              fontWeight: '500'
            }
          }}
        >
          <div className="space-y-6">
            <div>
              <label 
                className="block mb-3 font-semibold"
                style={{ color: 'var(--ink)' }}
              >
                <Lightbulb size={16} style={{ color: 'var(--blue)', marginRight: '8px', display: 'inline' }} />
                Your Custom AI Prompt:
              </label>
              <TextArea
                rows={6}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={`Enter your custom prompt here, or leave empty to use the feed default...\n\nExample: "${getDefaultPromptForCategory(feed.category)}"`}
                style={{ 
                  backgroundColor: 'var(--bg-0)', 
                  color: 'var(--ink)', 
                  borderColor: 'var(--line)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  lineHeight: '1.5',
                  padding: '12px'
                }}
                className="transition-all duration-200 hover:border-blue-500 focus:border-blue-500 focus:shadow-sm resize-none"
                autoSize={{ minRows: 6, maxRows: 10 }}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  💡 Tip: Be specific about what insights you want. Mention metrics, trends, or analysis focus.
                </div>
                <div className="flex items-center gap-3">
                  {customPrompt && (
                    <Button
                      variant="ghost"
                      size="small" 
                      onClick={handlePromptClear}
                      style={{ color: 'var(--muted)', padding: 0, height: 'auto', fontSize: '12px' }}
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={handlePromptReset}
                    style={{ color: 'var(--blue)', padding: 0, height: 'auto', fontSize: '12px' }}
                  >
                    Use Default
                  </Button>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {customPrompt.length} chars
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </Card>
    </div>
  );
}

// Simulate AI analysis (replace with actual API integration)
async function simulateAIAnalysis(data: any, prompt: string, category: string): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate a mock analysis based on category
  const responses = {
    crypto: `## 📈 Cryptocurrency Market Analysis

**Current Market Snapshot:**
Based on the real-time data, here are the key insights:

• **Market Trend**: The overall market shows ${Math.random() > 0.5 ? 'bullish' : 'bearish'} sentiment with moderate volatility
• **Key Observations**: Several altcoins showing strong momentum with potential breakout patterns
• **Risk Assessment**: Medium risk environment with opportunities for swing trading

**Actionable Insights:**
1. Monitor for volume confirmation on breakout signals
2. Consider position sizing based on current volatility levels
3. Watch for major support/resistance levels`,

    stocks: `## 📊 Stock Market Analysis

**Market Overview:**
Current market conditions indicate ${Math.random() > 0.5 ? 'positive' : 'cautious'} investor sentiment.

**Key Findings:**
• Sector rotation patterns emerging in technology and healthcare
• Volume patterns suggest institutional interest
• Economic indicators support current valuations

**Investment Considerations:**
1. Diversification across sectors recommended
2. Monitor earnings calendar for upcoming reports
3. Consider defensive positions given current volatility`,

    default: `## 🔍 Real-Time Data Analysis

**Data Summary:**
The current dataset reveals several interesting patterns and trends.

**Key Insights:**
• Data consistency shows ${Math.random() > 0.7 ? 'high' : 'moderate'} reliability
• Trending patterns indicate ${Math.random() > 0.5 ? 'upward' : 'sideways'} movement
• Anomaly detection suggests normal operational parameters

**Recommendations:**
1. Continue monitoring for pattern changes
2. Set alerts for significant threshold breaches
3. Consider historical comparisons for context`
  };

  return responses[category as keyof typeof responses] || responses.default;
}