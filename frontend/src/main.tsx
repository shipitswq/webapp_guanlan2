import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import minimaxTheme from './styles/minimax-theme';
import './styles/design-tokens.css';
import './style.css';

// Restore auth token from localStorage on app load
import api from './api/client';
const savedToken = localStorage.getItem('token');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = 'Bearer ' + savedToken;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={minimaxTheme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
