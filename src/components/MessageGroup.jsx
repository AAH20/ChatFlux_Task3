import React from 'react';

/**
 * MessageGroup component
 * 
 * Displays a group of messages from the same sender
 * 
 * @param {Object} group - The message group to display
 * @param {function} getAgentColor - Function to get agent color by ID
 * @param {function} getRoleColor - Function to get role color by ID
 * @param {string} userRole - Current user's role
 */
const MessageGroup = ({ group, getAgentColor, getRoleColor, userRole }) => {
  // Get appropriate color based on message sender type
  const getBorderColor = () => {
    if (group.role === "agent") {
      return getAgentColor(group.agentId);
    } else if (group.role === "user") {
      return getRoleColor(userRole);
    }
    return 'transparent';
  };
  
  // Get the sender name for display
  const getSenderName = () => {
    if (group.role === "user") {
      return group.senderName || "User";
    } else if (group.role === "agent") {
      return group.agentName || "Assistant";
    }
    return "Unknown";
  };
  
  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message-group ${group.role}`}>
      <div 
        className="message-bubble"
        style={{
          borderLeft: group.role === "agent" ? `4px solid ${getBorderColor()}` : undefined,
          borderRight: group.role === "user" ? `4px solid ${getBorderColor()}` : undefined
        }}
      >
        <div className="message-header">
          <span 
            className="sender-name"
            style={{ color: getBorderColor() }}
          >
            {getSenderName()}
          </span>
          {group.messages[0]?.timestamp && (
            <span className="message-time">
              {formatTime(group.messages[0].timestamp)}
            </span>
          )}
        </div>
        
        <div className="messages-container">
          {group.messages.map((msg, i) => (
            <div 
              key={msg.id || i} 
              className="message-content"
            >
              {msg.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessageGroup; 