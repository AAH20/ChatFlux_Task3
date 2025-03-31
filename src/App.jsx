import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// Import components
import AgentSelector from "./components/AgentSelector";
import RoleSelector from "./components/RoleSelector";
import ContextSidebar from "./components/ContextSidebar";
import MessageList from "./components/MessageList";
import InputArea from "./components/InputArea";
import TypingIndicator from "./components/TypingIndicator";
import Suggestions from "./components/Suggestions";
import Modal from "./components/Modal";
import ErrorNotification from "./components/ErrorNotification";

/**
 * Main App component
 * 
 * Manages state and coordinates the entire chat application
 */
const App = () => {
  // Message state
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]); // All messages across all contexts
  const [activeMessages, setActiveMessages] = useState([]); // Messages in current context
  
  // UI state
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  
  // Connection state
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  
  // Data state
  const [agents, setAgents] = useState([]);
  const [roles, setRoles] = useState([]);
  const [contexts, setContexts] = useState([]);
  
  // User preferences
  const [activeContext, setActiveContext] = useState('main');
  const [activeAgent, setActiveAgent] = useState('assistant');
  const [userRole, setUserRole] = useState('customer');
  const [sessionId, setSessionId] = useState('');
  
  // Modal state
  const [showNewContextModal, setShowNewContextModal] = useState(false);
  const [newContextName, setNewContextName] = useState("");
  
  // Refs
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  /**
   * Initialize Socket.IO connection and set up event handlers
   */
  useEffect(() => {
    // Create a new socket connection
    const newSocket = io("http://localhost:5001");
    
    // Connection events
    newSocket.on("connect", () => {
      console.log("Connected to server");
      setConnected(true);
      setSessionId(newSocket.id);
      setError(""); // Clear any connection errors
    });
    
    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnected(false);
      setError("Connection to server lost. Trying to reconnect...");
    });
    
    // Data reception events
    newSocket.on("agents", (availableAgents) => {
      setAgents(availableAgents);
    });
    
    newSocket.on("roles", (availableRoles) => {
      setRoles(availableRoles);
    });
    
    newSocket.on("contexts", (availableContexts) => {
      setContexts(availableContexts);
      
      // Set active context
      const active = availableContexts.find(c => c.active);
      if (active) {
        setActiveContext(active.id);
      }
    });
    
    // Typing state events
    newSocket.on("typing", ({ agentId, contextId }) => {
      if (contextId === activeContext) {
        setIsTyping(true);
      }
    });
    
    newSocket.on("typingDone", ({ contextId }) => {
      if (contextId === activeContext) {
        setIsTyping(false);
      }
    });
    
    // Message events
    newSocket.on("message", (message) => {
      // Add message to global history
      setHistory(prev => [...prev, message]);
      
      // If message belongs to active context, update active messages
      if (message.contextId === activeContext) {
        setActiveMessages(prev => [...prev, message]);
      }
      
      setIsTyping(false);
    });
    
    // Context events
    newSocket.on("contextSwitched", ({ contextId, messages }) => {
      setActiveContext(contextId);
      setActiveMessages(messages || []);
    });
    
    // Error events
    newSocket.on("error", (error) => {
      console.error("Error from server:", error);
      setError(error.message || "An error occurred while communicating with the server");
      setIsTyping(false);
    });
    
    setSocket(newSocket);
    
    // Cleanup on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  /**
   * Update active messages when active context changes
   */
  useEffect(() => {
    if (activeContext && history.length > 0) {
      // Filter messages for the active context
      const contextMessages = history.filter(msg => msg.contextId === activeContext);
      setActiveMessages(contextMessages);
    }
  }, [activeContext, history]);
  
  /**
   * Auto-focus input on component mount
   */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  /**
   * Scroll to bottom when messages change
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);
  
  /**
   * Handle sending messages through websocket
   */
  const handleSendWebsocket = useCallback(() => {
    if (!message.trim() || !connected) return;
    
    // Send message to server via socket
    socket.emit("message", { 
      message, 
      agentId: activeAgent, 
      contextId: activeContext,
      role: userRole
    });
    
    // Clear input
    setMessage("");
  }, [message, connected, socket, activeAgent, activeContext, userRole]);

  /**
   * Fallback to REST API if socket is not available
   */
  const handleSendREST = useCallback(async () => {
    if (!message.trim()) return;

    try {
      // Create a user message and add it to the active messages
      const userMessage = { 
        id: `msg-${Date.now()}`,
        senderId: `user-${sessionId}`,
        role: "user", 
        content: message,
        contextId: activeContext,
        timestamp: new Date().toISOString()
      };
      
      setHistory(prev => [...prev, userMessage]);
      setActiveMessages(prev => [...prev, userMessage]);
      setMessage("");
      setIsTyping(true);
      setSuggestions([]);

      const res = await fetch("http://localhost:5001/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message, 
          agentId: activeAgent,
          role: userRole 
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
      }

      const data = await res.json();
      
      // Show typing indicator for a short time before showing suggestions
      setTimeout(() => {
        setIsTyping(false);
        setSuggestions(data.suggestions || []);
      }, 1500);
    } catch (err) {
      console.error("Error:", err);
      setError(`Failed to send message: ${err.message}`);
      setIsTyping(false);
    }
  }, [message, sessionId, activeContext, activeAgent, userRole]);
  
  /**
   * Decide which send method to use based on connection status
   */
  const handleSend = useCallback(() => {
    setError(""); // Clear any previous errors
    
    if (connected && socket) {
      handleSendWebsocket();
    } else {
      handleSendREST();
    }
  }, [connected, socket, handleSendWebsocket, handleSendREST]);

  /**
   * Handle keyboard events
   */
  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent default to avoid new line in input
      handleSend();
    }
  }, [handleSend]);

  /**
   * Handle suggestion clicks
   */
  const handleSuggestionClick = useCallback((suggestion) => {
    // Add the agent message to history
    const agentMessage = { 
      id: `msg-${Date.now()}`,
      senderId: `agent-${activeAgent}`,
      role: "agent", 
      content: suggestion, 
      agentId: activeAgent,
      contextId: activeContext,
      timestamp: new Date().toISOString()
    };
    
    setHistory(prev => [...prev, agentMessage]);
    setActiveMessages(prev => [...prev, agentMessage]);
    
    // Clear suggestions after one is selected
    setSuggestions([]);
    
    // Focus input for next message
    inputRef.current?.focus();
  }, [activeAgent, activeContext]);
  
  /**
   * Change the active agent
   */
  const handleAgentChange = useCallback((agentId) => {
    setActiveAgent(agentId);
    if (socket && connected) {
      socket.emit("changeAgent", agentId);
    }
  }, [socket, connected]);
  
  /**
   * Change the user role
   */
  const handleRoleChange = useCallback((role) => {
    setUserRole(role);
    if (socket && connected) {
      socket.emit("changeRole", role);
    }
  }, [socket, connected]);
  
  /**
   * Switch conversation context
   */
  const handleContextSwitch = useCallback((contextId) => {
    if (socket && connected) {
      socket.emit("switchContext", contextId);
    } else {
      // Fallback for when socket isn't available
      setActiveContext(contextId);
      setActiveMessages(history.filter(msg => msg.contextId === contextId));
    }
  }, [socket, connected, history]);
  
  /**
   * Create a new conversation context
   */
  const handleCreateContext = useCallback(() => {
    if (!newContextName.trim()) return;
    
    if (socket && connected) {
      socket.emit("createContext", newContextName);
      setNewContextName("");
      setShowNewContextModal(false);
    } else {
      setError("Cannot create new context: not connected to server");
    }
  }, [newContextName, socket, connected]);

  /**
   * Group messages by consecutive sender
   */
  const groupedMessages = activeMessages.reduce((acc, msg, idx) => {
    // Consider agent ID as part of the grouping criteria
    const prevMsg = idx > 0 ? activeMessages[idx-1] : null;
    const isSameGroup = prevMsg && 
                       prevMsg.role === msg.role && 
                       (!msg.agentId || !prevMsg.agentId || msg.agentId === prevMsg.agentId) &&
                       prevMsg.senderId === msg.senderId;
    
    if (idx === 0 || !isSameGroup) {
      // Add sender name data for proper display
      let senderName = "";
      if (msg.role === "user") {
        senderName = roles.find(r => r.id === userRole)?.name || "Customer";
      } else if (msg.role === "agent") {
        senderName = agents.find(a => a.id === msg.agentId)?.name || "Assistant";
      }
      
      acc.push({
        role: msg.role,
        agentId: msg.agentId || 'assistant',
        agentName: senderName,
        senderName,
        senderId: msg.senderId,
        messages: [msg]
      });
    } else {
      acc[acc.length-1].messages.push(msg);
    }
    return acc;
  }, []);
  
  /**
   * Get the color for an agent by ID
   */
  const getAgentColor = useCallback((agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.color : "#128C7E";
  }, [agents]);
  
  /**
   * Get the color for a role by ID
   */
  const getRoleColor = useCallback((roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.color : "#6c757d";
  }, [roles]);
  
  /**
   * Get the name of the active context
   */
  const getActiveContextName = useCallback(() => {
    const context = contexts.find(c => c.id === activeContext);
    return context?.name || (activeContext === "main" ? "Main Chat" : activeContext);
  }, [contexts, activeContext]);
  
  /**
   * Get the name of the active agent
   */
  const getActiveAgentName = useCallback(() => {
    const agent = agents.find(a => a.id === activeAgent);
    return agent?.name || "Assistant";
  }, [agents, activeAgent]);
  
  /**
   * Dismiss the current error
   */
  const dismissError = useCallback(() => {
    setError("");
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Multi-Agent Chat System</h1>
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? "Connected to real-time server" : "Using fallback REST API"}
        </div>
      </header>
      
      {/* Error notification */}
      <ErrorNotification message={error} onDismiss={dismissError} />
      
      {/* Control panel */}
      <div className="control-panel">
        <AgentSelector 
          agents={agents} 
          activeAgent={activeAgent} 
          onAgentChange={handleAgentChange} 
        />
        
        <RoleSelector 
          roles={roles} 
          activeRole={userRole} 
          onRoleChange={handleRoleChange} 
        />
      </div>
      
      {/* Chat area */}
      <div className="chat-container">
        {/* Sidebar with contexts */}
        <ContextSidebar 
          contexts={contexts} 
          activeContextId={activeContext} 
          onContextSwitch={handleContextSwitch} 
          onNewContext={() => setShowNewContextModal(true)}
        />
        
        {/* Message area */}
        <div className="message-area">
          {/* Messages */}
          <MessageList 
            groupedMessages={groupedMessages}
            getAgentColor={getAgentColor}
            getRoleColor={getRoleColor}
            activeContextName={getActiveContextName()}
            userRole={userRole}
            messagesEndRef={messagesEndRef}
          />
          
          {/* Typing indicator */}
          <TypingIndicator 
            isTyping={isTyping} 
            getAgentColor={getAgentColor} 
            activeAgent={activeAgent}
            agentName={getActiveAgentName()}
          />
          
          {/* Input area */}
          <InputArea 
            message={message}
            setMessage={setMessage}
            handleSend={handleSend}
            handleKeyPress={handleKeyPress}
            isTyping={isTyping}
            getAgentColor={getAgentColor}
            activeAgent={activeAgent}
            inputRef={inputRef}
          />
        </div>
      </div>
      
      {/* Suggestions */}
      <Suggestions 
        suggestions={suggestions}
        onSuggestionClick={handleSuggestionClick}
        getAgentColor={getAgentColor}
        activeAgent={activeAgent}
      />
      
      {/* Session info */}
      {sessionId && (
        <div className="session-info">
          Session ID: {sessionId}
        </div>
      )}
      
      {/* New context modal */}
      <Modal
        isOpen={showNewContextModal}
        title="New Conversation"
        onClose={() => setShowNewContextModal(false)}
        onConfirm={handleCreateContext}
        confirmText="Create"
        isConfirmDisabled={!newContextName.trim()}
      >
        <input
          type="text"
          value={newContextName}
          onChange={(e) => setNewContextName(e.target.value)}
          placeholder="Conversation name"
          className="modal-input"
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default App;