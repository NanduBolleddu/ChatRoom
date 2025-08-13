import { Server } from 'socket.io';

// Store active users and chat history
const activeUsers = new Map();
const chatHistory = []; // In-memory storage for messages
const MAX_MESSAGES = 100; // Limit stored messages to prevent memory issues

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO server...');
    
    const io = new Server(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXT_PUBLIC_APP_URL || "https://your-app-name.vercel.app"
          : "*",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Handle user joining
      socket.on('join', (username) => {
        // Store user info
        activeUsers.set(socket.id, {
          id: socket.id,
          username: username,
          typing: false,
          joinedAt: new Date().toISOString()
        });

        // Join the user to general room
        socket.join('general');

        // Send chat history to the newly joined user
        socket.emit('chatHistory', chatHistory);

        // Create join message
        const joinMessage = {
          id: Date.now() + Math.random(),
          type: 'system',
          text: `${username} joined the chat`,
          timestamp: new Date().toISOString(),
          username: 'System'
        };

        // Add join message to history
        chatHistory.push(joinMessage);
        
        // Keep only recent messages
        if (chatHistory.length > MAX_MESSAGES) {
          chatHistory.shift();
        }

        // Broadcast that user joined to others (not to the user who just joined)
        socket.to('general').emit('userJoined', {
          message: joinMessage,
          username: username
        });

        // Send current active users to all users
        const users = Array.from(activeUsers.values());
        io.to('general').emit('activeUsers', users);

        console.log(`${username} joined the chat`);
      });

      // Handle new message
      socket.on('newMessage', (messageData) => {
        const user = activeUsers.get(socket.id);
        if (user) {
          const message = {
            id: Date.now() + Math.random(),
            username: user.username,
            text: messageData.text,
            timestamp: new Date().toISOString(),
            senderId: socket.id,
            type: 'message'
          };

          // Add message to chat history
          chatHistory.push(message);
          
          // Keep only recent messages
          if (chatHistory.length > MAX_MESSAGES) {
            chatHistory.shift();
          }

          // Broadcast message to all users in the room
          io.to('general').emit('messageReceived', message);
          
          console.log(`Message from ${user.username}: ${messageData.text}`);
        }
      });

      // Handle typing indicator
      socket.on('typing', (isTyping) => {
        const user = activeUsers.get(socket.id);
        if (user) {
          user.typing = isTyping;
          // Broadcast typing status to other users
          socket.to('general').emit('userTyping', {
            username: user.username,
            typing: isTyping
          });
        }
      });

      // Handle clear chat history (optional feature)
      socket.on('clearHistory', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
          // Clear chat history
          chatHistory.length = 0;
          
          const clearMessage = {
            id: Date.now() + Math.random(),
            type: 'system',
            text: `Chat history cleared by ${user.username}`,
            timestamp: new Date().toISOString(),
            username: 'System'
          };
          
          chatHistory.push(clearMessage);
          io.to('general').emit('historyCleared', clearMessage);
        }
      });

      // Handle user disconnection
      socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
          // Create leave message
          const leaveMessage = {
            id: Date.now() + Math.random(),
            type: 'system',
            text: `${user.username} left the chat`,
            timestamp: new Date().toISOString(),
            username: 'System'
          };

          // Add leave message to history
          chatHistory.push(leaveMessage);
          
          // Keep only recent messages
          if (chatHistory.length > MAX_MESSAGES) {
            chatHistory.shift();
          }

          // Remove user from active users
          activeUsers.delete(socket.id);
          
          // Broadcast that user left
          socket.to('general').emit('userLeft', {
            message: leaveMessage,
            username: user.username
          });
          
          // Update active users list
          const users = Array.from(activeUsers.values());
          io.to('general').emit('activeUsers', users);
          
          console.log(`${user.username} left the chat`);
        }
      });

      // Handle manual leave
      socket.on('leave', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
          // Create leave message
          const leaveMessage = {
            id: Date.now() + Math.random(),
            type: 'system',
            text: `${user.username} left the chat`,
            timestamp: new Date().toISOString(),
            username: 'System'
          };

          // Add leave message to history
          chatHistory.push(leaveMessage);
          
          // Keep only recent messages
          if (chatHistory.length > MAX_MESSAGES) {
            chatHistory.shift();
          }

          // Remove user from active users
          activeUsers.delete(socket.id);
          
          // Broadcast that user left
          socket.to('general').emit('userLeft', {
            message: leaveMessage,
            username: user.username
          });
          
          // Update active users list
          const users = Array.from(activeUsers.values());
          io.to('general').emit('activeUsers', users);
          
          socket.disconnect();
          console.log(`${user.username} manually left the chat`);
        }
      });
    });

    res.socket.server.io = io;
  } else {
    console.log('Socket.IO server already running');
  }

  res.end();
}

// Disable body parsing for this endpoint
export const config = {
  api: {
    bodyParser: false,
  },
};
