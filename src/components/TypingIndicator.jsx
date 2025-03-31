import React from 'react';

/**
 * TypingIndicator component
 * 
 * Shows an animation when the AI agent is typing
 * 
 * @param {boolean} isTyping - Whether AI is currently typing
 * @param {function} getAgentColor - Function to get agent color
 * @param {string} activeAgent - Current active agent ID
 * @param {string} agentName - Display name of the current agent
 */
const TypingIndicator = ({ isTyping, getAgentColor, activeAgent, agentName }) => {
  if (!isTyping) return null;
  
  const dotColor = getAgentColor(activeAgent);
  
  return (
    <div className="typing-indicator">
      <span className="typing-name" style={{ color: dotColor }}>
        {agentName || 'AI'}
      </span>
      <div className="typing-dots">
        <div className="typing-dot" style={{ backgroundColor: dotColor }} />
        <div className="typing-dot" style={{ backgroundColor: dotColor }} />
        <div className="typing-dot" style={{ backgroundColor: dotColor }} />
      </div>
    </div>
  );
};

export default TypingIndicator; 