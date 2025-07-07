import { useEffect, useRef } from 'react';
import p5 from 'p5';
import axios from 'axios';

function App() {
  const color = useRef('#' + Math.floor(Math.random() * 16777215).toString(16));
  const strokes = useRef([]);
  const localBuffer = useRef([]); // Para acumular puntos antes de enviarlos
  const canvasRef = useRef();

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

        // Dibuja todos los strokes recibidos
        strokes.current.forEach((stroke) => {
          p.fill(stroke.color);
          p.noStroke();
          p.ellipse(stroke.x, stroke.y, 15, 15);
        });

        // Dibuja strokes locales aún no enviados (opcional)
        localBuffer.current.forEach((stroke) => {
          p.fill(stroke.color);
          p.noStroke();
          p.ellipse(stroke.x, stroke.y, 15, 15);
        });

        // Captura nuevos puntos
        if (
            p.mouseIsPressed &&
            p.mouseX >= 0 &&
            p.mouseX <= p.width &&
            p.mouseY >= 0 &&
            p.mouseY <= p.height
        ) {
          const newStroke = {
            x: p.mouseX,
            y: p.mouseY,
            color: color.current,
          };
          localBuffer.current.push(newStroke);
        }
      };
    };

    canvasRef.current = new p5(sketch);

    // GET loop: sincroniza desde el backend
    const getInterval = setInterval(() => {
      axios
          .get('http://localhost:8080/strokes')
          .then((response) => {
            strokes.current = response.data;
          })
          .catch((error) => {
            console.error('GET failed:', error.response?.data || error.message);
          });
    }, 100); // 10 veces por segundo

    // POST loop: envía cada 100ms los trazos locales acumulados
    const postInterval = setInterval(() => {
      if (localBuffer.current.length > 0) {
        const batch = [...localBuffer.current];
        localBuffer.current = []; // Vacía el buffer

        axios
            .post('http://localhost:8080/strokes', batch)
            .catch((error) => {
              console.error('POST failed:', error.response?.data || error.message);
            });
      }
    }, 100);

    return () => {
      clearInterval(getInterval);
      clearInterval(postInterval);
      canvasRef.current.remove();
    };
  }, []);

  const clearCanvas = () => {
    axios.delete('http://localhost:8080/strokes');
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
