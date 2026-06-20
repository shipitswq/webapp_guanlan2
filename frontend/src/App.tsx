import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import KnowledgePage from './pages/Knowledge';
import MarketPage from './pages/Market';
import BacktestPage from './pages/Backtest';
import TradingPage from './pages/Trading';

const App: React.FC = () => (
  <BrowserRouter>
    <AppLayout>
      <Routes>
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/backtest" element={<BacktestPage />} />
        <Route path="/trading" element={<TradingPage />} />
        <Route path="/" element={<Navigate to="/knowledge" replace />} />
        <Route path="*" element={<Navigate to="/knowledge" replace />} />
      </Routes>
    </AppLayout>
  </BrowserRouter>
);
export default App;