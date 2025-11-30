'use client';

import React, { useState } from 'react';
import { Modal, Input, TextArea, Button } from '@/components/ui';
import { Send, Code, FileText } from 'lucide-react';
import { WebSocketFeed } from '@/types/marketplace';
import { FeedService } from '@/services/feedService';
import { useToast } from '@/components/ui/Toast';

interface DataSubmissionModalProps {
  isOpen: boolean;
  feed: WebSocketFeed | null;
  token: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const DataSubmissionModal: React.FC<DataSubmissionModalProps> = ({
  isOpen,
  feed,
  token,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [dataFormat, setDataFormat] = useState<'json' | 'text'>('json');
  const [formData, setFormData] = useState({
    eventName: '',
    data: '',
  });
  const { success, error } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feed) return;

    try {
      setLoading(true);
      
      let parsedData = formData.data;
      if (dataFormat === 'json') {
        try {
          parsedData = JSON.parse(formData.data);
        } catch (parseError) {
          error('Invalid JSON format. Please check your data.');
          return;
        }
      }

      await FeedService.submitFeedData(
        feed._id!,
        {
          data: parsedData,
          eventName: formData.eventName || feed.eventName,
        },
        token
      );

      success('Data submitted successfully! Subscribers have been notified.');
      setFormData({ eventName: '', data: '' });
      onSuccess?.();
      onClose();
    } catch (submitError: any) {
      console.error('Error submitting data:', submitError);
      error(submitError.message || 'Failed to submit data');
    } finally {
      setLoading(false);
    }
  };

  const handleFormatChange = (format: 'json' | 'text') => {
    setDataFormat(format);
    setFormData(prev => ({ ...prev, data: '' })); // Clear data when format changes
  };

  const getPlaceholder = () => {
    if (dataFormat === 'json') {
      return `Enter JSON data for your feed. Example:

{
  "message": "Hello subscribers!",
  "timestamp": "${new Date().toISOString()}",
  "value": 123,
  "status": "active"
}`;
    } else {
      return `Enter text data for your feed. Example:

Hello everyone! This is an update from my feed.
Current status: Active
Time: ${new Date().toLocaleString()}`;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-white">
          <Send className="w-5 h-5 text-blue-500" />
          <span className="font-bold">Submit Data to Feed</span>
        </div>
      }
      size="xlarge"
    >
      {feed && (
        <div className="p-6">
          <div className="mb-6 p-4 rounded-lg bg-gray-800 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              {feed.icon && <span className="text-2xl">{feed.icon}</span>}
              <div>
                <h3 className="text-lg font-semibold text-white">{feed.name}</h3>
                <p className="text-sm text-gray-400">{feed.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>📊 Format: {feed.dataFormat}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white font-semibold mb-2">
                Event Name (Optional)
              </label>
              <Input
                value={formData.eventName}
                onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))}
                placeholder={`Leave empty to use default: ${feed.eventName}`}
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">
                Data Format
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={dataFormat === 'json' ? 'nebula' : 'ghost'}
                  onClick={() => handleFormatChange('json')}
                >
                  <Code className="w-4 h-4 mr-2" />
                  JSON
                </Button>
                <Button
                  type="button"
                  variant={dataFormat === 'text' ? 'nebula' : 'ghost'}
                  onClick={() => handleFormatChange('text')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Text
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">
                Data to Submit
              </label>
              <TextArea
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                rows={12}
                placeholder={getPlaceholder()}
                required
                className="font-mono text-sm leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                💡 This data will be immediately sent to all subscribers
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="nebula"
                  loading={loading}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Data
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
};

export default DataSubmissionModal;