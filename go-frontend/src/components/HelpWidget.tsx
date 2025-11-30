'use client';

import React, { useState } from 'react';
import { Button, Drawer, Collapse, CollapsePanel } from '@/components/ui';
import {
  HelpCircle,
  BookOpen,
  Lightbulb,
  Database,
  Zap,
  ShoppingCart,
  Settings,
  Rocket,
  MessageSquare,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface HelpWidgetProps {
  className?: string;
}

export default function HelpWidget({ className = "" }: HelpWidgetProps) {
  const [visible, setVisible] = useState(false);

  const showHelp = () => setVisible(true);
  const hideHelp = () => setVisible(false);

  const helpSections = [
    {
      key: 'getting-started',
      icon: <Rocket className="w-5 h-5" />,
      title: 'Getting Started',
      content: (
        <div className="space-y-4">
          <div>
            <h5 className="text-lg font-semibold text-white mb-3">Quick Start Checklist</h5>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="text-green-500 mt-1 w-4 h-4" />
                <div>
                  <strong className="text-white">1. Browse Marketplace</strong>
                  <br />
                  <span className="text-gray-400 text-xs">
                    Find existing feeds to subscribe to - great for beginners!
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="text-green-500 mt-1 w-4 h-4" />
                <div>
                  <strong className="text-white">2. Create Your First Feed</strong>
                  <br />
                  <span className="text-gray-400 text-xs">
                    Connect to a WebSocket or HTTP API for real-time data
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="text-green-500 mt-1 w-4 h-4" />
                <div>
                  <strong className="text-white">3. Set Custom AI Prompts</strong>
                  <br />
                  <span className="text-gray-400 text-xs">
                    Tell the AI exactly what insights you want from your data
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'feeds',
      icon: <Database className="w-5 h-5" />,
      title: 'Understanding Feeds',
      content: (
        <div className="space-y-4">
          <div>
            <h5 className="text-lg font-semibold text-white">Feed Types</h5>
            <div className="space-y-3">
              <div className="p-3 border border-blue-500/20 bg-blue-500/5 rounded-lg">
                <div className="flex items-start gap-3">
                  <Zap className="text-blue-500 w-5 h-5 mt-1" />
                  <div>
                    <strong className="text-white">WebSocket Feeds</strong>
                    <br />
                    <span className="text-gray-400 text-xs">
                      Real-time streaming data. Perfect for crypto prices, live sports, or any push-based data.
                    </span>
                    <br />
                    <code className="text-gray-400 text-xs">ws://api.example.com/crypto</code>
                  </div>
                </div>
              </div>
              
              <div className="p-3 border border-green-500/20 bg-green-500/5 rounded-lg">
                <div className="flex items-start gap-3">
                  <Database className="text-green-500 w-5 h-5 mt-1" />
                  <div>
                    <strong className="text-white">HTTP API Feeds</strong>
                    <br />
                    <span className="text-gray-400 text-xs">
                      Polls API endpoints at regular intervals. Great for weather, news, or any REST API.
                    </span>
                    <br />
                    <code className="text-gray-400 text-xs">https://api.weather.com/current</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'ai-prompts',
      icon: <Lightbulb className="w-5 h-5" />,
      title: 'AI Prompt Guide',
      content: (
        <div className="space-y-4">
          <div>
            <h5 className="text-lg font-semibold text-white">Writing Effective AI Prompts</h5>
            <div className="space-y-3">
              <div className="p-3 bg-gray-500/10 rounded-lg">
                <strong className="text-blue-500">For Trading Analysis:</strong>
                <br />
                <span className="text-gray-400 text-xs italic">
                  "Analyze price movements for BTC/USD. Focus on volatility patterns, support/resistance levels, 
                  and provide clear buy/sell signals with risk assessment for a day trader."
                </span>
              </div>
              
              <div className="p-3 bg-gray-500/10 rounded-lg">
                <strong className="text-green-500">For Learning:</strong>
                <br />
                <span className="text-gray-400 text-xs italic">
                  "Explain this weather data in simple terms for someone new to meteorology. 
                  Include what each metric means and how it affects daily conditions."
                </span>
              </div>
              
              <div className="p-3 bg-gray-500/10 rounded-lg">
                <strong className="text-amber-500">For Business:</strong>
                <br />
                <span className="text-gray-400 text-xs italic">
                  "Monitor these KPIs and alert me to any anomalies or trends that could impact 
                  our quarterly targets. Highlight actionable insights for management."
                </span>
              </div>
            </div>
            
            <hr className="my-4 border-gray-600" />
            
            <h5 className="text-lg font-semibold text-white">Prompt Best Practices</h5>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• <strong>Be specific</strong> about the type of analysis you want</li>
              <li>• <strong>Mention your expertise level</strong> (beginner, intermediate, expert)</li>
              <li>• <strong>Define "significant"</strong> - what threshold triggers an alert?</li>
              <li>• <strong>Specify output format</strong> - summary, bullet points, detailed analysis</li>
              <li>• <strong>Include context</strong> - what decisions will you make with this data?</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      key: 'marketplace',
      icon: <ShoppingCart className="w-5 h-5" />,
      title: 'Marketplace Guide',
      content: (
        <div className="space-y-4">
          <div>
            <h5 className="text-lg font-semibold text-white">Finding Quality Feeds</h5>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span className="text-gray-400 text-sm">
                  <strong>Look for active feeds</strong> - Check the "Last Updated" timestamp
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span className="text-gray-400 text-sm">
                  <strong>Read descriptions carefully</strong> - Understand what data you'll receive
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span className="text-gray-400 text-sm">
                  <strong>Check subscription count</strong> - Popular feeds are often reliable
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span className="text-gray-400 text-sm">
                  <strong>Start with free feeds</strong> - Test before committing to premium
                </span>
              </div>
            </div>
          </div>
          
          <hr className="border-gray-600" />
          
          <div>
            <h5 className="text-lg font-semibold text-white">Publishing Your Feeds</h5>
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <span className="text-gray-400 text-xs">
                When you create high-quality, reliable feeds, consider publishing them to help other users. 
                Popular feeds can even generate revenue through subscriptions!
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'troubleshooting',
      icon: <AlertCircle className="w-5 h-5" />,
      title: 'Troubleshooting',
      content: (
        <div className="space-y-4">
          <div>
            <h5 className="text-lg font-semibold text-white">Common Issues</h5>
            
            <div className="space-y-3">
              <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-lg">
                <strong className="text-red-500">Feed Connection Failed</strong>
                <div className="mt-2 space-y-1 text-xs text-gray-400">
                  <div>✓ Verify the URL is correct and accessible</div>
                  <div>✓ Check if authentication credentials are needed</div>
                  <div>✓ Ensure the data source is online</div>
                  <div>✓ Test with a simple curl command first</div>
                </div>
              </div>
              
              <div className="p-3 border border-orange-500/20 bg-orange-500/5 rounded-lg">
                <strong className="text-orange-500">AI Analysis Not Working</strong>
                <div className="mt-2 space-y-1 text-xs text-gray-400">
                  <div>✓ Check your token balance in profile settings</div>
                  <div>✓ Verify the feed is receiving data</div>
                  <div>✓ Try a simpler AI prompt first</div>
                  <div>✓ Refresh the page and try again</div>
                </div>
              </div>
              
              <div className="p-3 border border-blue-500/20 bg-blue-500/5 rounded-lg">
                <strong className="text-blue-500">Data Not Updating</strong>
                <div className="mt-2 space-y-1 text-xs text-gray-400">
                  <div>✓ Check your internet connection</div>
                  <div>✓ Verify the data source is still active</div>
                  <div>✓ Look for error messages in feed status</div>
                  <div>✓ Try refreshing the page</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'api-usage',
      icon: <Settings className="w-5 h-5" />,
      title: 'API Keys & Settings',
      content: (
        <div className="space-y-4">
          <div>
            <h5 className="text-lg font-semibold text-white">Getting Your API Keys</h5>
            <ol className="text-gray-400 text-sm space-y-2">
              <li>1. Click your profile avatar in the top right</li>
              <li>2. Go to "Profile" or "Settings"</li>
              <li>3. Find the "API Keys" section</li>
              <li>4. Generate new keys as needed</li>
            </ol>
          </div>
          
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <strong className="text-red-500">⚠️ Security Note</strong>
            <br />
            <span className="text-gray-400 text-xs">
              Never share your API keys publicly. Treat them like passwords and regenerate them if compromised.
            </span>
          </div>
          
          <div>
            <h5 className="text-lg font-semibold text-white">Using API Keys</h5>
            <div className="p-3 bg-gray-500/10 rounded-lg font-mono text-xs">
              <div className="text-gray-400">
                # Using Authorization header<br />
                curl -H "Authorization: Bearer your_api_key_here" \<br />
                &nbsp;&nbsp;&nbsp;&nbsp; {process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210'}/api/feeds/my-feeds
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      <Button
        variant="ghost"
        onClick={showHelp}
        className={className}
        title="Help & Documentation"
      >
        <HelpCircle className="w-4 h-4 mr-2" />
        Help
      </Button>

      <Drawer
        isOpen={visible}
        onClose={hideHelp}
        title={
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5" />
            <span>Help & Documentation</span>
          </div>
        }
        placement="right"
        width={500}
      >
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div 
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
              style={{ backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' }}
            >
              <BookOpen className="text-xl" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">
              Need Help?
            </h4>
            <p className="text-gray-400">
              Find answers to common questions and learn how to use the platform effectively.
            </p>
          </div>

          <Collapse ghost>
            {helpSections.map((section) => (
              <CollapsePanel
                header={
                  <div className="flex items-center gap-3">
                    <span className="text-blue-500">{section.icon}</span>
                    <span className="text-white font-medium">{section.title}</span>
                  </div>
                }
                key={section.key}
              >
                {section.content}
              </CollapsePanel>
            ))}
          </Collapse>

          <hr className="border-gray-600" />

          <div className="text-center">
            <p className="text-gray-400 text-xs">
              Still need help? Contact support or check the full documentation.
            </p>
            <br />
            <div className="flex items-center justify-center gap-3">
              <Button size="small" variant="default">
                <MessageSquare className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              <a href="/api-docs" className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                API Docs
              </a>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}