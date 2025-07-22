import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './AppRouter';
import { Auth0Provider } from '@auth0/auth0-react';

const domain = "dev-hlxum64hhsohdf23.us.auth0.com";
const clientId = "umM4vPMXGVIKqRSa2GH0lyzYBTp7AfBw";
const audience = "https://dynamicboard.api";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
            redirect_uri: window.location.origin,
            audience: audience
        }}
        useRefreshTokens={true}
        cacheLocation="localstorage"
    >
        <AppRouter />
    </Auth0Provider>
);
