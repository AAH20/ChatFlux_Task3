import React from 'react';

/**
 * InputArea component
 * 
 * Provides the message input and send button
 * 
 * @param {string} message - Current message text
 * @param {function} setMessage - Function to update message text
 * @param {function} handleSend - Function to handle sending message
 * @param {function} handleKeyPress - Function to handle key press events
 * @param {boolean} isTyping - Whether AI is currently typing
 * @param {function} getAgentColor - Function to get agent color
 * @param {string} activeAgent - Current active agent ID
 * @param {React.RefObject} inputRef - Reference to input element for focus
 */
const InputArea = ({
  message,
  setMessage,
  handleSend,
  handleKeyPress,
  isTyping,
  getAgentColor,
  activeAgent,
  inputRef
}) => {
  // Get button color from active agent
  const buttonColor = getAgentColor(activeAgent);
  
  // Determine if the send button should be disabled
  const isDisabled = isTyping || !message.trim();
  
  return (
    <div className="input-container">
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type a message..."
        className="message-input"
        disabled={isTyping}
        aria-label="Message input"
      />
      <button 
        onClick={handleSend}
        className="send-button"
        style={{
          backgroundColor: buttonColor,
          opacity: isDisabled ? 0.6 : 1
        }}
        disabled={isDisabled}
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  );
};

export default InputArea; 