import React, { useState, useEffect, useRef } from 'react';
import './App.css';
const usersList = [
  { name: 'User 1', id: "user_1", online: Math.random() > 0.5 },
  { name: 'User 2', id: "user_2", online: Math.random() > 0.5 },
  { name: 'User 3', id: "user_3", online: Math.random() > 0.5 },
  { name: 'User 4', id: "user_4", online: Math.random() > 0.5 }
];
function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  // Randomly select a user as a loggedin error
  const [user] = useState(
    usersList[Math.floor(Math.random() * usersList.length)]
  );
  const users = usersList.filter((u) => u.id !== user.id);
  const [selectedUser, setSelectedUser] = useState(null); // State for selected user
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://192.168.31.212:8080/ws?user=' + user.id);
    ws.current.onopen = () => console.log('Connected to WebSocket');
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prevMessages) => [...prevMessages, data.message]);
    };
    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      // setTimeout(connectWebSocket, 1000); // Reconnect after 1 second
    };
    return () => {
      ws.current.close();
    };
  }, [user.id]);

  const handleSendMessage = () => {
    if (inputValue.trim() && selectedUser) {
      const message = { sender: user.id, receiver: selectedUser.id, text: inputValue };
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
        <h3>Online Users</h3>
        <ul>
          {users.map((user, index) => (
            <li
              key={index}
              className={`${user.online ? 'online' : 'offline'} ${selectedUser && selectedUser.id === user.id ? 'selected' : ''}`}
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
                <div key={index} className={`message ${message.sender === user.id ? 'sent' : 'received'}`}>
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
        <div className="user-list loggenId">
        <h3>loggedIn as:</h3>
        <ul>
          <li>{user.name}</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
