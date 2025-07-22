import React, { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const Chat = ({ username }) => {
    const [client, setClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    const API_BASE_URL =
        window.location.hostname === 'localhost'
            ? 'http://localhost:8080'
            : `http://${window.location.hostname}:8080`;

    useEffect(() => {
        const socket = new SockJS(`${API_BASE_URL}/ws`);
        const stompClient = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                stompClient.subscribe('/topic/chat', (message) => {
                    const msg = JSON.parse(message.body);
                    setMessages((prev) => [...prev, msg]);
                });
            },
            onDisconnect: () => {
                console.log('Disconnected from chat WebSocket');
            },
        });

        stompClient.activate();
        setClient(stompClient);

        return () => {
            stompClient.deactivate();
        };
    }, [API_BASE_URL]);

    const sendMessage = () => {
        if (newMessage.trim() === '' || !client) return;
        const msg = {
            user: username,
            content: newMessage,
        };
        client.publish({ destination: '/app/chat', body: JSON.stringify(msg) });
        setNewMessage('');
    };

    return (
        <div style={{ border: '1px solid #ccc', padding: 10, marginTop: 20, maxWidth: 400 }}>
            <h3>Chat</h3>
            <div style={{ height: 200, overflowY: 'auto', marginBottom: 10, border: '1px solid #ddd', padding: 5 }}>
                {messages.map((msg, index) => (
                    <div key={index}><strong>{msg.user}</strong>: {msg.content}</div>
                ))}
            </div>
            <input
                type="text"
                value={newMessage}
                placeholder="Type a message 😄"
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                style={{ width: '80%' }}
            />
            <button onClick={sendMessage} style={{ width: '18%', marginLeft: '2%' }}>Send</button>
        </div>
    );
};

export default Chat;
