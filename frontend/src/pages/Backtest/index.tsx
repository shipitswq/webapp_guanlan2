import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Row, Col, Statistic, Table, message, Spin } from 'antd';
import api from '../../api/client';

const BacktestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form] = Form.useForm();

  const runBacktest = async (values: any) => {
    if (!values.stock_code) { message.error('请输入股票代码'); return; }
    setLoading(true);
    try {
      const res = await api.post('/api/v1/backtest/run', {
        stock_code: values.stock_code, strategy: values.strategy || 'ma_cross',
        start_date: values.start_date || '', end_date: values.end_date || '',
        params: { n1: values.n1 || 5, n2: values.n2 || 20 },
      });
      setResult(res.data);
      if (res.data.error) message.error(res.data.error); else message.success('回测完成');
    } catch (e: any) { message.error(e?.response?.data?.detail || '回测运行失败'); }
    setLoading(false);
  };

  const tradeColumns = [
    { title: '日期', dataIndex: 'date', key: 'date' },
    { title: '方向', dataIndex: 'type', key: 'type', render: (t: string) => t === 'buy' ? <span style={{ color: '#f5222d' }}>买入</span> : <span style={{ color: '#52c41a' }}>卖出</span> },
    { title: '价格', dataIndex: 'price', key: 'price', render: (v: number) => v?.toFixed(2) },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
  ];

  return (
    <div>
      <Row gutter={24}>
        <Col span={8}>
          <Card title="回测参数">
            <Form form={form} layout="vertical" onFinish={runBacktest} initialValues={{ strategy: 'ma_cross', n1: 5, n2: 20 }}>
              <Form.Item name="stock_code" label="股票代码" rules={[{ required: true }]}><Input placeholder="如 000001" /></Form.Item>
              <Form.Item name="strategy" label="策略">
                <Select><Select.Option value="ma_cross">双均线交叉 (MA)</Select.Option><Select.Option value="macd">MACD 金叉死叉</Select.Option></Select>
              </Form.Item>
              <Form.Item name="n1" label="快线周期 (N1)"><InputNumber min={2} max={120} /></Form.Item>
              <Form.Item name="n2" label="慢线周期 (N2)"><InputNumber min={5} max={250} /></Form.Item>
              <Form.Item name="start_date" label="开始日期"><Input placeholder="20230101" /></Form.Item>
              <Form.Item name="end_date" label="结束日期"><Input placeholder="20240101" /></Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>运行回测</Button>
            </Form>
          </Card>
        </Col>
        <Col span={16}>
          {loading && <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" tip="回测运行中..." /></div>}
          {result && !result.error && !loading && (
            <>
              <Card title="绩效指标">
                <Row gutter={16}>
                  <Col span={6}><Statistic title="总收益率" value={result.total_return} suffix="%" precision={2} valueStyle={{ color: result.total_return >= 0 ? '#3f8600' : '#cf1322' }} /></Col>
                  <Col span={6}><Statistic title="年化收益" value={result.annual_return} suffix="%" precision={2} /></Col>
                  <Col span={6}><Statistic title="最大回抽" value={result.max_drawdown} suffix="%" precision={2} valueStyle={{ color: '#cf1322' }} /></Col>
                  <Col span={6}><Statistic title="夏普比率" value={result.sharpe_ratio} precision={2} /></Col>
                  <Col span={6}><Statistic title="交易次数" value={result.trade_count} /></Col>
                </Row>
              </Card>
              {result.trades?.length > 0 && (
                <Card title="交易明细" style={{ marginTop: 16 }}>
                  <Table dataSource={result.trades.map((t: any, i: number) => ({ ...t, key: i }))} columns={tradeColumns} size="small" pagination={false} />
                </Card>
              )}
            </>
          )}
          {result?.error && <Card><div style={{ color: '#cf1322' }}>{result.error}</div></Card>}
        </Col>
      </Row>
    </div>
  );
};
export default BacktestPage;