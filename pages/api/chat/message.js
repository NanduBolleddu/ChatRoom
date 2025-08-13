// pages/api/chat/message.js
import { activeUsers, messages, broadcastEvent } from './join';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, userId } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!userId || !activeUsers.has(userId)) {
    return res.status(401).json({ error: 'Invalid user' });
  }

  const user = activeUsers.get(userId);
  user.lastSeen = new Date().toISOString();

  const messageData = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    username: user.username,
    message: message.trim(),
    timestamp: new Date().toISOString(),
    userId
  };

  messages.push(messageData);

  // Keep only last 100 messages in memory
  if (messages.length > 100) {
    messages.shift();
  }

  // Broadcast message to all clients
  broadcastEvent({
    type: 'message',
    payload: messageData
  });

  res.status(200).json({ success: true });
}
