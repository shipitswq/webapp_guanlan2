import React, { useEffect, useRef, useState } from "react";
import { Form, Input, InputNumber, Select, Button, Card, Row, Col, Statistic, Table, message, Spin } from "antd";
import { createChart, AreaSeries, LineSeries } from "lightweight-charts";
import api from "../../api/client";

const BacktestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form] = Form.useForm();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  const [strategyName, setStrategyName] = useState('');
  const [savedStrategies, setSavedStrategies] = useState([]);

  useEffect(() => { api.get('/api/v1/backtest/strategies').then(r => setSavedStrategies(r.data.items || [])).catch(() => {}); }, []);

  const runBacktest = async (values: any) => {
    if (!values.stock_code) { message.error("请输入股票代码"); return; }
    setLoading(true);
    try {
      const res = await api.post("/api/v1/backtest/run", {
        stock_code: values.stock_code, strategy: values.strategy || "ma_cross",
        start_date: values.start_date || "", end_date: values.end_date || "",
        params: { n1: values.n1 || 5, n2: values.n2 || 20 },
      });
      setResult(res.data);
      if (res.data.error) message.error(res.data.error); else message.success("回测完成");
    } catch (e: any) { message.error(e?.response?.data?.detail || "回测运行失败"); }
    setLoading(false);
  };

  // Render equity curve chart
  useEffect(() => {
    if (!chartRef.current || !result?.equity_curve?.length) return;
    if (chartInstanceRef.current) { chartInstanceRef.current.remove(); chartInstanceRef.current = null; }

    const chart = createChart(chartRef.current, {
      height: 280, layout: { background: { color: "#ffffff" }, textColor: "#333" },
      grid: { vertLines: { color: "#f0f0f0" }, horzLines: { color: "#f0f0f0" } },
      rightPriceScale: { borderColor: "#e0e0e0" },
      timeScale: { borderColor: "#e0e0e0", timeVisible: false },
    });
    chartInstanceRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#1890ff", topColor: "rgba(24,144,255,0.3)", bottomColor: "rgba(24,144,255,0.05)", lineWidth: 2,
    });
    areaSeries.setData(result.equity_curve.map((d: any) => ({
      time: d.date.replace(/-/g, "/"), value: d.capital,
    })));

    // Add baseline at initial capital
    const baselineSeries = chart.addSeries(LineSeries, {
      color: "#ff9800", lineWidth: 1, lineStyle: 2,  // dashed
    });
    const equity = result.equity_curve;
    baselineSeries.setData(equity.map((d: any) => ({
      time: d.date.replace(/-/g, "/"), value: equity[0].capital,
    })));

    chart.timeScale().fitContent();

    return () => { if (chartInstanceRef.current) { chartInstanceRef.current.remove(); chartInstanceRef.current = null; } };
  }, [result]);

  const tradeColumns = [
    { title: "日期", dataIndex: "date", key: "date" },
    { title: "方向", dataIndex: "type", key: "type", render: (t: string) => t === "buy" ? <span style={{ color: "#f5222d" }}>买入</span> : <span style={{ color: "#52c41a" }}>卖出</span> },
    { title: "价格", dataIndex: "price", key: "price", render: (v: number) => v?.toFixed(2) },
    { title: "数量", dataIndex: "quantity", key: "quantity" },
  ];

  const saveStrategy = async () => {
    const values = form.getFieldsValue();
    if (!strategyName.trim()) { message.warning('请输入策略名称'); return; }
    try {
      await api.post('/api/v1/backtest/strategies', { name: strategyName, strategy_type: values.strategy || 'ma_cross', params: { n1: values.n1 || 5, n2: values.n2 || 20 } });
      message.success('策略已保存');
      setStrategyName('');
      api.get('/api/v1/backtest/strategies').then(r => setSavedStrategies(r.data.items || [])).catch(() => {});
    } catch (e: any) { message.error(e?.response?.data?.detail || '保存失败'); }
  };

  const loadStrategy = (strategy: any) => {
    form.setFieldsValue({
      strategy: strategy.strategy_type,
      n1: strategy.params?.n1 || 5,
      n2: strategy.params?.n2 || 20,
    });
    message.success('已加载: ' + strategy.name);
  };

  return (
    <div>
      <Row gutter={24}>
        <Col span={8}>
          <Card title="回测参数">
            <Form form={form} layout="vertical" onFinish={runBacktest} initialValues={{ strategy: "ma_cross", n1: 5, n2: 20 }}>
              <Form.Item name="stock_code" label="股票代码" rules={[{ required: true }]}><Input placeholder="如 000001" /></Form.Item>
              <Form.Item name="strategy" label="策略">
                <Select><Select.Option value="ma_cross">双均线交叉 (MA)</Select.Option><Select.Option value="macd">MACD 金叉死叉</Select.Option><Select.Option value="mean_reversion">均值回归 (布林带)</Select.Option><Select.Option value="momentum">动量策略</Select.Option></Select>
              </Form.Item>
              <Form.Item name="n1" label="快线周期 (N1)"><InputNumber min={2} max={120} /></Form.Item>
              <Form.Item name="n2" label="慢线周期 (N2)"><InputNumber min={5} max={250} /></Form.Item>
<Form.Item label="保存策略">
  <div style={{ display: 'flex', gap: 8 }}>
    <Input placeholder="策略名称" value={strategyName} onChange={e => setStrategyName(e.target.value)} style={{ flex: 1 }} />
    <Button onClick={saveStrategy} disabled={!result}>保存</Button>
  </div>
</Form.Item>
<Form.Item label="加载策略">
  <Select
    placeholder="选择已保存的策略"
    allowClear
    onChange={(v) => { const s = savedStrategies.find((x: any) => x.id === v); if (s) loadStrategy(s); }}
    notFoundContent="暂无保存的策略"
    value={undefined}
  >
    {savedStrategies.map((s: any) => (
      <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
    ))}
  </Select>
</Form.Item>
              <Form.Item name="start_date" label="开始日期"><Input placeholder="20230101" /></Form.Item>
              <Form.Item name="end_date" label="结束日期"><Input placeholder="20240101" /></Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>运行回测</Button>
            </Form>
          </Card>
        </Col>
        <Col span={16}>
          {loading && <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" tip="回测运行中..." /></div>}
          {result && !result.error && !loading && (
            <>
              <Card title="绩效指标">
                <Row gutter={16}>
                  <Col span={6}><Statistic title="总收益率" value={result.total_return} suffix="%" precision={2} valueStyle={{ color: result.total_return >= 0 ? "#3f8600" : "#cf1322" }} /></Col>
                  <Col span={6}><Statistic title="年化收益" value={result.annual_return} suffix="%" precision={2} /></Col>
                  <Col span={6}><Statistic title="最大回撤" value={result.max_drawdown} suffix="%" precision={2} valueStyle={{ color: "#cf1322" }} /></Col>
                  <Col span={6}><Statistic title="夏普比率" value={result.sharpe_ratio} precision={2} /></Col>
                  <Col span={6}><Statistic title="交易次数" value={result.trade_count} /></Col>
                </Row>
              </Card>
              <Card title="资金曲线" style={{ marginTop: 16 }}>
                <div ref={chartRef} />
              </Card>
              {result.trades?.length > 0 && (
                <Card title="交易明细" style={{ marginTop: 16 }}>
                  <Table dataSource={result.trades.map((t: any, i: number) => ({ ...t, key: i }))} columns={tradeColumns} size="small" pagination={false} />
                </Card>
              )}
            </>
          )}
          {result?.error && <Card><div style={{ color: "#cf1322" }}>{result.error}</div></Card>}
        </Col>
      </Row>
    </div>
  );
};
export default BacktestPage;



