import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
    window.location.hostname === 'localhost'
        ? 'http://localhost:8080'
        : `http://${window.location.hostname}:8080`;

export function Lobby({ onJoin }) {
    const [code, setCode] = useState('');
    const navigate = useNavigate();

    const { loginWithRedirect, isAuthenticated } = useAuth0();

    // 🔁 Si ya estamos autenticados y hay un código guardado, redirigir
    useEffect(() => {
        if (isAuthenticated) {
            const storedCode = localStorage.getItem('postLoginGameCode');
            if (storedCode) {
                localStorage.removeItem('postLoginGameCode');
                onJoin(storedCode);
                navigate(`/board/${storedCode}`);
            }
        }
    }, [isAuthenticated, onJoin, navigate]);

    const joinGame = () => {
        if (code.trim()) {
            const gameCode = code.trim().toUpperCase();
            if (!isAuthenticated) {
                localStorage.setItem('postLoginGameCode', gameCode);
                loginWithRedirect(); // Redirige al login de Auth0
            } else {
                onJoin(gameCode);
                navigate(`/board/${gameCode}`);
            }
        }
    };

    const createGame = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/game/create`, { method: 'POST' });
            if (!res.ok) throw new Error('Error creando partida');
            const newCode = await res.text();

            if (!isAuthenticated) {
                localStorage.setItem('postLoginGameCode', newCode);
                loginWithRedirect(); // Redirige al login de Auth0
            } else {
                onJoin(newCode);
                navigate(`/board/${newCode}`);
            }
        } catch (e) {
            alert('Error creando partida');
            console.error(e);
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <h2>Lobby</h2>
            <input
                type="text"
                maxLength={6}
                placeholder="Enter game code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase', marginRight: 10 }}
            />
            <button onClick={joinGame}>Join Game</button>
            <hr />
            <button onClick={createGame}>Create New Game</button>
        </div>
    );
}
