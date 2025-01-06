import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [user] = useState(`User${Math.floor(Math.random() * 100)}`);
  const [users, setUsers] = useState([
    { name: 'User1', online: Math.random() > 0.5 },
    { name: 'User2', online: Math.random() > 0.5 }
  ]);
  const [selectedUser, setSelectedUser] = useState(null); // State for selected user
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8080/ws?user=' + user);
    ws.current.onopen = () => console.log('Connected to WebSocket');
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages((prevMessages) => [...prevMessages, data.message]);
      } else if (data.type === 'users') {
        setUsers(data.users);
      }
    };
    return () => {
      ws.current.close();
    };
  }, [user]);

  const handleSendMessage = () => {
    if (inputValue.trim() && selectedUser) {
      const message = { sender: user, receiver: selectedUser.name, text: inputValue };
      ws.current.send(JSON.stringify({ type: 'message', message }));
      setMessages((prevMessages) => [...prevMessages, message]);
      setInputValue('');
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  return (
    <div className="App">
      <div className="user-list">
        <h3>Users</h3>
        <ul>
          {users.map((user, index) => (
            <li
              key={index}
              className={`${user.online ? 'online' : 'offline'} ${selectedUser && selectedUser.name === user.name ? 'selected' : ''}`}
              onClick={() => handleUserClick(user)}
            >
              {user.name}
            </li>
          ))}
        </ul>
      </div>
      {selectedUser && (
        <div className="chat-container">
          <h2>Chat with {selectedUser.name}</h2>
          <div className="messages">
            {messages
              .map((message, index) => (
                <div key={index} className={`message ${message.sender === user ? 'sent' : 'received'}`}>
                  <div className="message-info">
                    <span className="message-sender">{message.sender}</span>
                    <div className="message-text">{message.text}</div>
                  </div>
                </div>
              ))}
          </div>
          <div className="input-container">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
