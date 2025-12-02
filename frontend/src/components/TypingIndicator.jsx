import React from 'react';

const TypingIndicator = ({ users = [], isGroup = false }) => {
  if (!users || users.length === 0) return null;

  // For multiple users, we can show up to 3 typing indicators
  const displayUsers = users.slice(0, 3);
  const remainingCount = users.length - displayUsers.length;

  return (
    <div className="flex flex-col space-y-2 animate-fadeIn">
      {displayUsers.map((user, index) => (
        <div key={user._id || index} className="flex items-start space-x-3">
          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-primary-content text-sm font-semibold flex-shrink-0">
            {user.profilePic ? (
              <img 
                src={user.profilePic} 
                alt={user.fullName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{user.fullName?.charAt(0)?.toUpperCase() || '?'}</span>
            )}
          </div>

          {/* Messenger-style Typing Bubble */}
          <div className="typing-bubble bg-base-200 dark:bg-base-300 rounded-2xl px-4 py-3 max-w-[200px] relative shadow-sm">
            {/* Bubble Tail */}
            <div className="absolute left-[-8px] top-[12px] w-0 h-0 border-t-[8px] border-t-transparent border-r-[8px] border-r-base-200 dark:border-r-base-300 border-b-[8px] border-b-transparent"></div>
            
            {/* User Name (for groups or multiple users) */}
            {(isGroup || users.length > 1) && (
              <div className="text-xs font-medium text-base-content/70 mb-1">
                {user.fullName}
              </div>
            )}
            
            {/* Animated Dots */}
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-base-content/60 rounded-full animate-typing-dot-1"></div>
                <div className="w-2 h-2 bg-base-content/60 rounded-full animate-typing-dot-2"></div>
                <div className="w-2 h-2 bg-base-content/60 rounded-full animate-typing-dot-3"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Show count if more users are typing */}
      {remainingCount > 0 && (
        <div className="ml-11 text-xs text-base-content/50">
          and {remainingCount} more {remainingCount === 1 ? 'person is' : 'people are'} typing...
        </div>
      )}
    </div>
  );
};

export default TypingIndicator;