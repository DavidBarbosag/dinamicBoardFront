import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import App from './App';
import { Lobby } from './Lobby';

function LobbyWrapper() {
    const navigate = useNavigate();

    const onJoin = (code) => {
        navigate(`/game/${code}`);
    };

    return <Lobby onJoin={onJoin} />;
}

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LobbyWrapper />} />
                <Route path="/lobby" element={<LobbyWrapper />} />
                <Route path="/game/:gameCode" element={<App />} />
                <Route path="/board/:gameCode" element={<App />} />
            </Routes>
        </BrowserRouter>
    );
}
