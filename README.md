# Multi-Agent Chat System

A scalable React-based messaging panel with multiple agent personalities, context switching, and role-based messaging.

## Features

- ✨ Modern UI design with clean, responsive styling
- 🧩 Modular component architecture for better maintainability
- 👤 Multiple agent personalities (Assistant, Expert, Creative)
- 🔄 WebSocket real-time communication
- 🤖 OpenAI API integration (when API key is provided)
- 💾 Session management with persistence
- 📝 Multiple conversation contexts
- 🔐 Role-based access control and messaging
- 📨 Message routing based on visibility rules
- 🌐 Responsive design for mobile and desktop
- ⚠️ Error handling with user-friendly notifications

## Architecture

The application implements a scalable architecture designed for multi-agent conversations:

### Component Structure

The application is divided into reusable components:

- **AgentSelector** - Allows selecting different AI personalities
- **RoleSelector** - Allows switching between user roles
- **ContextSidebar** - Displays available conversation contexts
- **MessageList** - Renders the list of messages in the active context
- **MessageGroup** - Groups messages from the same sender
- **InputArea** - Handles message input and sending
- **TypingIndicator** - Shows when an agent is typing
- **Suggestions** - Displays clickable suggestion buttons
- **Modal** - Reusable modal dialog component
- **ErrorNotification** - Displays user-friendly error messages

### Session Management
- `SessionStore` class for managing user sessions
- Participants with distinct roles and permissions
- Multiple contexts per session (separate conversations)
- Message history tracked per context

### Message Routing
- Role-based visibility rules for messages
- Recipient filtering based on sender's role
- Support for private and group messages

### Context Switching
- Multiple simultaneous conversations
- Independent message histories
- Dynamic context creation and switching
- Context metadata and state management

### Styling
- Modern CSS with custom properties (CSS variables)
- Consistent design language across components
- Responsive layout for various device sizes
- Smooth animations and transitions
- Accessibility considerations

### Error Handling
- User-friendly error notifications
- Graceful fallbacks for network issues
- Clear feedback on user actions

## Setup Instructions

### Prerequisites

- Node.js (v14 or later recommended)
- npm (v6 or later)
- OpenAI API key (optional)

### Installation

1. Clone or download this repository
2. Navigate to the project directory in your terminal
3. Install dependencies:

```bash
npm install
```

4. Configure environment variables:
   - Create a `.env` file in the root directory
   - Add your OpenAI API key: `OPENAI_API_KEY=your_api_key_here`
   - If you don't have an API key, the application will fallback to mock responses

### Running the Application

To run both the frontend and backend concurrently:

```bash
npm run dev
```

This will start:
- The React frontend on http://localhost:3000
- The Express backend with WebSockets on http://localhost:5001

To run them separately:

```bash
# Start just the React frontend
npm start

# Start just the Express backend
npm run server
```

## User Roles

The system supports multiple user roles with different permissions:

1. **Customer**
   - Can initiate chats
   - Messages visible to support, technical, and manager roles
   - Color theme: Gray

2. **Support Agent**
   - Can access conversation history
   - Can transfer conversations to technical or manager roles
   - Messages visible to customer, technical, and manager roles
   - Color theme: Green

3. **Technical Support**
   - Can access system information
   - Messages visible to customer, support, and manager roles
   - Color theme: Blue

4. **Manager**
   - Can access all conversations and messages
   - Messages visible to all roles
   - Color theme: Red

## AI Agents

The application features three distinct AI personalities:

1. **Assistant** (default)
   - Helpful, friendly, and concise
   - Focused on providing clear, straightforward responses
   - Color theme: Green

2. **Expert**
   - Technical, detailed, and precise
   - Provides in-depth explanations with technical terminology
   - Color theme: Blue

3. **Creative**
   - Imaginative, outside-the-box thinker
   - Offers unique perspectives and creative solutions
   - Color theme: Orange

## Conversation Contexts

Users can create and manage multiple conversation contexts:

- Switch between different conversations
- Each context maintains its own message history
- Messages are filtered by context
- Context-specific typing indicators
- Context creation with custom names

## Implementation Details

### Frontend (React)

- Modular component architecture for better maintainability
- React hooks-based state management
- WebSocket integration for real-time updates
- Context-aware message display
- Role and agent switching UI
- Dynamic message styling based on sender
- Fallback to REST API when WebSocket unavailable
- CSS variables for consistent styling
- Responsive design with mobile support

### Backend (Express with Socket.IO)

- Session store for user state management
- Role-based message routing
- Context management
- OpenAI API integration with context awareness
- Socket.IO for real-time communication
- REST API for backward compatibility

## Project Structure

```
src/
├── components/               # UI Components
│   ├── AgentSelector.jsx     # Agent selection component
│   ├── ContextSidebar.jsx    # Conversation contexts sidebar
│   ├── ErrorNotification.jsx # Error display component
│   ├── InputArea.jsx         # Message input component
│   ├── MessageGroup.jsx      # Message grouping component
│   ├── MessageList.jsx       # Messages display component
│   ├── Modal.jsx             # Modal dialog component
│   ├── RoleSelector.jsx      # Role selection component
│   ├── Suggestions.jsx       # Suggestions component
│   └── TypingIndicator.jsx   # Typing animation component
├── App.jsx                   # Main application component
├── index.js                  # Application entry point
└── styles.css                # Global styles
```

## Database Design

While implemented in memory for this demo, the architecture is designed for a database structure like:

```
// Sessions collection
{
  _id: ObjectId,
  externalId: "session-123",
  createdAt: ISODate,
  updatedAt: ISODate,
  metadata: { /* custom fields */ },
  participantIds: ["user-1", "agent-1", "agent-2"]
}

// Participants collection
{
  _id: ObjectId,
  externalId: "user-1",
  type: "human"|"ai",
  role: "customer",
  personality: null, // only for AI
  sessions: ["session-123"]
}

// Contexts collection
{
  _id: ObjectId,
  sessionId: ObjectId("session-123"),
  name: "main"|"support-ticket-123",
  active: true|false,
  createdAt: ISODate
}

// Messages collection
{
  _id: ObjectId,
  contextId: ObjectId,
  senderId: "user-1",
  content: "Hello, I need help",
  timestamp: ISODate,
  recipients: ["user-1", "agent-1"], // who can see this message
  metadata: { /* custom fields */ }
}
```

## Further Scaling

To scale this application to production levels:

1. **Microservices Architecture**:
   - Session Service: Manages user sessions
   - Message Router: Handles message routing
   - Agent Service: Manages AI agent responses
   - Context Service: Handles context switching

2. **Database Integration**:
   - MongoDB for document-based storage
   - Redis for session caching and pub/sub
   - Message queue for asynchronous processing

3. **Horizontal Scaling**:
   - Load balancing for WebSocket connections
   - Stateless design for multiple instances
   - Shared Redis for session state

## License

MIT 