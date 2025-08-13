import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Send, Users, LogOut } from 'lucide-react';

export default function ChatApp() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSocket = () => {
    // Initialize socket.io with Next.js API route
    fetch('/api/socketio').finally(() => {
      const newSocket = io({
        path: '/api/socketio',
      });
      setSocket(newSocket);

    newSocket.on('messageReceived', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('userJoined', (joinedUsername) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        text: `${joinedUsername} joined the chat`,
        timestamp: new Date().toISOString()
      }]);
    });

    newSocket.on('userLeft', (leftUsername) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        text: `${leftUsername} left the chat`,
        timestamp: new Date().toISOString()
      }]);
    });

    newSocket.on('activeUsers', (users) => {
      setActiveUsers(users);
    });

    newSocket.on('userTyping', ({ username: typingUsername, typing }) => {
      if (typing) {
        setTypingUsers(prev => [...prev.filter(u => u !== typingUsername), typingUsername]);
      } else {
        setTypingUsers(prev => prev.filter(u => u !== typingUsername));
      }
    });

      return newSocket;
    });
  };

  const joinChat = async () => {
    if (username.trim()) {
      const newSocket = await initializeSocket();
      if (newSocket) {
        newSocket.emit('join', username.trim());
        setHasJoined(true);
      }
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && socket) {
      socket.emit('newMessage', { text: newMessage.trim() });
      setNewMessage('');
      handleStopTyping();
    }
  };

  const leaveChat = () => {
    if (socket) {
      socket.emit('leave');
      socket.disconnect();
    }
    setHasJoined(false);
    setSocket(null);
    setMessages([]);
    setActiveUsers([]);
    setTypingUsers([]);
    setUsername('');
  };

  const handleTyping = (value) => {
    setNewMessage(value);
    
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      socket?.emit('typing', true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      socket?.emit('typing', false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Join Chat</h1>
            <p className="text-gray-400">Enter your username to start chatting</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={async (e) => {
                if (e.key === 'Enter') {
                  await joinChat();
                }
              }}
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
              maxLength={20}
            />
            <button
              onClick={joinChat}
              disabled={!username.trim() || isConnecting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
            >
              {isConnecting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Connecting...
                </div>
              ) : (
                'Join Chat'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white mb-2">Chat Room</h2>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Welcome, {username}</span>
            <button
              onClick={leaveChat}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
              title="Leave Chat"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} className="text-gray-400" />
            <h3 className="font-semibold text-white">Active Users ({activeUsers.length})</h3>
          </div>
          
          <div className="space-y-2">
            {activeUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className={`text-sm ${user.username === username ? 'text-blue-400 font-semibold' : 'text-gray-300'}`}>
                  {user.username} {user.username === username && '(You)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <h1 className="text-xl font-bold text-white">General</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              {message.type === 'system' ? (
                <div className="text-center">
                  <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
                    {message.text}
                  </span>
                </div>
              ) : (
                <div className={`flex ${message.senderId === socket?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md ${message.senderId === socket?.id ? 'order-2' : 'order-1'}`}>
                    <div className="text-xs text-gray-400 mb-1 px-1">
                      {message.senderId === socket?.id ? 'You' : message.username}
                    </div>
                    <div className={`p-3 rounded-lg ${
                      message.senderId === socket?.id 
                        ? 'bg-blue-600 text-white rounded-br-sm' 
                        : 'bg-gray-700 text-white rounded-bl-sm'
                    }`}>
                      {message.text}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Typing Indicators */}
          {(typingUsers.length > 0 || isTyping) && (
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md">
                <div className="text-xs text-gray-400 mb-1 px-1">
                  {isTyping ? 'typing...' : `${typingUsers.join(', ')} typing...`}
                </div>
                <div className="bg-gray-700 p-3 rounded-lg rounded-bl-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <input
              ref={messageInputRef}
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}