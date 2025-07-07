import { useEffect, useRef } from 'react';
import p5 from 'p5';
import axios from 'axios';

function App() {
  const color = useRef('#' + Math.floor(Math.random() * 16777215).toString(16)); // Color aleatorio por usuario
  const strokes = useRef([]); // Lista global de trazos
  const canvasRef = useRef();
  const lastSentTime = useRef(0); // Controla la frecuencia de envío al backend

  useEffect(() => {
    const sketch = (p) => {
      p.setup = () => {
        const canvas = p.createCanvas(700, 500);
        canvas.parent('container');
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
            p.mouseX > 0 &&
            p.mouseX < p.width &&
            p.mouseY > 0 &&
            p.mouseY < p.height
        ) {
          const now = Date.now();
          if (now - lastSentTime.current > 100) {
            lastSentTime.current = now;
            const newStroke = {
              x: p.mouseX,
              y: p.mouseY,
              color: color.current,
            };
            axios
                .post('http://localhost:8080/strokes', newStroke)
                .catch((err) => {
                  console.error('POST failed:', err.response?.data || err.message);
                });
          }
        }
      };
    };

    canvasRef.current = new p5(sketch);

    const interval = setInterval(() => {
      axios
          .get('http://localhost:8080/strokes')
          .then((response) => {
            strokes.current = response.data;
          })
          .catch((error) => {
            console.error('GET failed:', error.response?.data || error.message);
          });
    }, 50);

    return () => {
      clearInterval(interval);
      canvasRef.current.remove();
    };
  }, []);

  const clearCanvas = () => {
    axios
        .delete('http://localhost:8080/strokes')
        .catch((error) => {
          console.error('DELETE failed:', error.response?.data || error.message);
        });
  };

  return (
      <div>
        <h2>Collaborative Drawing Board</h2>
        <div id="container"></div>
        <button onClick={clearCanvas}>Clear</button>
      </div>
  );
}

export default App;
