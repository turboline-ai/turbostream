'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, Tag } from '@/components/ui';
import {
  Rocket,
  Zap,
  Eye,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  Globe,
  LayoutDashboard,
  ShoppingCart,
  Plus,
  Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingTourProps {
  visible: boolean;
  onClose: () => void;
}

export default function OnboardingTour({ visible, onClose }: OnboardingTourProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Check if user has completed certain actions to mark steps as complete
  useEffect(() => {
    if (user) {
      // Mark step 0 (account creation) as complete since user is logged in
      setCompletedSteps(prev => [...new Set([...prev, 0])]);
    }
  }, [user]);

  const tourSteps = [
    {
      title: "Welcome to Realtime Analyzer! 🎉",
      icon: <Rocket className="text-2xl" size={24} />,
      content: (
        <div className="space-y-4">
          <p style={{ color: 'var(--muted)', fontSize: '16px' }}>
            You're now part of a powerful platform that turns streaming data into intelligent insights using AI.
          </p>
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
            <h5 style={{ color: 'var(--ink)', margin: 0, fontSize: '16px', fontWeight: '600' }}>What You Can Do:</h5>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--muted)' }}>
              <li>• Connect to real-time data feeds (crypto, weather, APIs)</li>
              <li>• Get AI-powered analysis and insights automatically</li>
              <li>• Create custom AI prompts for specific analysis</li>
              <li>• Share and discover feeds in the marketplace</li>
            </ul>
          </div>
        </div>
      ),
      action: {
        text: "Let's Start!",
        onClick: () => setCurrentStep(1)
      }
    },
    {
      title: "Explore Your Dashboard",
      icon: <LayoutDashboard className="text-2xl" size={24} />,
      content: (
        <div className="space-y-4">
          <p style={{ color: 'var(--muted)' }}>
            Your dashboard is mission control. Here you can see your active feeds, subscriptions, and key statistics.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="text-blue-500 font-bold text-lg">0</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Active Feeds</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="text-green-500 font-bold text-lg">0</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Subscriptions</div>
            </div>
            <div className="text-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <div className="text-amber-500 font-bold text-lg">0</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Total Feeds</div>
            </div>
          </div>
        </div>
      ),
      action: {
        text: "Got it!",
        onClick: () => setCurrentStep(2)
      }
    },
    {
      title: "Browse the Marketplace",
      icon: <ShoppingCart className="text-2xl" size={24} />,
      content: (
        <div className="space-y-4">
          <p style={{ color: 'var(--muted)' }}>
            The marketplace is where you discover high-quality data feeds created by other users. 
            Perfect for getting started quickly!
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-500/10 rounded-lg">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">₿</div>
              <div className="flex-1">
                <div className="font-medium" style={{ color: 'var(--ink)' }}>Bitcoin Price Feed</div>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>Real-time BTC/USD prices</div>
              </div>
              <Tag variant="nebula">Free</Tag>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-500/10 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">🌤️</div>
              <div className="flex-1">
                <div className="font-medium" style={{ color: 'var(--ink)' }}>Weather Updates</div>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>Global weather conditions</div>
              </div>
              <Tag variant="nebula">Premium</Tag>
            </div>
          </div>
        </div>
      ),
      action: {
        text: "Browse Marketplace",
        onClick: () => {
          setCompletedSteps(prev => [...new Set([...prev, 2])]);
          router.push('/marketplace');
          onClose();
        }
      }
    },
    {
      title: "Create Your First Feed",
      icon: <Plus className="text-2xl" size={24} />,
      content: (
        <div className="space-y-4">
          <p style={{ color: 'var(--muted)' }}>
            Ready to create your own data feed? You can connect to any WebSocket or HTTP API 
            to start streaming data and getting AI insights.
          </p>
          <div className="space-y-3">
            <div className="p-4 border-2 border-dashed border-blue-500/30 rounded-lg text-center">
              <Globe className="text-3xl text-blue-500 mb-2 mx-auto" size={32} />
              <div className="font-medium" style={{ color: 'var(--ink)' }}>WebSocket Feed</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>For real-time streaming data</div>
            </div>
            <div className="p-4 border-2 border-dashed border-green-500/30 rounded-lg text-center">
              <Zap className="text-3xl text-green-500 mb-2 mx-auto" size={32} />
              <div className="font-medium" style={{ color: 'var(--ink)' }}>HTTP API Feed</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>For polling APIs regularly</div>
            </div>
          </div>
        </div>
      ),
      action: {
        text: "Create Feed",
        onClick: () => {
          setCompletedSteps(prev => [...new Set([...prev, 3])]);
          router.push('/feeds/register');
          onClose();
        }
      }
    },
    {
      title: "AI-Powered Analysis",
      icon: <Lightbulb className="text-2xl" size={24} />,
      content: (
        <div className="space-y-4">
          <p style={{ color: 'var(--muted)' }}>
            The real magic happens with AI analysis. Every data feed can be analyzed automatically, 
            and you can create custom prompts for specific insights.
          </p>
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-lg border border-purple-500/20">
            <h5 style={{ color: 'var(--ink)', margin: 0, fontSize: '16px', fontWeight: '600' }}>
              <Lightbulb className="inline mr-2" size={16} />
              Pro Tip: Custom AI Prompts
            </h5>
            <div className="mt-2 space-y-2 text-sm" style={{ color: 'var(--muted)' }}>
              <div><strong>For Trading:</strong> "Focus on risk metrics and volatility patterns"</div>
              <div><strong>For Learning:</strong> "Explain this data in simple terms for a beginner"</div>
              <div><strong>For Alerts:</strong> "Notify me of any unusual patterns or anomalies"</div>
            </div>
          </div>
        </div>
      ),
      action: {
        text: "Understood!",
        onClick: () => setCurrentStep(5)
      }
    },
    {
      title: "You're All Set! 🚀",
      icon: <Star className="text-2xl" size={24} />,
      content: (
        <div className="space-y-4">
          <p style={{ color: 'var(--muted)', fontSize: '16px' }}>
            Congratulations! You now know the basics of Realtime Analyzer. 
            Start with browsing the marketplace or creating your first feed.
          </p>
          <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
            <h5 style={{ color: 'var(--ink)', margin: 0, fontSize: '16px', fontWeight: '600' }}>
              <CheckCircle className="inline mr-2 text-green-500" size={16} />
              Quick Start Checklist
            </h5>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-500" size={16} />
                <span style={{ color: 'var(--muted)' }}>Account created and verified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-gray-400 rounded-sm"></div>
                <span style={{ color: 'var(--muted)' }}>Subscribe to your first marketplace feed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-gray-400 rounded-sm"></div>
                <span style={{ color: 'var(--muted)' }}>Create your own data feed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-gray-400 rounded-sm"></div>
                <span style={{ color: 'var(--muted)' }}>Try a custom AI prompt</span>
              </div>
            </div>
          </div>
        </div>
      ),
      action: {
        text: "Start Exploring!",
        onClick: () => {
          setCompletedSteps(prev => [...new Set([...prev, 5])]);
          onClose();
        }
      }
    }
  ];

  const currentStepData = tourSteps[currentStep];

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipTour = () => {
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
        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2">
            {tourSteps.map((step, index) => (
              <React.Fragment key={index}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    completedSteps.includes(index)
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {completedSteps.includes(index) ? (
                    <CheckCircle size={16} />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < tourSteps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      completedSteps.includes(index) ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <div className="text-center mb-6">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }}
          >
            {currentStepData.icon}
          </div>
          <h3 style={{ color: 'var(--ink)', marginBottom: 16, fontSize: '24px', fontWeight: '600' }}>
            {currentStepData.title}
          </h3>
        </div>

        <div className="mb-8">
          {currentStepData.content}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button onClick={handlePrevious} variant="ghost">
                Previous
              </Button>
            )}
            <Button onClick={handleSkipTour} variant="ghost" style={{ color: 'var(--muted)' }}>
              Skip Tour
            </Button>
          </div>
          
          <Button 
            onClick={currentStepData.action.onClick}
            variant="nebula"
          >
            {currentStep < tourSteps.length - 1 ? (
              <>
                {currentStepData.action.text}
                <ArrowRight size={16} className="ml-2" />
              </>
            ) : (
              <>
                <CheckCircle size={16} className="mr-2" />
                {currentStepData.action.text}
              </>
            )}
          </Button>
        </div>

        {/* Step Counter */}
        <div className="text-center mt-4">
          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>
            Step {currentStep + 1} of {tourSteps.length}
          </span>
        </div>
      </div>
    </Modal>
  );
}