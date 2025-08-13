import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Send, Users, LogOut, Trash2 } from 'lucide-react';

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

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSocket = () => {
    return new Promise((resolve) => {
      // Initialize socket.io with Next.js API route
      fetch('/api/socketio').finally(() => {
        const newSocket = io({
          path: '/api/socketio',
          transports: ['websocket', 'polling']
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
          console.log('Connected to server');
          setIsConnecting(false);
        });

        newSocket.on('disconnect', () => {
          console.log('Disconnected from server');
        });

        // Handle chat history when user joins
        newSocket.on('chatHistory', (history) => {
          console.log('Received chat history:', history.length, 'messages');
          setMessages(history);
          
          // Show a welcome message with history info
          if (history.length > 0) {
            setTimeout(() => {
              const welcomeMessage = {
                id: Date.now() + Math.random(),
                type: 'system',
                text: `Welcome back! You're viewing the last ${history.length} messages.`,
                timestamp: new Date().toISOString(),
                isWelcome: true
              };
              setMessages(prev => [...prev, welcomeMessage]);
            }, 1000);
          }
        });

        newSocket.on('messageReceived', (message) => {
          setMessages(prev => [...prev, message]);
        });

        newSocket.on('userJoined', ({ message, username: joinedUsername }) => {
          setMessages(prev => [...prev, message]);
        });

        newSocket.on('userLeft', ({ message, username: leftUsername }) => {
          setMessages(prev => [...prev, message]);
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

        newSocket.on('historyCleared', (message) => {
          setMessages([message]);
        });

        resolve(newSocket);
      });
    });
  };

  const joinChat = async () => {
    if (username.trim()) {
      setIsConnecting(true);
      try {
        const newSocket = await initializeSocket();
        if (newSocket) {
          newSocket.emit('join', username.trim());
          setHasJoined(true);
        }
      } catch (error) {
        console.error('Failed to connect:', error);
        setIsConnecting(false);
      }
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && socket) {
      socket.emit('newMessage', { text: newMessage.trim() });
      setNewMessage('');
      handleStopTyping();
      messageInputRef.current?.focus();
    }
  };

  const clearChatHistory = () => {
    if (socket && window.confirm('Are you sure you want to clear chat history? This action cannot be undone.')) {
      socket.emit('clearHistory');
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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              Chat App
            </h1>
            <p className="text-gray-400">
              Enter your username to start chatting
            </p>
            <p className="text-sm text-gray-500 mt-2">
              💬 Chat history is preserved - see what you missed!
            </p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && joinChat()}
              placeholder="Username"
              maxLength={20}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              disabled={isConnecting}
            />
            
            <button
              onClick={joinChat}
              disabled={!username.trim() || isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {isConnecting ? 'Connecting...' : 'Join Chat'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Fixed Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0">
        {/* Header - Fixed */}
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Chat Room</h2>
            <div className="flex space-x-2">
              <button
                onClick={clearChatHistory}
                className="text-gray-400 hover:text-red-400 transition-colors"
                title="Clear Chat History"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={leaveChat}
                className="text-gray-400 hover:text-red-400 transition-colors"
                title="Leave Chat"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-1">Welcome, {username}!</p>
        </div>
        
        {/* Active Users - Fixed with its own scroll if needed */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 flex-shrink-0">
            <div className="flex items-center mb-3">
              <Users size={16} className="text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-300">
                Online ({activeUsers.length})
              </span>
            </div>
          </div>
          
          {/* Users list with independent scroll if many users */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              {activeUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-sm text-gray-300 truncate">{user.username}</span>
                  {user.typing && (
                    <span className="text-xs text-blue-400 animate-pulse flex-shrink-0">typing...</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area - Flexible */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header - Fixed */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">General Chat</h3>
          <p className="text-sm text-gray-400">
            {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'} online
          </p>
        </div>

        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${
              message.type === 'system' ? 'justify-center' : 
              message.senderId === socket?.id ? 'justify-end' : 'justify-start'
            }`}>
              {message.type === 'system' ? (
                <div className={`text-sm px-3 py-1 rounded-full flex-shrink-0 ${
                  message.isWelcome 
                    ? 'text-blue-300 bg-blue-900/30 border border-blue-700' 
                    : 'text-gray-500 bg-gray-800'
                }`}>
                  {message.text}
                </div>
              ) : (
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg flex-shrink-0 ${
                  message.senderId === socket?.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}>
                  {message.senderId !== socket?.id && (
                    <div className="text-xs text-gray-400 mb-1 truncate">
                      {message.username}
                    </div>
                  )}
                  <div className="break-words">{message.text}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg flex-shrink-0">
                <div className="text-xs text-gray-400 mb-1">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input - Fixed at bottom */}
        <div className="border-t border-gray-700 p-4 bg-gray-800 flex-shrink-0">
          <div className="flex space-x-2">
            <input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              maxLength={500}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors duration-200 flex-shrink-0"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
