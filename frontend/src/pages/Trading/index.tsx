import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Row, Col, Table, Statistic, message, Tabs } from 'antd';
import api from '../../api/client';

const TradingPage: React.FC = () => {
  const [account, setAccount] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [accRes, posRes, ordRes] = await Promise.all([
        api.get('/api/v1/trading/account').catch(() => null),
        api.get('/api/v1/trading/positions').catch(() => null),
        api.get('/api/v1/trading/orders').catch(() => null),
      ]);
      if (accRes) setAccount(accRes.data);
      if (posRes) setPositions(posRes.data.items || []);
      if (ordRes) setOrders(ordRes.data.items || []);
    } catch (e) {}
  };
  useEffect(() => { fetchData(); }, []);

  const placeOrder = async (values: any) => {
    setLoading(true);
    try {
      await api.post('/api/v1/trading/orders', {
        stock_code: values.stock_code, direction: values.direction,
        order_type: values.order_type || 'market', price: values.price || 0, quantity: values.quantity,
      });
      message.success('下单成功');
      fetchData();
    } catch (e: any) { message.error(e?.response?.data?.detail || '下单失败'); }
    setLoading(false);
  };

  const posCols = [
    { title: '股票', dataIndex: 'stock_code', key: 'stock_code' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '成本价', dataIndex: 'cost_price', key: 'cost_price', render: (v: number) => v?.toFixed(2) },
    { title: '现价', dataIndex: 'current_price', key: 'current_price', render: (v: number) => v?.toFixed(2) },
    { title: '浮动盈亏', dataIndex: 'float_pl', key: 'float_pl', render: (v: number) => <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>{v >= 0 ? '+' : ''}{v?.toFixed(2)}</span> },
  ];

  const ordCols = [
    { title: '股票', dataIndex: 'stock_code', key: 'stock_code' },
    { title: '方向', dataIndex: 'direction', key: 'direction', render: (d: string) => d === 'buy' ? <span style={{ color: '#f5222d' }}>买入</span> : <span style={{ color: '#52c41a' }}>卖出</span> },
    { title: '类型', dataIndex: 'order_type', key: 'order_type' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '成交价', dataIndex: 'filled_price', key: 'filled_price', render: (v: number) => v?.toFixed(2) },
    { title: '状态', dataIndex: 'status', key: 'status' },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (t: string) => t?.slice(0, 16).replace('T', ' ') },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <div className="mm-card" style={{ padding: 'var(--mm-space-lg)' }}>
            <div className="mm-card-title" style={{ fontSize: 16, marginBottom: 'var(--mm-space-md)' }}>账户概览</div>
            <Statistic title="总资产" value={account?.total_assets || 0} precision={2} prefix="¥" />
            <Statistic title="可用资金" value={account?.cash || 0} precision={2} prefix="¥" style={{ marginTop: 8 }} />
            <Statistic title="持仓市值" value={account?.position_value || 0} precision={2} prefix="¥" style={{ marginTop: 8 }} />
            <Statistic title="总收益率" value={account?.total_return || 0} suffix="%" precision={2} valueStyle={{ color: (account?.total_return || 0) >= 0 ? '#3f8600' : '#cf1322' }} style={{ marginTop: 8 }} />
          </div>
        </Col>
        <Col span={8}>
          <div className="mm-card" style={{ padding: 'var(--mm-space-lg)' }}>
            <div className="mm-card-title" style={{ fontSize: 16, marginBottom: 'var(--mm-space-md)' }}>下单</div>
            <Form layout="vertical" onFinish={placeOrder} initialValues={{ direction: 'buy', order_type: 'market' }}>
              <Form.Item name="stock_code" label="股票代码" rules={[{ required: true }]}><Input placeholder="如 000001" /></Form.Item>
              <Form.Item name="direction" label="方向"><Select><Select.Option value="buy">买入</Select.Option><Select.Option value="sell">卖出</Select.Option></Select></Form.Item>
              <Form.Item name="order_type" label="订单类型"><Select><Select.Option value="market">市价单</Select.Option><Select.Option value="limit">限价单</Select.Option></Select></Form.Item>
              <Form.Item name="price" label="价格（限价单必填）"><InputNumber style={{ width: '100%' }} min={0} step={0.01} /></Form.Item>
              <Form.Item name="quantity" label="数量" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={100} step={100} /></Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>提交订单</Button>
            </Form>
          </div>
        </Col>
        <Col span={8}>
          <div className="mm-card" style={{ padding: 'var(--mm-space-lg)' }}>
            <div className="mm-card-title" style={{ fontSize: 16, marginBottom: 'var(--mm-space-md)' }}>当前持仓</div>
            <Table dataSource={positions} columns={posCols} size="small" pagination={false} scroll={{ y: 240 }} rowKey="stock_code" />
          </div>
        </Col>
      </Row>
      <div className="mm-card" style={{ marginTop: 16, padding: 'var(--mm-space-lg)' }}>
        <div className="mm-card-title" style={{ fontSize: 16, marginBottom: 'var(--mm-space-md)' }}>历史订单</div>
        <Table dataSource={orders} columns={ordCols} size="small" pagination={{ pageSize: 10 }} rowKey="id" />
      </div>
    </div>
  );
};
export default TradingPage;
