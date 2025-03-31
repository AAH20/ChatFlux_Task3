import React from 'react';

/**
 * ErrorNotification component
 * 
 * Displays an error message
 * 
 * @param {string} message - Error message to display
 * @param {function} onDismiss - Function to dismiss the error
 */
const ErrorNotification = ({ message, onDismiss }) => {
  if (!message) return null;
  
  return (
    <div className="error-notification">
      <div className="error-content">
        <span>{message}</span>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="error-dismiss"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorNotification; 