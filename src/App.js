import { useEffect, useRef } from 'react';
import p5 from 'p5';
import axios from 'axios';

function App() {
  const color = useRef('#' + Math.floor(Math.random() * 16777215).toString(16));
  const strokes = useRef([]);
  const canvasRef = useRef(null);
  const lastSentTime = useRef(0);

  const API_BASE_URL =
    window.location.hostname === 'localhost'
      ? 'http://localhost:8080'
      : `http://${window.location.hostname}:8080`;

  useEffect(() => {
    let p5Instance;

    const sketch = (p) => {
      p.setup = () => {
        const canvas = p.createCanvas(700, 500);
        canvas.parent('p5-container');
        p.background(255);
      };

      p.draw = () => {
        p.clear();
        p.background(255);
        strokes.current.forEach((stroke) => {
          p.fill(stroke.color);
          p.noStroke();
          p.ellipse(stroke.x, stroke.y, 15, 15);
        });

        if (
          p.mouseIsPressed &&
          p.mouseX >= 0 &&
          p.mouseX <= p.width &&
          p.mouseY >= 0 &&
          p.mouseY <= p.height
        ) {
          const now = Date.now();
          if (now - lastSentTime.current > 100) {
            lastSentTime.current = now;
            const newStroke = {
              x: p.mouseX,
              y: p.mouseY,
              color: color.current,
            };
            axios.post(`${API_BASE_URL}/strokes`, newStroke).catch((err) => {
              console.error('POST failed:', err.response?.data || err.message);
            });
          }
        }
      };
    };

    if (canvasRef.current) {
      canvasRef.current.remove();
    }

    canvasRef.current = new p5(sketch);
    p5Instance = canvasRef.current;

    const interval = setInterval(() => {
      axios
        .get(`${API_BASE_URL}/strokes`)
        .then((res) => {
          strokes.current = res.data;
        })
        .catch((err) => {
          console.error('GET failed:', err.response?.data || err.message);
        });
    }, 100);

    return () => {
      clearInterval(interval);
      if (p5Instance) {
        p5Instance.remove();
      }
    };
  }, []);

  const clearCanvas = () => {
    axios.delete(`${API_BASE_URL}/strokes`).catch((err) => {
      console.error('DELETE failed:', err.response?.data || err.message);
    });
  };

  return (
    <div>
      <h2>Collaborative Drawing Board</h2>
      <div id="p5-container"></div>
      <button onClick={clearCanvas}>Clear</button>
    </div>
  );
}

export default App;
