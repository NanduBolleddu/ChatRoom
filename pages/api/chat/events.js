// pages/api/chat/events.js
import { activeUsers, broadcastUsersList } from './join';

export default function handler(req, res) {
  const { userId } = req.query;

  if (!userId || !activeUsers.has(userId)) {
    return res.status(401).json({ error: 'Invalid user' });
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Initialize global SSE clients array
  if (!global.sseClients) {
    global.sseClients = new Set();
  }

  // Add this client to the set
  global.sseClients.add(res);

  // Send current users list to new client
  broadcastUsersList();

  // Keep connection alive
  const keepAlive = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    } catch (error) {
      console.error('Keep alive error:', error);
      cleanup();
    }
  }, 30000);

  // Update user's last seen
  const user = activeUsers.get(userId);
  if (user) {
    user.lastSeen = new Date().toISOString();
  }

  const cleanup = () => {
    clearInterval(keepAlive);
    global.sseClients?.delete(res);
    
    // Remove user if they disconnect
    if (activeUsers.has(userId)) {
      const user = activeUsers.get(userId);
      activeUsers.delete(userId);
      
      // Broadcast user left event
      if (global.sseClients && global.sseClients.size > 0) {
        global.sseClients.forEach(client => {
          if (client !== res) {
            try {
              client.write(`data: ${JSON.stringify({
                type: 'userLeft',
                payload: {
                  username: user.username,
                  userId,
                  timestamp: new Date().toISOString()
                }
              })}\n\n`);
            } catch (error) {
              console.error('Error broadcasting user left:', error);
            }
          }
        });
        
        // Update users list
        broadcastUsersList();
      }
    }
  };

  // Handle client disconnect
  req.on('close', cleanup);
  req.on('end', cleanup);
  res.on('close', cleanup);
}
