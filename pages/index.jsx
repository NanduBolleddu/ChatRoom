import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

let socket;

export default function Home() {
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const chatMessagesRef = useRef(null);

  useEffect(() => {
    if (isJoined) {
      fetch("/api/socket");
      socket = io({ path: "/api/socketio" });

      socket.on("connect", () => {
        socket.emit("set username", username);
      });

      socket.on("chat message", (data) => {
        setMessages((prev) => [...prev, { username: data.username, text: data.text }]);
      });

      socket.on("user joined", (name) => {
        setMessages((prev) => [...prev, { username: null, text: `${name} joined the chat` }]);
      });

      socket.on("user left", (name) => {
        setMessages((prev) => [...prev, { username: null, text: `${name} left the chat` }]);
      });

      socket.on("typing", (name) => {
        setTypingUser(name);
        setTimeout(() => setTypingUser(""), 1000);
      });

      return () => socket.disconnect();
    }
  }, [isJoined, username]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("chat message", message);
      setMessage("");
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (socket) {
      socket.emit("typing");
    }
  };

  if (!isJoined) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.joinContainer}>
          <h1 style={styles.logo}>ZapChat</h1>
          <input
            type="text"
            placeholder="Enter your username..."
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            style={styles.joinButton}
            onClick={() => username && setIsJoined(true)}
          >
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.chatWindow}>
        <header style={styles.header}>
          <h1 style={styles.logo}>ZapChat</h1>
        </header>

        <div style={styles.chatContainer} ref={chatMessagesRef}>
          {messages.map((msg, index) => {
            const isMine = msg.username === username;
            const isSystem = !msg.username;

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isSystem ? "center" : isMine ? "flex-end" : "flex-start",
                }}
              >
                {!isSystem && (
                  <span style={styles.usernameLabel}>{msg.username}</span>
                )}
                <div
                  style={{
                    ...styles.message,
                    ...(isMine
                      ? styles.myMessage
                      : isSystem
                      ? styles.systemMessage
                      : styles.otherMessage),
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          {typingUser && (
            <div style={styles.typingIndicator}>
              {typingUser} is typing...
            </div>
          )}
        </div>

        <div style={styles.inputBar}>
          <input
            type="text"
            placeholder="Type a message..."
            style={styles.textInput}
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button style={styles.sendButton} onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles = {
  pageContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f3f5",
    height: "100vh",
  },
  chatWindow: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    overflow: "hidden",
    width: "100%",
    maxWidth: "500px", // fixed width
    height: "80vh",    // fixed height for chat box
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
  },
  joinContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    border: "1px solid #ddd",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "400px",
  },
  logo: {
    color: "#5865F2",
    fontSize: "1.5rem",
    marginBottom: "20px",
    fontWeight: "bold",
  },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    marginBottom: "10px",
    width: "100%",
    fontSize: "1rem",
  },
  joinButton: {
    backgroundColor: "#5865F2",
    color: "#fff",
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
  },
  header: {
    padding: "12px",
    backgroundColor: "#f2f3f5",
    borderBottom: "1px solid #ddd",
    textAlign: "center",
  },
  chatContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  usernameLabel: {
    fontSize: "0.75rem",
    color: "#4f5660",
    marginBottom: "3px",
  },
  message: {
    padding: "10px 15px",
    borderRadius: "10px",
    maxWidth: "70%",
    wordWrap: "break-word",
  },
  myMessage: {
    backgroundColor: "#5865F2",
    color: "#fff",
  },
  otherMessage: {
    backgroundColor: "#e3e5e8",
    color: "#2e3338",
  },
  systemMessage: {
    fontStyle: "italic",
    color: "#6a7480",
    fontSize: "0.85rem",
  },
  typingIndicator: {
    fontSize: "0.85rem",
    color: "#5865F2",
    fontStyle: "italic",
    textAlign: "center",
  },
  inputBar: {
    display: "flex",
    borderTop: "1px solid #ddd",
    padding: "10px",
    backgroundColor: "#f2f3f5",
  },
  textInput: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    outline: "none",
    backgroundColor: "#fff",
    color: "#2e3338",
    fontSize: "1rem",
    marginRight: "10px",
  },
  sendButton: {
    backgroundColor: "#5865F2",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "1rem",
  },
};
