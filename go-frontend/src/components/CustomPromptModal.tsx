'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, TextArea } from '@/components/ui';
import { Edit, Lightbulb, X } from 'lucide-react';
import { UserSubscription } from '@/types/marketplace';

interface CustomPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: string) => Promise<void>;
  subscription?: UserSubscription;
  feedName: string;
  currentPrompt?: string;
}

const CustomPromptModal: React.FC<CustomPromptModalProps> = ({
  isOpen,
  onClose,
  onSave,
  feedName,
  currentPrompt = ''
}) => {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update prompt state when currentPrompt prop changes
  useEffect(() => {
    setPrompt(currentPrompt || '');
  }, [currentPrompt]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await onSave(prompt);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save custom prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPrompt(currentPrompt); // Reset to original value
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <Edit style={{ color: 'var(--blue)' }} size={18} />
          <span className="font-bold">Custom AI Prompt - {feedName}</span>
        </div>
      }
      size="large"
      variant="default"
    >
      <div className="space-y-6">
        {/* Description */}
        <div>
          <span style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.5' }}>
            Create a custom prompt to personalize AI analysis for this feed. 
            The AI will use this prompt when analyzing data from{' '}
            <span style={{ color: 'var(--ink)', fontWeight: '600' }}>{feedName}</span>.
          </span>
        </div>

        {/* Tips Section */}
        <div 
          className="p-4 rounded-lg border-l-4"
          style={{ 
            backgroundColor: `var(--blue)15`, 
            borderLeftColor: 'var(--blue)',
            border: '1px solid var(--line)',
            borderRadius: '6px'
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb style={{ color: 'var(--blue)' }} size={16} />
            <span style={{ color: 'var(--ink)', fontWeight: '600', fontSize: '14px' }}>
              Tips for effective prompts:
            </span>
          </div>
          <ul className="space-y-1 text-sm" style={{ color: 'var(--muted)' }}>
            <li>• Be specific about what insights you want</li>
            <li>• Mention your expertise level (beginner, intermediate, expert)</li>
            <li>• Include any specific metrics or patterns to focus on</li>
            <li>• Specify the format you prefer (summary, detailed analysis, etc.)</li>
          </ul>
        </div>

        {/* Input Section */}
        <div>
          <label 
            className="block mb-3 font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            <Edit style={{ color: 'var(--blue)', marginRight: '8px' }} size={16} />
            Your Custom AI Prompt:
          </label>
          <TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder="Example: Analyze this crypto data for a beginner trader. Focus on price trends, volume patterns, and provide clear buy/hold/sell recommendations with explanations..."
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
              💡 Be specific and clear about your analysis needs
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {prompt.length} characters
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div 
            className="p-3 rounded-lg border-l-4"
            style={{ 
              backgroundColor: `var(--amber)15`, 
              borderLeftColor: 'var(--amber)',
              border: '1px solid var(--line)',
              borderRadius: '6px'
            }}
          >
            <span style={{ color: 'var(--amber)', fontSize: '14px' }}>
              ⚠️ {error}
            </span>
          </div>
        )}

        {/* Example Prompts Section */}
        <details className="border-t pt-4" style={{ borderColor: 'var(--line)' }}>
          <summary 
            className="cursor-pointer font-medium mb-3 hover:opacity-80 transition-opacity"
            style={{ color: 'var(--ink)' }}
          >
            📋 Example Prompts
          </summary>
          <div className="space-y-3 mt-4">
            <div 
              className="p-3 rounded-lg"
              style={{ 
                backgroundColor: 'var(--bg-0)', 
                border: '1px solid var(--line)',
                borderRadius: '6px'
              }}
            >
              <div style={{ color: 'var(--blue)', fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
                For Crypto Trading:
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: '1.4' }}>
                "I'm an intermediate crypto trader. Analyze price movements, volume trends, and market sentiment. Highlight potential support/resistance levels and suggest optimal entry/exit points."
              </span>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ 
                backgroundColor: 'var(--bg-0)', 
                border: '1px solid var(--line)',
                borderRadius: '6px'
              }}
            >
              <div style={{ color: 'var(--blue)', fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
                For Risk Management:
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: '1.4' }}>
                "Focus on risk metrics and volatility patterns. I need alerts for unusual price movements or volume spikes that might indicate market manipulation or major events."
              </span>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ 
                backgroundColor: 'var(--bg-0)', 
                border: '1px solid var(--line)',
                borderRadius: '6px'
              }}
            >
              <div style={{ color: 'var(--blue)', fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
                For Learning:
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: '1.4' }}>
                "Explain the data in simple terms for a beginner. Help me understand what different indicators mean and why certain patterns are significant."
              </span>
            </div>
          </div>
        </details>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            variant="ghost"
            size="large"
            style={{
              height: '40px',
              paddingLeft: '20px',
              paddingRight: '20px',
              borderRadius: '6px',
              fontWeight: '500'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            disabled={loading || prompt.trim().length === 0}
            variant="nebula"
            size="large"
            style={{
              fontWeight: '600',
              height: '40px',
              paddingLeft: '20px',
              paddingRight: '20px',
              borderRadius: '6px'
            }}
          >
            <Edit size={16} className="mr-2" />
            {loading ? 'Saving...' : 'Save Prompt'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CustomPromptModal;