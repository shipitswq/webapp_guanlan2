import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import minimaxTheme from './styles/minimax-theme';
import './styles/design-tokens.css';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={minimaxTheme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
