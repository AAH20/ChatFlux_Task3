require('dotenv').config();
const express = require("express");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const OpenAI = require('openai');
const app = express();
const PORT = 5001;

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());

// Define different agent personalities
const agents = {
  assistant: {
    name: "Assistant",
    role: "You are a helpful, friendly assistant who provides accurate and concise information.",
    color: "#128C7E"
  },
  expert: {
    name: "Expert",
    role: "You are a technical expert who provides detailed, in-depth information with technical precision.",
    color: "#0078D7"
  },
  creative: {
    name: "Creative",
    role: "You are a creative, imaginative assistant who thinks outside the box and offers unique perspectives.",
    color: "#FF8C00"
  }
};

// Define user roles and their permissions
const roles = {
  customer: {
    name: "Customer",
    canInitiateChat: true,
    visibleTo: ["support", "technical", "manager"],
    color: "#6c757d" // gray
  },
  support: {
    name: "Support Agent",
    canAccessHistory: true,
    canTransferTo: ["technical", "manager"],
    visibleTo: ["customer", "technical", "manager"],
    color: "#28a745" // green
  },
  technical: {
    name: "Technical Support",
    canAccessSystemInfo: true,
    visibleTo: ["customer", "support", "manager"],
    color: "#007bff" // blue
  },
  manager: {
    name: "Support Manager",
    canAccessAll: true,
    visibleTo: ["customer", "support", "technical"],
    color: "#dc3545" // red
  }
};

// Enhanced session store
class SessionStore {
  constructor() {
    this.sessions = new Map();
  }
  
  createSession(sessionId, userId) {
    const timestamp = new Date().toISOString();
    
    const session = {
      id: sessionId,
      participants: [
        { id: userId, type: "human", role: "customer" }
      ],
      contexts: {
        "main": { 
          messages: [], 
          active: true,
          createdAt: timestamp
        }
      },
      metadata: {
        createdAt: timestamp,
        lastActive: timestamp,
        tags: []
      }
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
  
  updateSession(sessionId, updateFn) {
    const session = this.getSession(sessionId);
    if (!session) return null;
    
    const updatedSession = updateFn(session);
    this.sessions.set(sessionId, updatedSession);
    
    // Update last active timestamp
    updatedSession.metadata.lastActive = new Date().toISOString();
    
    return updatedSession;
  }
  
  addMessageToContext(sessionId, contextId, message) {
    return this.updateSession(sessionId, (session) => {
      if (!session.contexts[contextId]) {
        session.contexts[contextId] = {
          messages: [],
          active: false,
          createdAt: new Date().toISOString()
        };
      }
      
      session.contexts[contextId].messages.push(message);
      return session;
    });
  }
  
  addParticipant(sessionId, participant) {
    return this.updateSession(sessionId, (session) => {
      session.participants.push(participant);
      return session;
    });
  }
  
  getActiveContext(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return null;
    
    const activeContextId = Object.keys(session.contexts).find(
      id => session.contexts[id].active
    );
    
    return {
      id: activeContextId,
      ...session.contexts[activeContextId]
    };
  }
  
  switchContext(sessionId, contextId) {
    return this.updateSession(sessionId, (session) => {
      // Deactivate all contexts
      Object.keys(session.contexts).forEach(id => {
        session.contexts[id].active = false;
      });
      
      // Create context if it doesn't exist
      if (!session.contexts[contextId]) {
        session.contexts[contextId] = {
          messages: [],
          active: true,
          createdAt: new Date().toISOString()
        };
      } else {
        // Activate the specified context
        session.contexts[contextId].active = true;
      }
      
      return session;
    });
  }
  
  removeSession(sessionId) {
    this.sessions.delete(sessionId);
  }
  
  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

// Message router based on roles
function routeMessage(message, session) {
  const sender = session.participants.find(p => p.id === message.senderId);
  if (!sender) return [];
  
  const senderRole = sender.role;
  
  // If role doesn't exist in our definitions, make message visible to everyone
  if (!roles[senderRole]) {
    return session.participants.map(p => p.id);
  }
  
  // Filter recipients based on visibility rules
  return session.participants
    .filter(p => roles[senderRole].visibleTo.includes(p.role) || p.id === message.senderId)
    .map(p => p.id);
}

// Create session store
const sessionStore = new SessionStore();

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Create a new session for this user
  const sessionId = socket.id;
  const session = sessionStore.createSession(sessionId, `user-${socket.id}`);
  
  // Add AI agents as participants
  Object.keys(agents).forEach(agentId => {
    sessionStore.addParticipant(sessionId, {
      id: `agent-${agentId}`,
      type: "ai",
      role: "support",
      personality: agentId
    });
  });
  
  // Send available roles to the client
  socket.emit('roles', Object.entries(roles).map(([id, role]) => ({
    id,
    name: role.name,
    color: role.color
  })));
  
  // Send available agents to the client
  socket.emit('agents', Object.entries(agents).map(([id, agent]) => ({
    id,
    name: agent.name,
    color: agent.color
  })));
  
  // Send available contexts to the client
  socket.emit('contexts', Object.keys(session.contexts).map(id => ({
    id,
    name: id === "main" ? "Main Chat" : id,
    active: session.contexts[id].active,
    messageCount: session.contexts[id].messages.length
  })));
  
  // Handle message from client
  socket.on('message', async (data) => {
    const { message, agentId = 'assistant', contextId = 'main', role = 'customer' } = data;
    const session = sessionStore.getSession(sessionId);
    
    if (!session) return;
    
    // Get or create active context
    const activeContextId = contextId || Object.keys(session.contexts).find(id => 
      session.contexts[id].active
    ) || 'main';
    
    // Add user message to context
    const userMessage = { 
      id: generateMessageId(),
      senderId: `user-${socket.id}`, 
      role: "user", 
      content: message,
      timestamp: new Date().toISOString(),
      userRole: role
    };
    
    sessionStore.addMessageToContext(sessionId, activeContextId, userMessage);
    
    // Get the recipients for this message based on roles
    const recipients = routeMessage(userMessage, session);
    
    // Send message to all valid recipients
    socket.emit('message', {
      ...userMessage,
      contextId: activeContextId,
      recipients
    });
    
    // Let the client know the agent is typing
    socket.emit('typing', { agentId, contextId: activeContextId });
    
    try {
      // Check if OpenAI API key is configured
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
        // Use real OpenAI API
        const activeContext = session.contexts[activeContextId];
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: agents[agentId].role },
            ...activeContext.messages.map(msg => ({
              role: msg.role === 'agent' ? 'assistant' : msg.role,
              content: msg.content
            }))
          ],
          temperature: agentId === 'creative' ? 0.9 : 0.5,
          max_tokens: 250,
        });
        
        const reply = completion.choices[0].message.content;
        
        // Add a slight delay to simulate typing
        setTimeout(() => {
          // Add the agent response to context
          const agentMessage = { 
            id: generateMessageId(),
            senderId: `agent-${agentId}`,
            role: "agent", 
            content: reply, 
            agentId,
            timestamp: new Date().toISOString()
          };
          
          sessionStore.addMessageToContext(sessionId, activeContextId, agentMessage);
          
          // Get the recipients for this message
          const agentRecipients = routeMessage(agentMessage, session);
          
          // Send the response to the client
          socket.emit('message', {
            ...agentMessage,
            contextId: activeContextId,
            recipients: agentRecipients
          });
          socket.emit('typingDone', { contextId: activeContextId });
        }, 1500);
      } else {
        // Use mock responses if no API key
        const delay = Math.floor(Math.random() * 1000) + 1000;
        const agentResponses = getMockResponses(message, agentId);
        
        setTimeout(() => {
          const reply = agentResponses[Math.floor(Math.random() * agentResponses.length)];
          const agentMessage = { 
            id: generateMessageId(),
            senderId: `agent-${agentId}`,
            role: "agent", 
            content: reply, 
            agentId,
            timestamp: new Date().toISOString()
          };
          
          sessionStore.addMessageToContext(sessionId, activeContextId, agentMessage);
          
          // Get the recipients for this message
          const recipients = routeMessage(agentMessage, session);
          
          socket.emit('message', {
            ...agentMessage,
            contextId: activeContextId,
            recipients
          });
          socket.emit('typingDone', { contextId: activeContextId });
        }, delay);
      }
    } catch (err) {
      console.error("Error generating response:", err);
      socket.emit('error', { 
        message: "Failed to generate response. Please try again.",
        contextId: activeContextId
      });
      socket.emit('typingDone', { contextId: activeContextId });
    }
  });
  
  // Change active agent
  socket.on('changeAgent', (agentId) => {
    if (agents[agentId]) {
      socket.emit('agentChanged', { agentId });
    }
  });
  
  // Change user role
  socket.on('changeRole', (role) => {
    if (roles[role]) {
      const session = sessionStore.getSession(sessionId);
      if (session) {
        // Find user participant and update role
        const userIndex = session.participants.findIndex(
          p => p.id === `user-${socket.id}`
        );
        
        if (userIndex >= 0) {
          session.participants[userIndex].role = role;
          socket.emit('roleChanged', { role });
        }
      }
    }
  });
  
  // Create or switch context
  socket.on('switchContext', (contextId) => {
    if (!contextId) return;
    
    // Switch to the specified context
    const updatedSession = sessionStore.switchContext(sessionId, contextId);
    
    if (updatedSession) {
      // Send updated context list to client
      socket.emit('contexts', Object.keys(updatedSession.contexts).map(id => ({
        id,
        name: id === "main" ? "Main Chat" : id,
        active: updatedSession.contexts[id].active,
        messageCount: updatedSession.contexts[id].messages.length
      })));
      
      // Send context messages to client
      socket.emit('contextSwitched', {
        contextId,
        messages: updatedSession.contexts[contextId].messages
      });
    }
  });
  
  // Create new context
  socket.on('createContext', (contextName) => {
    if (!contextName) return;
    
    const contextId = `context-${Date.now()}`;
    const updatedSession = sessionStore.switchContext(sessionId, contextId);
    
    if (updatedSession) {
      // Update context metadata
      updatedSession.contexts[contextId].name = contextName;
      
      // Send updated context list to client
      socket.emit('contexts', Object.keys(updatedSession.contexts).map(id => ({
        id,
        name: updatedSession.contexts[id].name || (id === "main" ? "Main Chat" : id),
        active: updatedSession.contexts[id].active,
        messageCount: updatedSession.contexts[id].messages.length
      })));
      
      // Send empty context to client
      socket.emit('contextSwitched', {
        contextId,
        messages: []
      });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Keep the session for a while before removing
    setTimeout(() => {
      sessionStore.removeSession(sessionId);
    }, 3600000); // 1 hour
  });
});

// Generate unique message IDs
function generateMessageId() {
  return 'msg-' + Math.random().toString(36).substr(2, 9);
}

// REST API endpoint for backward compatibility
app.post("/suggestions", (req, res) => {
  const { message, agentId = 'assistant' } = req.body;
  
  // Add a simulated delay (between 500-2000ms)
  const delay = Math.floor(Math.random() * 1500) + 500;
  
  // Occasionally simulate an error (5% chance)
  const simulateError = Math.random() < 0.05;
  
  if (simulateError) {
    setTimeout(() => {
      res.status(500).json({ error: "Server error occurred" });
    }, delay);
    return;
  }
  
  // Get agent-specific responses
  const suggestions = getMockResponses(message, agentId);

  // Simulate network delay
  setTimeout(() => {
    res.json({ 
      suggestions, 
      agentId,
      timestamp: new Date().toISOString() 
    });
  }, delay);
});

// Helper function to get mock responses based on agent type and message
function getMockResponses(message, agentId = 'assistant') {
  const lowercaseMsg = message.toLowerCase();
  let responses = [];
  
  // Basic response templates based on message content
  if (lowercaseMsg.includes("hello") || lowercaseMsg.includes("hi")) {
    if (agentId === 'assistant') {
      responses = [
        "Hello! How can I assist you today?",
        "Hi there! What can I help you with?",
        "Greetings! What brings you here today?"
      ];
    } else if (agentId === 'expert') {
      responses = [
        "Hello. I'm the technical expert. What specific information do you need?",
        "Greetings. I specialize in providing detailed technical information. How can I assist?",
        "Hi there. I'm your expert resource. What technical questions do you have?"
      ];
    } else if (agentId === 'creative') {
      responses = [
        "Hi there! Ready to explore some fresh ideas together?",
        "Hello! Let's think outside the box today. What are we creating?",
        "Greetings, fellow creative mind! What exciting ventures shall we embark on?"
      ];
    }
  } else if (lowercaseMsg.includes("help") || lowercaseMsg.includes("support")) {
    if (agentId === 'assistant') {
      responses = [
        "I'd be happy to help. What specifically do you need assistance with?",
        "Sure, I can help. Could you provide more details about your issue?",
        "I'm here to support you. What problem are you facing?"
      ];
    } else if (agentId === 'expert') {
      responses = [
        "I can provide technical assistance. Please describe the issue with as much detail as possible.",
        "For effective troubleshooting, I'll need specifics about your system and the exact error messages you're encountering.",
        "I can help resolve your technical problem. What steps have you already taken to address it?"
      ];
    } else if (agentId === 'creative') {
      responses = [
        "Let's approach this creatively! Sometimes the best solutions come from unexpected angles.",
        "I'd love to help! Let's brainstorm some innovative solutions to your challenge.",
        "Every problem is an opportunity for creative thinking. Tell me more about what you're facing."
      ];
    }
  } else if (lowercaseMsg.includes("thank")) {
    if (agentId === 'assistant') {
      responses = [
        "You're welcome! Is there anything else you need?",
        "Happy to help! Let me know if you need anything else.",
        "No problem at all. Feel free to ask if you have more questions."
      ];
    } else if (agentId === 'expert') {
      responses = [
        "You're welcome. For future reference, I recommend documenting the solution we discussed.",
        "Glad to be of assistance. Don't hesitate to return if you encounter further technical issues.",
        "It was my pleasure to provide technical guidance. Is there anything else you'd like clarification on?"
      ];
    } else if (agentId === 'creative') {
      responses = [
        "The pleasure was all mine! Creativity flourishes in collaboration.",
        "You're welcome! Remember, there are no limits to what we can imagine together.",
        "Anytime! The journey of creative exploration is always rewarding."
      ];
    }
  } else if (lowercaseMsg.includes("how") && lowercaseMsg.includes("work")) {
    if (agentId === 'assistant') {
      responses = [
        "I process your messages and try to provide helpful responses.",
        "I use natural language processing to understand and respond to your queries.",
        "I analyze your questions and generate relevant suggestions based on patterns I've learned."
      ];
    } else if (agentId === 'expert') {
      responses = [
        "I utilize advanced language models trained on extensive datasets to process queries through transformer neural networks, enabling me to generate context-aware responses with technical precision.",
        "My functionality is based on a language model architecture that performs statistical analysis of token probabilities to generate coherent and contextually appropriate responses to queries.",
        "I operate using a large language model that employs attention mechanisms to weigh the importance of different parts of your input and generate technically accurate responses."
      ];
    } else if (agentId === 'creative') {
      responses = [
        "I'm like a digital muse, weaving together ideas and inspirations to spark your creativity!",
        "Think of me as your creative companion, drawing from a universe of ideas to help you see things from fresh perspectives.",
        "I'm a kaleidoscope of possibilities, rearranging patterns of thought to reveal new creative pathways!"
      ];
    }
  } else if (message.length < 5) {
    if (agentId === 'assistant') {
      responses = [
        "Could you provide more details?",
        "I need a bit more information to help you properly.",
        "Can you elaborate on that?"
      ];
    } else if (agentId === 'expert') {
      responses = [
        "I require more comprehensive information to provide an accurate technical response.",
        "Please provide additional context and specifics about your technical inquiry.",
        "For optimal assistance, I need you to elaborate with technical details."
      ];
    } else if (agentId === 'creative') {
      responses = [
        "Even a few words can spark big ideas! But could you share a bit more?",
        "Let's expand on that seed of an idea. What more can you tell me?",
        "That's an intriguing start! Care to paint a fuller picture for me?"
      ];
    }
  } else {
    // Default responses
    if (agentId === 'assistant') {
      responses = [
        `I see you're asking about "${message}". Can you tell me more?`,
        `Let me look into "${message}" and get back to you.`,
        `Can you please clarify what you mean by "${message}"?`
      ];
    } else if (agentId === 'expert') {
      responses = [
        `Regarding "${message}": I'd need to analyze this from a technical perspective. Could you provide more specifications?`,
        `Your inquiry about "${message}" requires further technical context for a comprehensive analysis.`,
        `From a technical standpoint, "${message}" could refer to several distinct concepts. Could you specify which aspect you're interested in?`
      ];
    } else if (agentId === 'creative') {
      responses = [
        `"${message}" opens up so many creative possibilities! What specific direction are you thinking of exploring?`,
        `I love the concept of "${message}"! Let's brainstorm some innovative approaches to this.`,
        `"${message}" is a fascinating starting point! What kind of creative spin would you like to put on this?`
      ];
    }
  }
  
  return responses;
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Socket.IO enabled for real-time communication`);
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    console.log(`OpenAI API integration active`);
  } else {
    console.log(`Using mock responses (OpenAI API key not configured)`);
  }
});