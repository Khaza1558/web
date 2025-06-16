// src/main.jsx or src/index.jsx (your React application's entry point)

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // <--- CHANGE IS HERE: Import App directly as its default export
import './style.css'; // Import your global stylesheet here

// Get the root DOM element where your React app will be rendered
const rootElement = document.getElementById('root');

// Create a React root and render your main application component
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App /> {/* <--- CHANGE IS HERE: Render App directly */}
  </React.StrictMode>,
);
