import React from 'react';

/**
 * Suggestions component
 * 
 * Displays clickable suggestion buttons
 * 
 * @param {string[]} suggestions - List of suggestion texts
 * @param {function} onSuggestionClick - Handler for suggestion click
 * @param {function} getAgentColor - Function to get agent color
 * @param {string} activeAgent - Current active agent ID
 */
const Suggestions = ({ suggestions, onSuggestionClick, getAgentColor, activeAgent }) => {
  if (!suggestions || suggestions.length === 0) return null;
  
  const borderColor = getAgentColor(activeAgent);
  
  return (
    <div className="suggestions-container">
      <h4 className="suggestions-title">Suggestions:</h4>
      <div className="suggestions-list">
        {suggestions.map((suggestion, idx) => (
          <button 
            key={idx}
            onClick={() => onSuggestionClick(suggestion)}
            className="suggestion-button"
            style={{ borderLeft: `3px solid ${borderColor}` }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Suggestions; 