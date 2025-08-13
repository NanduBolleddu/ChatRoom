// pages/api/chat/typing.js
import { activeUsers, broadcastEvent } from './join';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, isTyping } = req.body;

  if (!userId || !activeUsers.has(userId)) {
    return res.status(401).json({ error: 'Invalid user' });
  }

  const user = activeUsers.get(userId);
  user.lastSeen = new Date().toISOString();

  // Broadcast typing indicator to other clients
  broadcastEvent({
    type: 'typing',
    payload: {
      username: user.username,
      userId,
      isTyping: Boolean(isTyping)
    }
  });

  res.status(200).json({ success: true });
}
