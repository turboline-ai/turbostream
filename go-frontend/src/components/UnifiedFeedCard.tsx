"use client";

import React from 'react';
import './FeedCard.css';
import { Info, Eye, Pencil, Plus, Minus } from 'lucide-react';

export type FeedCardProps = {
  id: string;
  title: string;
  description: string;
  provider?: string;        // "System" or org name
  icon?: React.ReactNode;   // optional glyph
  verified?: boolean;
  live?: boolean;
  tags?: string[];
  isSubscribed: boolean;
  subscribedAt?: string;    // ISO
  subscriberCount?: number; // show only when not subscribed
  hasCustomPrompt?: boolean;

  onSubscribe?: (id: string) => void;
  onUnsubscribe?: (id: string) => void;
  onView?: (id: string) => void;
  onEditPrompt?: (id: string) => void;
  onMoreInfo?: (id: string) => void;
};

export default function UnifiedFeedCard(props: FeedCardProps) {
  const {
    id,
    title,
    description,
    provider,
    icon,
    verified,
    live,
    tags = [],
    isSubscribed,
    subscribedAt,
    subscriberCount,
    hasCustomPrompt,
    onSubscribe,
    onUnsubscribe,
    onView,
    onEditPrompt,
    onMoreInfo,
  } = props;

  return (
    <div className="feedcard panel" role="article" aria-label={title}>
      {/* Header */}
      <div className="feedcard__header">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {icon && <div style={{ fontSize: 24, lineHeight: 1 }}>{icon}</div>}
          <div>
            <div className="feedcard__title">
              <span>{title}</span>
            </div>
            {provider && (
              <div className="feedcard__provider">by {provider}</div>
            )}
          </div>
        </div>
        <div className="feedcard__meta">
          <span className={`livedot ${!live ? 'livedead' : ''}`} aria-label={live ? 'Live' : 'Offline'} />
          <span className="mono">{live ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      {/* Description */}
      <div className="feedcard__desc">{description}</div>

      {/* Tags removed per request */}

      {/* Footer actions */}
      <div className="feedcard__footer">
        <div className="feedcard__meta">
          {isSubscribed && subscribedAt && (
            <span className="muted" title="Subscribed at">
              Subscribed {new Date(subscribedAt).toLocaleDateString()}
            </span>
          )}

        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {onMoreInfo && (
            <button className="btn btn-ghost iconbtn" aria-label="More info" onClick={() => onMoreInfo(id)}>
              <Info size={16} />
            </button>
          )}
          {onView && (
            <button className="btn btn-ghost iconbtn" aria-label="View" onClick={() => onView(id)}>
              <Eye size={16} />
            </button>
          )}
          {isSubscribed ? (
            <>
              {onEditPrompt && (
                <button className="btn iconbtn" aria-label="Edit prompt" onClick={() => onEditPrompt(id)}>
                  <Pencil size={16} />
                </button>
              )}
              {onUnsubscribe && (
                <button className="btn iconbtn" aria-label="Unsubscribe" onClick={() => onUnsubscribe(id)}>
                  <Minus size={16} />
                </button>
              )}
            </>
          ) : (
            onSubscribe && (
              <button className="btn btn-primary iconbtn" aria-label="Subscribe" onClick={() => onSubscribe(id)}>
                <Plus size={16} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
