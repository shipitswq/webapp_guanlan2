import React, { useEffect, useState } from 'react';
import { Input, Table, Tag, Button, Spin, Empty, message, AutoComplete } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

interface WatchlistStock {
  code: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
}

const WatchlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<{code: string; name: string}[]>([]);
  const [adding, setAdding] = useState(false);

  // Load default watchlist stocks
  useEffect(() => {
    setLoading(true);
    api.get('/api/v1/stocks/search', { params: { q: '' } })
      .then(res => {
        const items = (res.data.items || []).slice(0, 6).map((s: any) => ({
          code: s.code,
          name: s.name,
          price: +(Math.random() * 50 + 5).toFixed(2),
          change: +(Math.random() * 4 - 2).toFixed(2),
          change_pct: +(Math.random() * 8 - 4).toFixed(2),
        }));
        setStocks(items);
      })
      .catch(() => {
        // Fallback demo data
        setStocks([
          { code: '000001', name: '平安银行', price: 12.36, change: 0.28, change_pct: 2.32 },
          { code: '600519', name: '贵州茅台', price: 1580.00, change: -12.50, change_pct: -0.78 },
          { code: '300750', name: '宁德时代', price: 218.50, change: 5.60, change_pct: 2.63 },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (!text || text.length < 1) { setSearchResults([]); return; }
    try {
      const res = await api.get('/api/v1/stocks/search', { params: { q: text } });
      setSearchResults(res.data.items || []);
    } catch { setSearchResults([]); }
  };

  const addStock = async (code: string, name: string) => {
    if (stocks.find(s => s.code === code)) {
      message.warning('该股票已在自选列表中');
      return;
    }
    setAdding(true);
    try {
      // Try to get real price, fallback to mock
      let price = +(Math.random() * 100 + 5).toFixed(2);
      let change = +(Math.random() * 5 - 2.5).toFixed(2);
      let change_pct = +((change / price) * 100).toFixed(2);
      try {
        const klineRes = await api.get('/api/v1/stocks/' + code + '/kline');
        if (klineRes.data?.close?.length > 0) {
          const closes = klineRes.data.close;
          price = closes[closes.length - 1];
          change = +(price - closes[closes.length - 2]).toFixed(2);
          change_pct = +((change / closes[closes.length - 2]) * 100).toFixed(2);
        }
      } catch {}
      setStocks(prev => [...prev, { code, name, price, change, change_pct }]);
      setSearchText('');
      setSearchResults([]);
      message.success('已添加 ' + name);
    } finally { setAdding(false); }
  };

  const removeStock = (code: string) => {
    setStocks(prev => prev.filter(s => s.code !== code));
  };

  const columns = [
    {
      title: '代码', dataIndex: 'code', key: 'code', width: 100,
      render: (code: string) => <span style={{ fontFamily: 'var(--mm-font-family)', fontWeight: 500, color: 'var(--mm-ink)' }}>{code}</span>,
    },
    {
      title: '名称', dataIndex: 'name', key: 'name', width: 120,
      render: (name: string, record: WatchlistStock) => (
        <a onClick={() => navigate('/market?code=' + record.code)} style={{ cursor: 'pointer' }}>
          {name}
        </a>
      ),
    },
    {
      title: '最新价', dataIndex: 'price', key: 'price', width: 120,
      render: (price: number) => <span style={{ fontFamily: 'var(--mm-font-family)', fontWeight: 600 }}>{price.toFixed(2)}</span>,
    },
    {
      title: '涨跌幅', dataIndex: 'change_pct', key: 'change_pct', width: 120,
      render: (pct: number) => (
        <Tag color={pct >= 0 ? 'green' : 'red'} style={{ borderRadius: 'var(--mm-radius-full)' }}>
          {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
        </Tag>
      ),
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: WatchlistStock) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeStock(record.code)}
        />
      ),
    },
  ];

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--mm-space-lg)' }}>
        <p className="mm-heading-sm" style={{ margin: 0 }}>自选股</p>
      </div>

      {/* ── Add Stock ─────────────────────────────────────────── */}
      <div className="mm-card" style={{ marginBottom: 'var(--mm-space-lg)', padding: 'var(--mm-space-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--mm-space-md)', alignItems: 'center' }}>
          <AutoComplete
            value={searchText}
            options={searchResults.map(s => ({ value: s.code + ' - ' + s.name }))}
            onSearch={handleSearch}
            onSelect={v => {
              const parts = v.split(' - ');
              addStock(parts[0], parts[1]);
            }}
            style={{ width: 320 }}
            placeholder="搜索股票代码或名称"
            notFoundContent="未找到匹配股票"
          >
            <Input.Search
              enterButton={<><PlusOutlined /> 添加</>}
              loading={adding}
              onSearch={() => {
                if (searchResults.length > 0) {
                  addStock(searchResults[0].code, searchResults[0].name);
                }
              }}
            />
          </AutoComplete>
        </div>
      </div>

      {/* ── Stock List ────────────────────────────────────────── */}
      {loading ? (
        <Spin style={{ display: 'block', margin: '60px auto' }} />
      ) : stocks.length === 0 ? (
        <div className="mm-card" style={{ textAlign: 'center', padding: 'var(--mm-space-section)' }}>
          <Empty description="暂无自选股，搜索添加吧" />
        </div>
      ) : (
        <div className="mm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <Table
            dataSource={stocks}
            columns={columns}
            rowKey="code"
            pagination={false}
            size="middle"
          />
        </div>
      )}
    </div>
  );
};
export default WatchlistPage;
