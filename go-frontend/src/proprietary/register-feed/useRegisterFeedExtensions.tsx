'use client';

import { useCallback, useMemo } from 'react';
import { Card, Input, Checkbox, Tag } from '@/components/ui';
import { Info, Eye } from 'lucide-react';

interface RegisterFeedExtensionsArgs {
  formData: {
    website: string;
    documentation: string;
    tags: string;
    isPublic: boolean;
  };
  handleChange: (field: string, value: any) => void;
}

interface RegisterFeedExtensionsResult {
  metadataSection: React.ReactNode;
  visibilitySection: React.ReactNode;
  extendPayload: (payload: Record<string, unknown>) => Record<string, unknown>;
  previewExtras: React.ReactNode;
}

export function useRegisterFeedExtensions({ formData, handleChange }: RegisterFeedExtensionsArgs): RegisterFeedExtensionsResult {
  const metadataSection = useMemo(() => (
    <Card 
      title={<div className="flex items-center gap-2"><Info className="w-4 h-4 text-white" /> Feed Metadata</div>}
      className="bg-gray-700/30 border-gray-600 p-5"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-white font-medium mb-2 block">Website (Optional)</span>
            <Input
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://yourwebsite.com"
              className="h-10 pl-10"
            />
          </div>
          <div>
            <span className="text-white font-medium mb-2 block">Documentation (Optional)</span>
            <Input
              type="url"
              value={formData.documentation}
              onChange={(e) => handleChange('documentation', e.target.value)}
              placeholder="https://docs.yourapi.com"
              className="h-10 pl-10"
            />
          </div>
        </div>

        <div>
          <span className="text-white font-medium mb-2 block">Tags (Optional)</span>
          <Input
            value={formData.tags}
            onChange={(e) => handleChange('tags', e.target.value)}
            placeholder="crypto, bitcoin, real-time, trading"
            className="w-full h-10"
          />
          <span className="text-gray-400 text-xs mt-1">
            Comma-separated tags to help users discover your feed
          </span>
        </div>
      </div>
    </Card>
  ), [formData.documentation, formData.tags, formData.website, handleChange]);

  const visibilitySection = useMemo(() => (
    <Card 
      title={<div className="flex items-center gap-2"><Eye className="w-4 h-4 text-white" /> Visibility Settings</div>}
      className="bg-gray-700/30 border-gray-600 p-5"
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={formData.isPublic}
          onChange={(e) => handleChange('isPublic', e.target.checked)}
        />
        <div>
          <span className="text-white font-medium">Make feed public</span>
          <div className="text-gray-400 text-sm mt-1">
            Allow other users to discover and use this feed in the marketplace
          </div>
        </div>
      </div>
    </Card>
  ), [formData.isPublic, handleChange]);

  const extendPayload = useCallback((payload: Record<string, unknown>) => {
    const tagsArray = formData.tags
      ? formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    return {
      ...payload,
      isPublic: formData.isPublic,
      tags: tagsArray,
      website: formData.website,
      documentation: formData.documentation,
    };
  }, [formData.documentation, formData.isPublic, formData.tags, formData.website]);

  const previewExtras = useMemo(() => (
    <div className="space-y-3">
      <div>
        <span className="text-gray-400 text-sm">Visibility</span>
        <div className="flex items-center gap-2 mt-1">
          <Tag variant={formData.isPublic ? 'success' : 'default'}>
            {formData.isPublic ? 'Public' : 'Private'}
          </Tag>
        </div>
      </div>

      {formData.tags && (
        <div>
          <span className="text-gray-400 text-sm">Tags</span>
          <div className="mt-1">
            {formData.tags.split(',').map((tag, index) => (
              <Tag key={index} className="mr-1 mb-1">
                {tag.trim()}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  ), [formData.isPublic, formData.tags]);

  return {
    metadataSection,
    visibilitySection,
    extendPayload,
    previewExtras,
  };
}
