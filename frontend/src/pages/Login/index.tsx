import React, { useState } from 'react';
import { Input, Button, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) { message.warning('请输入用户名和密码'); return; }
    setLoading(true);
    try {
      const res = await api.post('/api/v1/auth/' + tab, { username, password });
      const data = res.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_id', String(data.user_id));
      // Update axios default header
      api.defaults.headers.common['Authorization'] = 'Bearer ' + data.token;
      message.success(tab === 'login' ? '登录成功' : '注册成功');
      navigate('/knowledge');
    } catch (e: any) {
      const detail = e?.response?.data?.detail || '操作失败';
      message.error(detail);
    } finally { setLoading(false); }
  };

  // If already logged in, redirect
  const token = localStorage.getItem('token');
  if (token) { navigate('/knowledge'); return null; }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--mm-surface)',
      fontFamily: 'var(--mm-font-family)',
    }}>
      <div className="mm-card" style={{ width: 380, padding: 'var(--mm-space-xxl)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--mm-space-xl)' }}>
          <div className="mm-heading-sm" style={{ margin: 0 }}>观澜</div>
          <div className="mm-caption" style={{ marginTop: 4 }}>股票知识学习与演练平台</div>
        </div>

        <Tabs
          activeKey={tab}
          onChange={k => setTab(k as 'login' | 'register')}
          centered
          items={[
            { key: 'login', label: '登录' },
            { key: 'register', label: '注册' },
          ]}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-space-md)' }}>
          <Input
            prefix={<UserOutlined style={{ color: 'var(--mm-stone)' }} />}
            placeholder="用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onPressEnter={handleSubmit}
          />
          <Input.Password
            prefix={<LockOutlined style={{ color: 'var(--mm-stone)' }} />}
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onPressEnter={handleSubmit}
          />
          <Button type="primary" block loading={loading} onClick={handleSubmit}>
            {tab === 'login' ? '登录' : '注册'}
          </Button>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
