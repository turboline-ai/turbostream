"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Input,
  Button,
  Space,
  Tag,
  Modal,
  Select,
  Empty,
  Typography,
  Divider,
  Badge,
  Dropdown,
  message,
  Avatar,
  Skeleton
} from "antd";
import {
  HistoryOutlined,
  SearchOutlined,
  StarOutlined,
  StarFilled,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  UploadOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  RobotOutlined,
  UserOutlined,
  MoreOutlined,
  FilterOutlined,
  CalendarOutlined
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  chatHistoryAPI,
  ChatConversation,
  ConversationFilters,
  ChatMessage,
  createChatMessage,
  formatTimestamp
} from "@/services/chatHistoryAPI";

const { Search } = Input;

// Custom CSS for dark mode modal
const darkModalStyles = `
  .dark-modal .ant-modal-content {
    background-color: #1f2937 !important;
    border-radius: 12px;
  }
  .dark-modal .ant-modal-close {
    color: #9ca3af !important;
  }
  .dark-modal .ant-modal-close:hover {
    color: #ffffff !important;
  }
  .dark-modal .ant-empty-description {
    color: #9ca3af !important;
  }
`;
const { Text, Title } = Typography;
const { Option } = Select;

export default function ChatHistoryPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<ChatMessage[]>([]);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  
  // Filter states
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Apply filters when filters change
  useEffect(() => {
    applyFilters();
  }, [conversations, filters, searchText, selectedCategory, showStarredOnly]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const allConversations = await chatHistoryAPI.getConversations();
      console.log(`📚 Loaded ${allConversations.length} conversations from API`);
      console.log('Sample conversation:', allConversations[0]);
      setConversations(allConversations);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      message.error("Failed to load chat history");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    try {
      const currentFilters: ConversationFilters = {
        ...filters,
        searchText: searchText || undefined,
        category: selectedCategory,
        isStarred: showStarredOnly || undefined
      };

      const filtered = await chatHistoryAPI.getConversations(currentFilters);
      setFilteredConversations(filtered);
    } catch (error) {
      console.error("Failed to apply filters:", error);
      setFilteredConversations([]);
    }
  };

  const handleViewConversation = async (conversation: ChatConversation) => {
    try {
      const messages = await chatHistoryAPI.getMessages(conversation._id!);
      setSelectedConversation(conversation);
      setSelectedMessages(messages);
      setShowConversationModal(true);
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
      message.error('Failed to load conversation messages');
    }
  };

  const handleToggleStar = async (conversationId: string) => {
    try {
      const conversation = conversations.find(conv => conv._id === conversationId);
      if (!conversation) return;
      
      const isStarred = !conversation.isStarred;
      await chatHistoryAPI.updateConversation(conversationId, { isStarred });
      
      setConversations(prev =>
        prev.map(conv =>
          conv._id === conversationId ? { ...conv, isStarred } : conv
        )
      );
      message.success(isStarred ? "Conversation starred" : "Star removed");
    } catch (error) {
      console.error('Failed to toggle star:', error);
      message.error("Failed to update conversation");
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    Modal.confirm({
      title: "Delete Conversation",
      content: "Are you sure you want to delete this conversation? This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await chatHistoryAPI.deleteConversation(conversationId);
          setConversations(prev => prev.filter(conv => conv._id !== conversationId));
          message.success("Conversation deleted");
        } catch (error) {
          console.error('Failed to delete conversation:', error);
          message.error("Failed to delete conversation");
        }
      }
    });
  };

  const handleRename = (conversationId: string, currentName: string) => {
    setEditingName(conversationId);
    setNewName(currentName);
  };

  const handleSaveRename = async (conversationId: string) => {
    if (newName.trim()) {
      try {
        await chatHistoryAPI.updateConversation(conversationId, { name: newName.trim() });
        setConversations(prev =>
          prev.map(conv =>
            conv._id === conversationId ? { ...conv, name: newName.trim() } : conv
          )
        );
        message.success("Conversation renamed");
      } catch (error) {
        console.error('Failed to rename conversation:', error);
        message.error("Failed to rename conversation");
      }
    }
    setEditingName(null);
    setNewName("");
  };

  const handleExport = async () => {
    try {
      const conversations = await chatHistoryAPI.getConversations();
      const data = JSON.stringify(conversations, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-history-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success("Chat history exported");
    } catch (error) {
      console.error('Failed to export conversations:', error);
      message.error("Failed to export chat history");
    }
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = e.target?.result as string;
        const importedConversations = JSON.parse(jsonData);
        
        // Note: Import functionality would need to be implemented on the backend
        // For now, just show a message that this feature is not yet available
        message.info("Import functionality is not yet available with the new backend system");
        
        // TODO: Implement bulk import API endpoint on backend
        /*
        await chatHistoryAPI.importConversations(importedConversations);
        loadConversations();
        message.success("Chat history imported successfully");
        */
      } catch (error) {
        console.error('Failed to import conversations:', error);
        message.error("Failed to import chat history");
      }
    };
    reader.readAsText(file);
  };

  const formatDate = (timestamp: string | number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffHours * 60);
      return diffMinutes <= 1 ? "just now" : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffHours < 24 * 7) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
    
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getConversationActions = (conversation: ChatConversation) => [
    {
      key: "view",
      icon: <EyeOutlined />,
      label: "View Conversation",
      onClick: () => handleViewConversation(conversation)
    },
    {
      key: "star",
      icon: conversation.isStarred ? <StarFilled /> : <StarOutlined />,
      label: conversation.isStarred ? "Remove Star" : "Add Star",
      onClick: () => handleToggleStar(conversation._id!)
    },
    {
      key: "rename",
      icon: <EditOutlined />,
      label: "Rename",
      onClick: () => handleRename(conversation._id!, conversation.name)
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete",
      danger: true,
      onClick: () => handleDeleteConversation(conversation._id!)
    }
  ];

  const categories = [...new Set(conversations.map(c => c.category))];

  return (
    <div className="min-h-screen bg-gray-900">
      <style dangerouslySetInnerHTML={{ __html: darkModalStyles }} />
      <div className="mx-auto px-6 py-8">
        {/* Dark Mode Header */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <HistoryOutlined className="text-white text-lg" />
                </div>
                <Title level={2} className="m-0 text-white">
                  Chat History
                </Title>
              </div>
              <Text className="text-gray-300 text-base">
                Manage your AI conversations across all feeds and analyze your interaction patterns
              </Text>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Badge count={conversations.length} showZero color="#2563eb" />
                <Text className="text-sm text-gray-400">Conversations</Text>
              </div>
              {/* Token Usage Summary */}
              {(() => {
                const totalTokens = conversations.reduce((sum, conv) => sum + (conv.totalTokenUsage || 0), 0);
                return totalTokens > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                      <span className="text-green-400 text-sm">💰</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-300">
                        {totalTokens.toLocaleString()}
                      </div>
                      <Text className="text-xs text-gray-400">Total Tokens</Text>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* Dark Mode Filters */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search
                  placeholder="Search conversations..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-80 dark-search"
                  size="large"
                  prefix={<SearchOutlined className="text-gray-400" />}
                  style={{ 
                    borderRadius: '8px',
                    border: '1px solid #4b5563',
                    backgroundColor: '#374151',
                    color: '#ffffff'
                  }}
                />
              </div>

              <Select
                placeholder="All Categories"
                value={selectedCategory}
                onChange={setSelectedCategory}
                allowClear
                size="large"
                className="w-48"
                style={{ 
                  borderRadius: '8px'
                }}
                dropdownStyle={{ backgroundColor: '#374151', border: '1px solid #4b5563' }}
                suffixIcon={<FilterOutlined className="text-gray-400" />}
              >
                {categories.map(category => (
                  <Option key={category} value={category}>
                    <div className="flex items-center gap-2 text-gray-200">
                      <div className={`w-2 h-2 rounded-full ${
                        category === 'Cryptocurrency' ? 'bg-yellow-400' :
                        category === 'custom' ? 'bg-blue-400' : 'bg-green-400'
                      }`} />
                      {category}
                    </div>
                  </Option>
                ))}
              </Select>

              <Button
                type={showStarredOnly ? "primary" : "default"}
                icon={<StarOutlined />}
                onClick={() => setShowStarredOnly(!showStarredOnly)}
                size="large"
                className={`rounded-lg ${
                  showStarredOnly 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 border-0 text-white' 
                    : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                }`}
              >
                Favorites
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                size="large"
                className="rounded-lg bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
              >
                Export
              </Button>

              <input
                type="file"
                accept=".json"
                style={{ display: "none" }}
                id="import-file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                }}
              />
              <Button
                icon={<UploadOutlined />}
                onClick={() => document.getElementById("import-file")?.click()}
                size="large"
                className="rounded-lg bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
              >
                Import
              </Button>
            </div>
          </div>
        </div>

        {/* Dark Mode Conversations Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="grid gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <Skeleton active paragraph={{ rows: 3 }} />
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-12 text-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div className="space-y-2">
                    <Text className="text-gray-300 text-lg">
                      {conversations.length === 0 
                        ? "No conversations yet" 
                        : "No conversations match your filters"
                      }
                    </Text>
                    <Text className="text-gray-400">
                      {conversations.length === 0 
                        ? "Start chatting with AI to create your first conversation!"
                        : "Try adjusting your search criteria."
                      }
                    </Text>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation._id}
                  className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:shadow-xl hover:border-blue-500 transition-all duration-200 cursor-pointer group"
                  onClick={() => handleViewConversation(conversation)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                              {conversation.name}
                            </h3>
                            {conversation.isStarred && (
                              <StarFilled className="text-yellow-400 text-lg" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <Text className="text-blue-400 font-medium">
                              {conversation.feedName}
                            </Text>
                            <Tag 
                              color={conversation.category === 'Cryptocurrency' ? 'gold' : 'blue'}
                              className="rounded-full px-3 py-1"
                            >
                              {conversation.category}
                            </Tag>
                          </div>
                        </div>
                      </div>
                      
                      {/* Content */}
                      {conversation.summary ? (
                        <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
                          <Text className="text-gray-200 leading-relaxed">
                            {conversation.summary}
                          </Text>
                        </div>
                      ) : conversation.messageCount === 0 ? (
                        <div className="bg-orange-900/30 rounded-lg p-4 border-l-4 border-orange-400">
                          <Text className="text-orange-300 italic">
                            📝 Empty conversation - No messages yet
                          </Text>
                        </div>
                      ) : (
                        <div className="bg-green-900/30 rounded-lg p-4 border-l-4 border-green-400">
                          <Text className="text-green-300">
                            💬 Active conversation with {conversation.messageCount} messages
                          </Text>
                        </div>
                      )}
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <CalendarOutlined />
                            <span>{formatDate(conversation.updatedAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageOutlined />
                            <span>{conversation.messageCount} messages</span>
                          </div>
                          {conversation.totalTokenUsage !== undefined && conversation.totalTokenUsage > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-green-400">💰</span>
                              <span className="text-green-300 font-medium">
                                {conversation.totalTokenUsage.toLocaleString()} tokens
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        size="small"
                        className="rounded-lg bg-blue-600 hover:bg-blue-500 border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewConversation(conversation);
                        }}
                      >
                        Open
                      </Button>
                      <Button
                        icon={conversation.isStarred ? <StarFilled /> : <StarOutlined />}
                        size="small"
                        className={`rounded-lg ${
                          conversation.isStarred 
                            ? 'text-yellow-400 border-yellow-400 bg-yellow-400/10' 
                            : 'text-gray-300 border-gray-600 bg-gray-700 hover:bg-gray-600'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStar(conversation._id!);
                        }}
                      />
                      <Dropdown
                        menu={{ items: getConversationActions(conversation) }}
                        trigger={["click"]}
                        dropdownRender={(menu) => (
                          <div className="bg-gray-800 border border-gray-600 rounded-lg">
                            {menu}
                          </div>
                        )}
                      >
                        <Button 
                          icon={<MoreOutlined />} 
                          size="small"
                          className="rounded-lg text-gray-300 border-gray-600 bg-gray-700 hover:bg-gray-600"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Dropdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dark Mode Conversation Modal */}
        <Modal
          title={null}
          open={showConversationModal}
          onCancel={() => setShowConversationModal(false)}
          width={1000}
          footer={null}
          className="dark-modal"
          style={{ top: 20 }}
        >
          {selectedConversation && (
            <div className="bg-gray-800 rounded-lg space-y-6">
              {/* Simple Modal Header */}
              <div className="bg-blue-600 -m-6 mb-6 p-6 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <MessageOutlined className="text-white text-lg" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-white">
                          {selectedConversation.name}
                        </h2>
                        <div className="flex items-center gap-2 text-blue-100">
                          <span>{selectedConversation.feedName}</span>
                          {selectedConversation.isStarred && (
                            <StarFilled className="text-yellow-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-blue-100 space-y-2">
                    <div className="text-2xl font-bold text-white">
                      {selectedMessages.length}
                    </div>
                    <div className="text-sm">Messages</div>
                    {selectedConversation.totalTokenUsage !== undefined && selectedConversation.totalTokenUsage > 0 && (
                      <div className="mt-2 text-sm bg-white/20 rounded-lg px-3 py-1">
                        💰 {selectedConversation.totalTokenUsage.toLocaleString()} tokens
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dark Messages */}
              <div className="max-h-[60vh] overflow-y-auto space-y-4 px-2">
                {selectedMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <Empty
                      description={<span className="text-gray-400">No messages in this conversation</span>}
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </div>
                ) : (
                  selectedMessages.map((message: ChatMessage, index) => (
                    <div key={message._id || index} className="space-y-2">
                      <div
                        className={`flex ${
                          message.type === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-3xl rounded-2xl p-4 ${
                            message.type === "user"
                              ? "bg-blue-600 text-white ml-12"
                              : "bg-gray-700 text-gray-100 mr-12"
                          }`}
                        >
                          {/* Message Header */}
                          <div className="flex items-center gap-2 mb-3">
                            <Avatar
                              size="small"
                              icon={message.type === "user" ? <UserOutlined /> : <RobotOutlined />}
                              className={
                                message.type === "user" 
                                  ? "bg-white/20" 
                                  : "bg-green-600"
                              }
                            />
                            <span className={`font-medium text-sm ${
                              message.type === "user" ? "text-blue-100" : "text-gray-300"
                            }`}>
                              {message.type === "user" ? "You" : "AI Assistant"}
                            </span>
                            <span className={`text-xs ${
                              message.type === "user" ? "text-blue-200" : "text-gray-400"
                            }`}>
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>

                          {/* Message Content */}
                          <div className="message-content">
                            {message.type === "ai" ? (
                              <div className="prose prose-sm max-w-none text-gray-200 leading-relaxed prose-invert">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {message.content || "No content"}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap leading-relaxed text-white">
                                {message.content || "No content"}
                              </div>
                            )}
                          </div>

                          {/* Token Usage */}
                          {message.metadata?.tokenUsage && (
                            <div className={`mt-3 pt-2 border-t ${
                              message.type === "user" 
                                ? "border-blue-400 text-blue-200" 
                                : "border-gray-600 text-gray-400"
                            } text-xs`}>
                              💰 Message tokens: {message.metadata.tokenUsage.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Dark Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-600">
                <div className="text-sm text-gray-400 space-y-1">
                  <div>
                    <Tag color="blue">{selectedConversation.category}</Tag>
                    <span className="ml-2">Last updated: {formatDate(selectedConversation.updatedAt)}</span>
                  </div>
                  {selectedConversation.totalTokenUsage !== undefined && selectedConversation.totalTokenUsage > 0 && (
                    <div className="text-green-400">
                      💰 Total conversation tokens: {selectedConversation.totalTokenUsage.toLocaleString()}
                    </div>
                  )}
                </div>
                <Button 
                  onClick={() => setShowConversationModal(false)}
                  size="large"
                  className="rounded-lg bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}