# Dinamic Board Frontend

This project is the frontend for a collaborative whiteboard built with React, p5.js, and Axios.

## Features

- Real-time collaborative drawing using p5.js.
- Stroke synchronization with a backend via REST API.
- Button to clear the board.
- Each user gets a random color.

## Requirements

- Node.js and npm installed.
- Backend running at `http://localhost:8080` with `/strokes` endpoints (GET, POST, DELETE).

## Installation

1. Clone the repository.
2. Install dependencies:
    ```bash
    npm install
    ```
3. Start the application:
    ```bash
    npm start
    ```
4. Open your browser and navigate to `http://localhost:3000`.

## Available Scripts

- `npm start` — Starts the app in development mode.
- `npm test` — Runs the tests.
- `npm run build` — Builds the production version.

## Main Structure

- `src/App.js`: Main whiteboard logic.
- `src/index.js`: React entry point.
- `src/index.css`: Global styles.

## Notes

- Make sure the backend is running before starting the frontend.
- The "Clear" button deletes all strokes for all users.