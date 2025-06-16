// src/main.jsx or src/index.jsx (your React application's entry point)

import React from 'react';
import ReactDOM from 'react-dom/client';
import App, { AuthContextProvider } from './App.jsx'; // <--- IMPORTANT: Import both App (default) and AuthContextProvider (named)
import './style.css'; // Import your global stylesheet here

// Get the root DOM element where your React app will be rendered
const rootElement = document.getElementById('root');

// Create a React root and render your main application component
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/* This is where the AuthContextProvider MUST wrap the App component */}
    <AuthContextProvider> 
      <App />
    </AuthContextProvider>
  </React.StrictMode>,
);
