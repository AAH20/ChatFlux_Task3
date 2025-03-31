import React from 'react';

/**
 * ContextSidebar component
 * 
 * Displays the conversation contexts and allows switching between them
 * 
 * @param {Object[]} contexts - List of available contexts
 * @param {string} activeContextId - Currently active context ID
 * @param {function} onContextSwitch - Handler for context switching
 * @param {function} onNewContext - Handler for creating a new context
 */
const ContextSidebar = ({ contexts, activeContextId, onContextSwitch, onNewContext }) => {
  return (
    <div className="context-sidebar">
      <div className="context-header">
        <h3 className="context-title">Conversations</h3>
      </div>
      
      <div className="context-list">
        {contexts.map(context => (
          <div 
            key={context.id}
            onClick={() => onContextSwitch(context.id)}
            className={`context-item ${context.id === activeContextId ? 'active' : ''}`}
          >
            <div className="context-name">
              <span>{context.name || (context.id === "main" ? "Main Chat" : context.id)}</span>
              {context.messageCount > 0 && (
                <span className="context-count">{context.messageCount}</span>
              )}
            </div>
          </div>
        ))}
        
        {/* If no contexts are available, show a placeholder */}
        {contexts.length === 0 && (
          <div className="context-item">
            <em>No conversations yet</em>
          </div>
        )}
      </div>
      
      <button
        className="new-context-button"
        onClick={onNewContext}
      >
        + New Conversation
      </button>
    </div>
  );
};

export default ContextSidebar; 