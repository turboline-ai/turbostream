import React, { memo } from 'react';
import { WebSocketFeed } from '@/types/marketplace';

interface FeedItemProps {
  feed: WebSocketFeed;
  isOwner: boolean;
  isActive: boolean;
  isNavigating: boolean;
  onClick: () => void;
}

const FeedItem: React.FC<FeedItemProps> = memo(({ feed, isOwner, isActive, isNavigating, onClick }) => {
  return (
    <button
      onClick={onClick}
      disabled={isNavigating}
      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive ? "bg-gray-800 border-l-4 border-blue-500" : ""
      }`}
    >
      {isNavigating ? (
        <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
      ) : (
        <div className={`w-3 h-3 rounded-full ${
          feed.isActive ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
      )}
      <div className="flex-1 text-left">
        <div className="text-white font-medium text-sm truncate">
          {feed.name || 'Unnamed Feed'}
        </div>
        <div className="text-gray-400 text-xs">
          {feed.category} • {isOwner ? 'Owner' : 'Subscribed'}
        </div>
      </div>
      <div className="text-gray-400 text-xs">
        {feed.subscriberCount || 0}
      </div>
    </button>
  );
});

FeedItem.displayName = 'FeedItem';

export default FeedItem;