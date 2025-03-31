import React from 'react';
import MessageGroup from './MessageGroup';

/**
 * MessageList component
 * 
 * Displays the list of messages in a conversation
 * 
 * @param {Object[]} groupedMessages - Messages grouped by sender
 * @param {function} getAgentColor - Function to get agent color by ID
 * @param {function} getRoleColor - Function to get role color by ID
 * @param {string} activeContextName - Name of the active context
 * @param {string} userRole - Current user's role
 * @param {React.RefObject} messagesEndRef - Ref for auto-scrolling
 */
const MessageList = ({ 
  groupedMessages, 
  getAgentColor, 
  getRoleColor, 
  activeContextName,
  userRole,
  messagesEndRef 
}) => {
  return (
    <div className="message-area">
      <div className="message-header">
        <h3 className="active-context-name">{activeContextName || "Chat"}</h3>
      </div>
      
      <div className="message-list">
        {groupedMessages.map((group, idx) => (
          <MessageGroup 
            key={idx}
            group={group}
            getAgentColor={getAgentColor}
            getRoleColor={getRoleColor}
            userRole={userRole}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList; 