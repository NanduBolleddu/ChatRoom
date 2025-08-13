import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Send, Users, LogOut, Trash2, Play } from 'lucide-react';

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
      <div 
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          background: 'linear-gradient(135deg, #000000 0%, #141414 50%, #000000 100%)',
        }}
      >
        {/* Netflix-style background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border border-red-600 rounded-full"></div>
          <div className="absolute top-40 right-20 w-24 h-24 border border-red-600 rounded-full"></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 border border-red-600 rounded-full"></div>
        </div>

        <div className="bg-black/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-red-900/30 relative z-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Play className="text-red-600 mr-3" size={32} />
              <h1 className="text-4xl font-black text-white tracking-wider">
                CHAT ROOM
              </h1>
            </div>
            <p className="text-gray-300">
              Enter your username to start chatting
            </p>
            <p className="text-sm text-red-400 mt-3 font-medium">
              All conversations are preserved
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinChat()}
                placeholder="Enter username"
                maxLength={20}
                className="w-full px-4 py-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors font-medium"
                disabled={isConnecting}
              />
            </div>
            
            <button
              onClick={joinChat}
              disabled={!username.trim() || isConnecting}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg"
            >
              {isConnecting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Connecting...
                </div>
              ) : (
                'START CHATTING'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen flex overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #141414 100%)',
      }}
    >
      {/* Netflix-style Sidebar */}
      <div className="w-80 bg-black/90 border-r border-red-900/30 flex flex-col flex-shrink-0 backdrop-blur-sm">
        {/* Header */}
        <div className="p-6 border-b border-red-900/30 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Play className="text-red-600 mr-3" size={24} />
              <h2 className="text-xl font-black text-white tracking-wider">CHAT ROOM</h2>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={clearChatHistory}
                className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-900/20"
                title="Clear Chat History"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={leaveChat}
                className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-900/20"
                title="Leave Chat"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
          <div className="bg-gradient-to-r from-red-600/20 to-red-800/20 rounded-lg p-3 border-l-4 border-red-600">
            <p className="text-white font-semibold">Welcome, {username}!</p>
            <p className="text-red-300 text-sm">Now watching: General Chat</p>
          </div>
        </div>
        
        {/* Active Users */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-6 flex-shrink-0">
            <div className="flex items-center mb-4">
              <Users size={20} className="text-red-500 mr-3" />
              <span className="text-lg font-bold text-white">
                Users Online
              </span>
              <span className="ml-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                {activeUsers.length}
              </span>
            </div>
          </div>
          
          {/* Users list */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-3">
              {activeUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-900/30 border border-gray-800 hover:border-red-900/50 transition-colors">
                  <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0 animate-pulse"></div>
                  <div className="flex-1">
                    <span className="text-white font-medium truncate block">{user.username}</span>
                    {user.typing && (
                      <span className="text-red-400 text-xs animate-pulse font-medium">typing...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-black/80 border-b border-red-900/30 p-6 flex-shrink-0 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">General Chat</h3>
              <p className="text-red-300 font-medium">
                {activeUsers.length} {activeUsers.length === 1 ? 'viewer' : 'viewers'} watching
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-medium">LIVE</span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${
              message.type === 'system' ? 'justify-center' : 
              message.senderId === socket?.id ? 'justify-end' : 'justify-start'
            }`}>
              {message.type === 'system' ? (
                <div className={`text-sm px-4 py-2 rounded-full flex-shrink-0 font-medium ${
                  message.isWelcome 
                    ? 'text-red-200 bg-red-900/40 border border-red-700/50' 
                    : 'text-gray-300 bg-gray-800/50 border border-gray-700'
                }`}>
                  {message.text}
                </div>
              ) : (
                <div className={`max-w-xs lg:max-w-md px-5 py-3 rounded-2xl flex-shrink-0 shadow-lg backdrop-blur-sm ${
                  message.senderId === socket?.id
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border border-red-500/50'
                    : 'bg-gray-900/80 text-gray-100 border border-gray-700/50'
                }`}>
                  {message.senderId !== socket?.id && (
                    <div className="text-xs text-red-300 mb-2 font-semibold truncate">
                      {message.username}
                    </div>
                  )}
                  <div className="break-words font-medium">{message.text}</div>
                  <div className="text-xs opacity-75 mt-2 font-medium">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-900/80 text-gray-200 px-5 py-3 rounded-2xl flex-shrink-0 border border-gray-700/50 backdrop-blur-sm">
                <div className="text-xs text-red-300 mb-2 font-semibold">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-red-900/30 p-6 bg-black/50 flex-shrink-0 backdrop-blur-sm">
          <div className="flex space-x-4">
            <input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="flex-1 px-5 py-3 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors font-medium"
              maxLength={500}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 flex-shrink-0 transform hover:scale-105 disabled:scale-100 shadow-lg"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
