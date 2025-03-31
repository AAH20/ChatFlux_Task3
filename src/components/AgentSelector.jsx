import React from 'react';

/**
 * Allows users to select which AI agent they want to interact with
 * 
 * @param {Object} props
 * @param {Array} props.agents - Available agents from the server
 * @param {string} props.activeAgent - Currently selected agent ID
 * @param {Function} props.onAgentChange - Handler for agent selection change
 */
const AgentSelector = ({ agents, activeAgent, onAgentChange }) => {
  // Provide fallback agents in case server doesn't provide any
  const fallbackAgents = [
    { id: 'assistant', name: 'Assistant', color: '#128C7E' },
    { id: 'expert', name: 'Expert', color: '#0078D7' },
    { id: 'creative', name: 'Creative', color: '#FF8C00' },
  ];

  // Use server-provided agents or fallback if none are available
  const availableAgents = agents.length > 0 ? agents : fallbackAgents;

  return (
    <div className="agent-selector">
      <label className="selector-label">AI Agent:</label>
      <div className="selector-buttons">
        {availableAgents.map(agent => (
          <button
            key={agent.id}
            onClick={() => onAgentChange(agent.id)}
            className={`agent-button ${activeAgent === agent.id ? 'active' : ''}`}
            style={{
              backgroundColor: activeAgent === agent.id ? agent.color : undefined,
              color: activeAgent === agent.id ? 'white' : undefined,
            }}
          >
            {agent.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AgentSelector; 