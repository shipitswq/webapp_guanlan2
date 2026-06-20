import React, { useEffect, useRef, useState } from 'react';
import { Input, Space, Card, Row, Col, Checkbox, Spin } from 'antd';
import { createChart } from 'lightweight-charts';
import api from '../../api/client';

const indicatorOptions = [
  { label: 'MA5', value: 'MA5' }, { label: 'MA10', value: 'MA10' }, { label: 'MA20', value: 'MA20' }, { label: 'MA60', value: 'MA60' },
  { label: 'MACD', value: 'MACD' }, { label: 'KDJ', value: 'KDJ' }, { label: 'RSI', value: 'RSI' }, { label: '布林带', value: 'BOLL' },
];

const MarketPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [code, setCode] = useState('000001');
  const [loading, setLoading] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['MA5', 'MA10', 'MA20']);
  const seriesRefs = useRef<any[]>([]);

  const clearAllSeries = () => { seriesRefs.current.forEach(s => { try { chartRef.current?.removeSeries(s); } catch(e) {} }); seriesRefs.current = []; };

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 500,
      layout: { background: { color: '#ffffff' }, textColor: '#333' },
      grid: { vertLines: { color: '#f0f0f0' }, horzLines: { color: '#f0f0f0' } },
      timeScale: { timeVisible: false },
    });
    chartRef.current = chart;
    const handleResize = () => { chart.applyOptions({ width: containerRef.current?.clientWidth || 800 }); };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!code || !chartRef.current) return;
    setLoading(true);
    clearAllSeries();
    const candleSeries = chartRef.current.addCandlestickSeries();
    const volumeSeries = chartRef.current.addHistogramSeries({ color: '#26a69a', priceFormat: { type: 'volume' }, priceScaleId: '' });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    seriesRefs.current.push(candleSeries, volumeSeries);

    api.get('/api/v1/stocks/' + code + '/kline').then(res => {
      const { dates, open, high, low, close, volume } = res.data;
      if (!dates?.length) { setLoading(false); return; }
      candleSeries.setData(dates.map((d: string, i: number) => ({ time: d.replace(/-/g, '/'), open: open[i], high: high[i], low: low[i], close: close[i] })));
      volumeSeries.setData(dates.map((d: string, i: number) => ({ time: d.replace(/-/g, '/'), value: volume[i], color: close[i] >= open[i] ? '#26a69a' : '#ef5350' })));
    }).finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (!code || !chartRef.current) return;
    clearAllSeries();
    const candleSeries = chartRef.current.addCandlestickSeries();
    const volumeSeries = chartRef.current.addHistogramSeries({ color: '#26a69a', priceFormat: { type: 'volume' }, priceScaleId: '' });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    seriesRefs.current.push(candleSeries, volumeSeries);

    api.get('/api/v1/stocks/' + code + '/kline').then(res => {
      const { dates, open, high, low, close, volume } = res.data;
      if (!dates?.length) return;
      candleSeries.setData(dates.map((d: string, i: number) => ({ time: d.replace(/-/g, '/'), open: open[i], high: high[i], low: low[i], close: close[i] })));
      volumeSeries.setData(dates.map((d: string, i: number) => ({ time: d.replace(/-/g, '/'), value: volume[i], color: close[i] >= open[i] ? '#26a69a' : '#ef5350' })));
    });

    if (activeIndicators.length > 0) {
      api.get('/api/v1/stocks/' + code + '/indicators', { params: { types: activeIndicators.join(',') } }).then(res => {
        const { dates, indicators } = res.data;
        if (!indicators?.length) return;
        const colorMap: Record<string, string> = { MA5: '#2196f3', MA10: '#4caf50', MA20: '#ff9800', MA60: '#f44336', MACD_DIF: '#1565c0', MACD_DEA: '#c62828', KDJ_K: '#4caf50', KDJ_D: '#2196f3', KDJ_J: '#f44336', RSI: '#ff5722', BOLL_MA: '#9c27b0', BOLL_UPPER: '#e91e63', BOLL_LOWER: '#e91e63' };
        indicators.forEach((ind: any) => {
          if (ind.type === 'MA') {
            [5, 10, 20, 60].forEach(n => {
              const k = 'MA' + n;
              if (activeIndicators.includes(k) && ind[k]) {
                const s = chartRef.current.addLineSeries({ color: colorMap[k] || '#333', lineWidth: 1 });
                s.setData(ind[k].map((v: number, i: number) => ({ time: dates[i]?.replace(/-/g, '/'), value: v })));
                seriesRefs.current.push(s);
              }
            });
          } else if (ind.type === 'BOLL' && activeIndicators.includes('BOLL')) {
            ['MA', 'UPPER', 'LOWER'].forEach(k => {
              if (ind[k]) {
                const s = chartRef.current.addLineSeries({ color: colorMap['BOLL_' + k] || '#e91e63', lineWidth: 1, lineStyle: k !== 'MA' ? 2 : 0 });
                s.setData(ind[k].map((v: number, i: number) => ({ time: dates[i]?.replace(/-/g, '/'), value: v })));
                seriesRefs.current.push(s);
              }
            });
          } else if (ind.type === 'MACD' && activeIndicators.includes('MACD')) {
            ['DIF', 'DEA'].forEach(k => {
              if (ind[k]) {
                const s = chartRef.current.addLineSeries({ color: colorMap['MACD_' + k] || '#1565c0', lineWidth: 1, priceScaleId: 'macd' });
                s.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
                s.setData(ind[k].map((v: number, i: number) => ({ time: dates[i]?.replace(/-/g, '/'), value: v })));
                seriesRefs.current.push(s);
              }
            });
          } else if (ind.type === 'KDJ' && activeIndicators.includes('KDJ')) {
            ['K', 'D', 'J'].forEach(k => {
              if (ind[k]) {
                const s = chartRef.current.addLineSeries({ color: colorMap['KDJ_' + k] || '#333', lineWidth: 1, priceScaleId: 'kdj' });
                s.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
                s.setData(ind[k].map((v: number, i: number) => ({ time: dates[i]?.replace(/-/g, '/'), value: v })));
                seriesRefs.current.push(s);
              }
            });
          } else if (ind.type === 'RSI' && activeIndicators.includes('RSI')) {
            const s = chartRef.current.addLineSeries({ color: colorMap.RSI || '#ff5722', lineWidth: 1, priceScaleId: 'rsi' });
            s.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
            s.setData(ind.RSI.map((v: number, i: number) => ({ time: dates[i]?.replace(/-/g, '/'), value: v })));
            seriesRefs.current.push(s);
          }
        });
      });
    }
  }, [code, activeIndicators]);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search value={code} onChange={e => setCode(e.target.value)} placeholder="输入股票代码" style={{ width: 200 }} enterButton="查询" onSearch={v => setCode(v)} />
      </Space>
      {loading && <Spin style={{ display: 'block', margin: '40px auto' }} />}
      <Card size="small" title={'K 线图 - ' + code}>
        <Space style={{ marginBottom: 8 }} wrap>
          <span style={{ fontSize: 12, color: '#666' }}>技术指标：</span>
          {indicatorOptions.map(opt => (
            <Checkbox key={opt.value} checked={activeIndicators.includes(opt.value)}
              onChange={e => setActiveIndicators(prev => e.target.checked ? [...prev, opt.value] : prev.filter(v => v !== opt.value))}>
              {opt.label}
            </Checkbox>
          ))}
        </Space>
        <div ref={containerRef} />
      </Card>
    </div>
  );
};
export default MarketPage;