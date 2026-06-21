import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOutlined, LineChartOutlined, ExperimentOutlined, DollarOutlined, StarOutlined } from '@ant-design/icons';

const menuItems = [
  { key: '/knowledge', icon: <BookOutlined />, label: '知识库' },
  { key: '/market', icon: <LineChartOutlined />, label: '行情' },
  { key: '/backtest', icon: <ExperimentOutlined />, label: '量化回测' },
  { key: '/trading', icon: <DollarOutlined />, label: '模拟交易' },
  { key: '/watchlist', icon: <StarOutlined />, label: '自选股' },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = '/' + location.pathname.split('/')[1] || '/knowledge';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Navigation ───────────────────────────────────── */}
      <nav className="mm-top-nav">
        <div
          className="mm-top-nav__logo"
          onClick={() => navigate('/knowledge')}
          style={{ cursor: 'pointer' }}
        >
          观澜
        </div>

        <div className="mm-top-nav__links">
          {menuItems.map(item => (
            <button
              key={item.key}
              className={selectedKey === item.key ? 'mm-top-nav__link--active' : 'mm-top-nav__link'}
              onClick={() => navigate(item.key)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* ── Right CTAs ─────────────────────────────────────── */}
        <div className="mm-top-nav__actions">
        </div>
      </nav>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="mm-content" style={{ flex: 1, width: '100%' }}>
        {children}
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="mm-footer">
        <span>观澜 · 股票知识学习与演练平台</span>
      </footer>
    </div>
  );
};
export default AppLayout;
