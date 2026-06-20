import React from 'react';
import { Layout, Menu } from 'antd';
import { BookOutlined, LineChartOutlined, ExperimentOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const menuItems = [
  { key: '/knowledge', icon: <BookOutlined />, label: '知识库' },
  { key: '/market', icon: <LineChartOutlined />, label: '行情与技术指标' },
  { key: '/backtest', icon: <ExperimentOutlined />, label: '量化回测' },
  { key: '/trading', icon: <DollarOutlined />, label: '模拟交易' },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = '/' + location.pathname.split('/')[1];
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="dark">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 18, borderBottom: '1px solid #303030' }}>
          观涛
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={menuItems} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', fontSize: 16, fontWeight: 500, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center' }}>
          观涛 - 股票知识学习与演练平台
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
export default AppLayout;