import React from 'react';

/**
 * RoleSelector component
 * 
 * Allows users to select their role in the conversation
 * 
 * @param {Object[]} roles - List of available roles
 * @param {string} activeRole - Currently selected role ID
 * @param {function} onRoleChange - Handler for role selection change
 */
const RoleSelector = ({ roles, activeRole, onRoleChange }) => {
  // Fallback roles in case the server doesn't provide any
  const fallbackRoles = [
    { id: 'customer', name: 'Customer', color: '#6c757d' },
    { id: 'support', name: 'Support', color: '#28a745' },
    { id: 'technical', name: 'Technical', color: '#007bff' },
    { id: 'manager', name: 'Manager', color: '#dc3545' }
  ];
  
  // Use available roles or fallback to defaults
  const availableRoles = roles.length > 0 ? roles : fallbackRoles;
  
  return (
    <div className="control-group">
      <label className="control-label">Your Role:</label>
      <div className="button-group">
        {availableRoles.map(role => (
          <button
            key={role.id}
            onClick={() => onRoleChange(role.id)}
            className={`control-button ${activeRole === role.id ? 'active' : ''}`}
            style={{
              backgroundColor: activeRole === role.id ? role.color : undefined,
            }}
          >
            {role.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoleSelector; 