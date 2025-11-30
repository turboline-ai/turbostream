'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, Tag, Card } from '@/components/ui';
import {
  PlayCircle,
  CheckCircle,
  ArrowRight,
  Star,
  Globe,
  ShoppingCart,
  Lightbulb,
  LayoutDashboard
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InteractiveTutorialProps {
  visible: boolean;
  onClose: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  action?: {
    text: string;
    onClick: () => void;
  };
  completionKey?: string;
}

export default function InteractiveTutorial({ visible, onClose }: InteractiveTutorialProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Load completed steps from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('tutorial-completed-steps');
    if (stored) {
      setCompletedSteps(JSON.parse(stored));
    }
  }, []);

  // Save completed steps to localStorage
  const markStepAsCompleted = (stepId: string) => {
    const updated = [...new Set([...completedSteps, stepId])];
    setCompletedSteps(updated);
    localStorage.setItem('tutorial-completed-steps', JSON.stringify(updated));
  };

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Interactive Tutorial',
      description: 'Learn the platform in 5 minutes',
      icon: <PlayCircle className="text-2xl text-blue-500" size={24} />,
      content: (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="text-3xl text-white" size={32} />
          </div>
          <h4 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--ink)' }}>Master Realtime Analyzer in Minutes!</h4>
          <p style={{ color: 'var(--muted)' }}>
            This interactive tutorial will walk you through the key features:
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <LayoutDashboard className="text-blue-500 text-lg mb-2" size={20} />
              <div className="text-sm font-medium">Dashboard</div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <ShoppingCart className="text-green-500 text-lg mb-2" size={20} />
              <div className="text-sm font-medium">Marketplace</div>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Globe className="text-purple-500 text-lg mb-2" size={20} />
              <div className="text-sm font-medium">Create Feeds</div>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <Lightbulb className="text-orange-500 text-lg mb-2" size={20} />
              <div className="text-sm font-medium">AI Analysis</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'dashboard',
      title: 'Your Dashboard Overview',
      description: 'Mission control for your data feeds',
      icon: <LayoutDashboard className="text-2xl text-blue-500" size={24} />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
            <h5 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--ink)', margin: 0 }}>Dashboard Features:</h5>
            <div className="space-y-3 mt-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">📊</div>
                <div>
                  <div className="font-medium">Statistics Cards</div>
                  <div className="text-sm text-gray-600">Active feeds, subscriptions, total feeds</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">⚡</div>
                <div>
                  <div className="font-medium">Quick Actions</div>
                  <div className="text-sm text-gray-600">Create feeds and browse marketplace</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">📈</div>
                <div>
                  <div className="font-medium">Feed Management</div>
                  <div className="text-sm text-gray-600">Monitor and manage all your data feeds</div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
              💡 <strong>Tip:</strong> Your dashboard updates in real-time as feeds become active and start generating insights.
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'marketplace',
      title: 'Explore the Marketplace',
      description: 'Discover high-quality data feeds',
      icon: <ShoppingCart className="text-2xl text-green-500" size={24} />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-4 rounded-lg border border-green-500/20">
            <h5 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--ink)', margin: 0 }}>Why Start with Marketplace?</h5>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-500 mt-1" size={16} />
                <span><strong>No Setup Required:</strong> Feeds are already configured and tested</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-500 mt-1" size={16} />
                <span><strong>Quality Assured:</strong> Popular feeds are reliable and well-maintained</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-500 mt-1" size={16} />
                <span><strong>Learn by Example:</strong> See how others structure their data feeds</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-500 mt-1" size={16} />
                <span><strong>Instant Value:</strong> Start getting insights immediately</span>
              </li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <span style={{ fontWeight: '600', color: 'var(--ink)' }}>Popular Feed Types:</span>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between p-2 bg-gray-500/10 rounded">
                <div className="flex items-center gap-2">
                  <span>₿</span>
                  <span className="text-sm">Cryptocurrency Prices</span>
                </div>
                <Tag variant="nebula">Free</Tag>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-500/10 rounded">
                <div className="flex items-center gap-2">
                  <span>🌤️</span>
                  <span className="text-sm">Weather Data</span>
                </div>
                <Tag variant="nebula">Premium</Tag>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-500/10 rounded">
                <div className="flex items-center gap-2">
                  <span>📰</span>
                  <span className="text-sm">News & Events</span>
                </div>
                <Tag variant="nebula">Featured</Tag>
              </div>
            </div>
          </div>
        </div>
      ),
      action: {
        text: 'Explore Marketplace',
        onClick: () => {
          markStepAsCompleted('marketplace');
          router.push('/marketplace');
          onClose();
        }
      },
      completionKey: 'marketplace'
    },
    {
      id: 'create-feed',
      title: 'Create Your Own Feed',
      description: 'Connect to any data source',
      icon: <Globe className="text-2xl text-purple-500" size={24} />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-lg border border-purple-500/20">
            <h5 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--ink)', margin: 0 }}>Two Types of Data Feeds:</h5>
            
            <div className="space-y-3 mt-3">
              <Card className="border-blue-500/30">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Globe className="text-white" size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-blue-600">WebSocket Feeds</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Real-time streaming data pushed to your browser
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Perfect for: Crypto prices, live sports, chat messages
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card className="border-green-500/30">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Globe className="text-white" size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-green-600">HTTP API Feeds</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Polls API endpoints at regular intervals
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Perfect for: Weather updates, news feeds, business metrics
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
          
          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              🔧 <strong>Pro Tip:</strong> Always test your connection first! The platform includes built-in testing 
              to verify your data source before creating the feed.
            </span>
          </div>
        </div>
      ),
      action: {
        text: 'Create Your Feed',
        onClick: () => {
          markStepAsCompleted('create-feed');
          router.push('/feeds/register');
          onClose();
        }
      },
      completionKey: 'create-feed'
    },
    {
      id: 'ai-analysis',
      title: 'AI-Powered Analysis',
      description: 'Turn data into insights',
      icon: <Lightbulb className="text-2xl text-orange-500" size={24} />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 p-4 rounded-lg border border-orange-500/20">
            <h5 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--ink)', margin: 0 }}>AI Analysis Features:</h5>
            
            <div className="space-y-3 mt-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">🤖</div>
                <div>
                  <div className="font-medium">Automatic Analysis</div>
                  <div className="text-sm text-gray-600">AI analyzes your data automatically as it streams in</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">✨</div>
                <div>
                  <div className="font-medium">Custom Prompts</div>
                  <div className="text-sm text-gray-600">Tell AI exactly what insights you want</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">📊</div>
                <div>
                  <div className="font-medium">Real-time Insights</div>
                  <div className="text-sm text-gray-600">Get analysis as data updates, not just once</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <span style={{ fontWeight: '600', color: 'var(--ink)' }}>Example Custom Prompts:</span>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <div>• "Focus on risk metrics and provide trading signals"</div>
              <div>• "Explain patterns in simple terms for beginners"</div>
              <div>• "Alert me to unusual activity or anomalies"</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'completion',
      title: 'You\'re Ready to Go! 🎉',
      description: 'Start your data analysis journey',
      icon: <Star className="text-2xl text-yellow-500" size={24} />,
      content: (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-3xl text-white" size={32} />
          </div>
          
          <h4 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--ink)' }}>Congratulations!</h4>
          <p style={{ color: 'var(--muted)' }}>
            You now understand the core concepts of Realtime Analyzer. Here's your action plan:
          </p>
          
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
              <div>
                <div className="font-medium">Start with Marketplace</div>
                <div className="text-sm text-gray-600">Subscribe to 1-2 feeds to see the platform in action</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
              <div>
                <div className="font-medium">Try Custom AI Prompts</div>
                <div className="text-sm text-gray-600">Experiment with different analysis styles</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
              <div>
                <div className="font-medium">Create Your Own Feed</div>
                <div className="text-sm text-gray-600">Connect your own data sources for personalized insights</div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg">
            <span style={{ color: 'var(--muted)' }}>
              Remember: The help widget (?) is always available if you need assistance!
            </span>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('tutorial-completed', 'true');
    onClose();
  };

  return (
    <Modal
      isOpen={visible}
      onClose={onClose}
      size="large"
      variant="default"
    >
      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>
              Step {currentStep + 1} of {tutorialSteps.length}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Header */}
        <div className="text-center mb-6">
          <div className="mb-4">
            {currentStepData.icon}
          </div>
          <h3 style={{ color: 'var(--ink)', marginBottom: 8, fontSize: '24px', fontWeight: '600' }}>
            {currentStepData.title}
          </h3>
          <span style={{ color: 'var(--muted)' }}>
            {currentStepData.description}
          </span>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {currentStepData.content}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            onClick={handlePrevious}
            disabled={currentStep === 0}
            variant="ghost"
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {currentStepData.action && (
              <Button 
                variant="nebula"
                onClick={currentStepData.action.onClick}
              >
                {currentStepData.action.text}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
            
            {currentStep === tutorialSteps.length - 1 ? (
              <Button variant="nebula" onClick={handleFinish}>
                Finish Tutorial
              </Button>
            ) : (
              <Button 
                variant="nebula"
                onClick={handleNext}
              >
                Next
                <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}