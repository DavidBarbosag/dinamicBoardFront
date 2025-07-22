import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import p5 from 'p5';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const API_BASE_URL =
    window.location.hostname === 'localhost'
        ? 'http://localhost:8080'
        : `http://${window.location.hostname}:8080`;

function App() {
  const { gameCode: paramCode } = useParams();
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState(paramCode);
  const [thickness, setThickness] = useState(10);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState('');

  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const strokes = useRef({});
  const canvasRef = useRef(null);
  const p5ContainerRef = useRef(null);
  const stompClientRef = useRef(null);
  const lastSentTime = useRef(0);
  const color = useRef('#' + Math.floor(Math.random() * 16777215).toString(16));
  const isDrawing = useRef(false);
  const currentStrokeId = useRef(null);
  const lastLocalPoint = useRef(null);

  useEffect(() => {
    if (!gameCode && isAuthenticated) {
      const storedCode = localStorage.getItem('postLoginGameCode');
      if (storedCode) {
        setGameCode(storedCode);
        navigate(`/board/${storedCode}`);
      }
    }
  }, [gameCode, isAuthenticated, navigate]);

  useEffect(() => {
    if (!p5ContainerRef.current || canvasRef.current || !gameCode) return;

    const sketch = (p) => {
      p.setup = () => {
        const canvas = p.createCanvas(700, 500);
        canvas.parent(p5ContainerRef.current);
        p.background(255);
        p.strokeCap(p.ROUND);
      };

      p.mousePressed = () => {
        isDrawing.current = true;
        currentStrokeId.current =
            Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        strokes.current[currentStrokeId.current] = [];
        lastLocalPoint.current = null;
      };

      p.mouseReleased = () => {
        isDrawing.current = false;
        currentStrokeId.current = null;
        lastLocalPoint.current = null;
      };

      p.draw = () => {
        p.clear();
        p.background(255);

        for (const strokeId in strokes.current) {
          const s = strokes.current[strokeId];
          for (let i = 1; i < s.length; i++) {
            const prev = s[i - 1];
            const curr = s[i];
            p.stroke(curr.color);
            p.strokeWeight(curr.thickness);
            p.line(prev.x, prev.y, curr.x, curr.y);
          }
        }

        if (
            isDrawing.current &&
            p.mouseX >= 0 &&
            p.mouseX <= p.width &&
            p.mouseY >= 0 &&
            p.mouseY <= p.height
        ) {
          const now = Date.now();
          if (now - lastSentTime.current > 10 && stompClientRef.current?.connected) {
            lastSentTime.current = now;
            const newPoint = {
              strokeId: currentStrokeId.current,
              x: p.mouseX,
              y: p.mouseY,
              color: color.current,
              thickness,
              gameCode,
            };

            strokes.current[currentStrokeId.current].push(newPoint);
            if (lastLocalPoint.current) {
              p.stroke(color.current);
              p.strokeWeight(thickness);
              p.line(lastLocalPoint.current.x, lastLocalPoint.current.y, newPoint.x, newPoint.y);
            }

            lastLocalPoint.current = { ...newPoint };
            stompClientRef.current.publish({
              destination: `/app/draw/${gameCode}`,
              body: JSON.stringify(newPoint),
            });
          }
        }
      };
    };

    canvasRef.current = new p5(sketch);

    return () => {
      canvasRef.current?.remove();
      canvasRef.current = null;
    };
  }, [thickness, gameCode]);

  useEffect(() => {
    if (!isAuthenticated || !gameCode) return;

    const connect = async () => {
      try {
        const token = await getAccessTokenSilently();

        const socket = new SockJS(`${API_BASE_URL}/ws-sockjs`);
        const client = new Client({
          webSocketFactory: () => socket,
          connectHeaders: {
            'game-code': gameCode,
            Authorization: `Bearer ${token}`,
          },
          onConnect: () => {
            console.log('WebSocket conectado ✅');

            client.subscribe(`/topic/strokes/${gameCode}`, (message) => {
              const point = JSON.parse(message.body);
              if (!strokes.current[point.strokeId]) strokes.current[point.strokeId] = [];
              strokes.current[point.strokeId].push(point);
            });

            client.subscribe(`/topic/chat/${gameCode}`, (message) => {
              const msg = JSON.parse(message.body);
              setChatMessages((prev) => [...prev, msg]);
            });

            // 👇 Cargar trazos previos desde el backend
            fetch(`${API_BASE_URL}/strokes`)

                .then((res) => {
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  return res.json();
                })
                .then((points) => {
                  points
                      .filter((p) => p.gameCode === gameCode)
                      .forEach((point) => {
                        if (!strokes.current[point.strokeId]) strokes.current[point.strokeId] = [];
                        strokes.current[point.strokeId].push(point);
                      });

                  // ✅ Redibujar garantizado con datos nuevos
                  lastLocalPoint.current = null;
                })
                .catch((err) => {
                  console.error('Error cargando trazos del backend:', err.message);
                });
          },
          onStompError: console.error,
          onWebSocketError: console.error,
        });

        client.activate();
        stompClientRef.current = client;
      } catch (err) {
        console.error('Error obteniendo token JWT:', err);
      }
    };

    connect();
    return () => stompClientRef.current?.deactivate();
  }, [getAccessTokenSilently, isAuthenticated, gameCode]);

  const sendChatMessage = () => {
    if (!newChatMessage.trim() || !stompClientRef.current?.connected) return;
    const msg = {
      user: user?.name || user?.email || 'Anon',
      content: newChatMessage,
    };
    stompClientRef.current.publish({
      destination: `/app/chat/${gameCode}`,
      body: JSON.stringify(msg),
    });
    setNewChatMessage('');
  };

  if (isLoading) return <p>Cargando...</p>;

  if (!isAuthenticated) {
    return (
        <div style={{ padding: 20 }}>
          <h2>Inicia sesión para acceder</h2>
          <button onClick={() => loginWithRedirect()}>Login</button>
        </div>
    );
  }

  return (
      <div style={{ padding: '20px' }}>
        <h2>Collaborative Drawing Board (Game: {gameCode})</h2>
        <p>
          Bienvenido, <strong>{user.name || user.email}</strong>
        </p>
        <button onClick={() => logout({ returnTo: window.location.origin })}>
          Cerrar sesión
        </button>

        <div style={{ marginTop: 10 }}>
          <label htmlFor="colorPicker">Choose color: </label>
          <input
              id="colorPicker"
              type="color"
              defaultValue={color.current}
              onChange={(e) => (color.current = e.target.value)}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label htmlFor="thicknessSlider">Brush size: </label>
          <input
              id="thicknessSlider"
              type="range"
              min="1"
              max="50"
              value={thickness}
              onChange={(e) => setThickness(parseInt(e.target.value, 10))}
          />
          <span style={{ marginLeft: 10 }}>{thickness}px</span>
        </div>

        <div ref={p5ContainerRef} style={{ marginTop: 20 }}></div>

        <div
            style={{
              border: '1px solid #ccc',
              padding: 10,
              maxWidth: 400,
              marginTop: 20,
              background: '#f9f9f9',
            }}
        >
          <h3>Chat</h3>
          <div
              style={{
                height: 200,
                overflowY: 'auto',
                border: '1px solid #ddd',
                marginBottom: 10,
                padding: 5,
              }}
          >
            {chatMessages.map((msg, idx) => (
                <div key={idx}>
                  <strong>{msg.user}</strong>: {msg.content}
                </div>
            ))}
          </div>
          <input
              type="text"
              value={newChatMessage}
              placeholder="Type a message 😎"
              onChange={(e) => setNewChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendChatMessage();
              }}
              style={{ width: '80%' }}
          />
          <button onClick={sendChatMessage} style={{ width: '18%', marginLeft: '2%' }}>
            Send
          </button>
        </div>
      </div>
  );
}

export default App;
