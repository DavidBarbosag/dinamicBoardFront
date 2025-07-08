import { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import axios from 'axios';

function App() {
  const color = useRef('#' + Math.floor(Math.random() * 16777215).toString(16));
  const [thickness, setThickness] = useState(10); // <- control del grosor
  const strokes = useRef([]);
  const canvasRef = useRef(null);
  const lastSentTime = useRef(0);

  const API_BASE_URL =
    window.location.hostname === 'localhost'
      ? 'http://localhost:8080'
      : `http://${window.location.hostname}:8080`;

  useEffect(() => {
    if (canvasRef.current) return;

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
          p.ellipse(
            stroke.x,
            stroke.y,
            stroke.thickness ?? 10, // grosor recibido o 10 por defecto
            stroke.thickness ?? 10
          );
        });

        if (
          p.mouseIsPressed &&
          p.mouseX >= 0 &&
          p.mouseX <= p.width &&
          p.mouseY >= 0 &&
          p.mouseY <= p.height
        ) {
          const now = Date.now();
          if (now - lastSentTime.current > 10) {
            lastSentTime.current = now;
            const newStroke = {
              x: p.mouseX,
              y: p.mouseY,
              color: color.current,
              thickness: thickness, // <- enviar grosor
            };
            axios.post(`${API_BASE_URL}/strokes`, newStroke).catch((err) => {
              console.error('POST failed:', err.response?.data || err.message);
            });
          }
        }
      };
    };

    const container = document.getElementById('p5-container');
    if (container) {
      container.innerHTML = '';
    }

    canvasRef.current = new p5(sketch);

    const interval = setInterval(() => {
      axios
        .get(`${API_BASE_URL}/strokes`)
        .then((res) => {
          strokes.current = res.data;
        })
        .catch((err) => {
          console.error('GET failed:', err.response?.data || err.message);
        });
    }, 50);

    return () => {
      clearInterval(interval);
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
    };
  }, [API_BASE_URL, thickness]);

  const clearCanvas = () => {
    axios.delete(`${API_BASE_URL}/strokes`).catch((err) => {
      console.error('DELETE failed:', err.response?.data || err.message);
    });
  };

  const handleColorChange = (e) => {
    color.current = e.target.value;
  };

  const handleThicknessChange = (e) => {
    setThickness(parseInt(e.target.value, 10));
  };

  return (
    <div>
      <h2>Collaborative Drawing Board</h2>

      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="colorPicker">Choose color: </label>
        <input
          id="colorPicker"
          type="color"
          defaultValue={color.current}
          onChange={handleColorChange}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="thicknessSlider">Brush size: </label>
        <input
          id="thicknessSlider"
          type="range"
          min="1"
          max="50"
          value={thickness}
          onChange={handleThicknessChange}
        />
        <span style={{ marginLeft: '10px' }}>{thickness}px</span>
      </div>

      <div id="p5-container"></div>

      <button onClick={clearCanvas} style={{ marginTop: '10px' }}>
        Clear
      </button>
    </div>
  );
}

export default App;
