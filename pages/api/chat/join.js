// pages/api/chat/join.js
const activeUsers = new Map();
const messages = [];

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.body;

  if (!username || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  activeUsers.set(userId, {
    username: username.trim(),
    joinedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  });

  // Broadcast user joined event
  broadcastEvent({
    type: 'userJoined',
    payload: {
      username: username.trim(),
      userId,
      timestamp: new Date().toISOString()
    }
  });

  // Update users list for all clients
  broadcastUsersList();

  res.status(200).json({ userId, username: username.trim() });
}

// Helper function to broadcast events
function broadcastEvent(eventData) {
  global.sseClients?.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(eventData)}\n\n`);
    } catch (error) {
      console.error('Error broadcasting event:', error);
    }
  });
}

// Helper function to broadcast users list
function broadcastUsersList() {
  const usersList = Array.from(activeUsers.values()).map(user => user.username);
  broadcastEvent({
    type: 'usersList',
    payload: usersList
  });
}

export { activeUsers, messages, broadcastEvent, broadcastUsersList };

