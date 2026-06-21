import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Checkbox, Spin, AutoComplete, Button } from 'antd';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import api from '../../api/client';

const indicatorOptions = [
  { label: 'MA5', value: 'MA5' }, { label: 'MA10', value: 'MA10' }, { label: 'MA20', value: 'MA20' }, { label: 'MA60', value: 'MA60' },
  { label: 'MACD', value: 'MACD' }, { label: 'KDJ', value: 'KDJ' }, { label: 'RSI', value: 'RSI' }, { label: '布林带', value: 'BOLL' },
];

const MarketPage: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [code, setCode] = useState('000001');
  const [loading, setLoading] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['MA5', 'MA10', 'MA20']);
  const seriesRefs = useRef<any[]>([]);

  const clearAllSeries = () => { seriesRefs.current.forEach(s => { try { chartRef.current?.removeSeries(s); } catch { /* ignore */ } }); seriesRefs.current = []; };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: Math.max(400, Math.min(window.innerHeight * 0.6, 700)),
      layout: { background: { color: '#ffffff' }, textColor: '#222222' },
      grid: { vertLines: { color: '#f0f0f0' }, horzLines: { color: '#f0f0f0' } },
      timeScale: { timeVisible: false },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
        }
      }
    });
    resizeObserver.observe(container);

    return () => { resizeObserver.disconnect(); chart.remove(); };
  }, []);

  const renderChart = () => {
    if (!code || !chartRef.current) return;
    setLoading(true);
    clearAllSeries();

    const candleSeries = chartRef.current.addSeries(CandlestickSeries);
    const volumeSeries = chartRef.current.addSeries(HistogramSeries, {
      color: '#26a69a', priceFormat: { type: 'volume' }, priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    seriesRefs.current.push(candleSeries, volumeSeries);

    api.get('/api/v1/stocks/' + code + '/kline').then(res => {
      const { dates, open, high, low, close, volume } = res.data;
      if (!dates?.length) { setLoading(false); return; }
      candleSeries.setData(dates.map((d: string, i: number) => ({
        time: d.replace(/-/g, '/'), open: open[i], high: high[i], low: low[i], close: close[i],
      })));
      volumeSeries.setData(dates.map((d: string, i: number) => ({
        time: d.replace(/-/g, '/'), value: volume[i],
        color: close[i] >= open[i] ? '#26a69a' : '#ef5350',
      })));
    }).finally(() => setLoading(false));

    if (activeIndicators.length > 0) {
      api.get('/api/v1/stocks/' + code + '/indicators', { params: { types: activeIndicators.join(',') } }).then(res => {
        const { dates, indicators } = res.data;
        if (!indicators?.length) return;
        const colorMap: Record<string, string> = {
          MA5: '#2196f3', MA10: '#4caf50', MA20: '#ff9800', MA60: '#f44336',
          MACD_DIF: '#1565c0', MACD_DEA: '#c62828',
          KDJ_K: '#4caf50', KDJ_D: '#2196f3', KDJ_J: '#f44336',
          RSI: '#ff5722',
          BOLL_MA: '#9c27b0', BOLL_UPPER: '#e91e63', BOLL_LOWER: '#e91e63',
        };
        indicators.forEach((ind: any) => {
          if (ind.type === 'MA') {
            [5, 10, 20, 60].forEach(n => {
              const k = 'MA' + n;
              if (activeIndicators.includes(k) && ind[k]) {
                const s = chartRef.current.addSeries(LineSeries, { color: colorMap[k] || '#333', lineWidth: 1 });
                s.setData(ind[k].map((v: number, i: number) => ({ time: dates[i]?.replace(/-/g, '/'), value: v })));
                seriesRefs.current.push(s);
              }
            });
          } else if (ind.type === 'BOLL' && activeIndicators.includes('BOLL')) {
            ['MA', 'UPPER', 'LOWER'].forEach(k => {
              if (ind[k]) {
                const s = chartRef.current.addSeries(LineSeries, {
                  color: colorMap['BOLL_' + k] || '#e91e63', lineWidth: 1,
                  lineStyle: k !== 'MA' ? 2 : 0,
                });
                s.setData(ind[k].map((v: number, i: number) => ({ time: dates[i]?.replace(/-/g, '/'), value: v })));
                seriesRefs.current.push(s);
              }
            });
          } else if (ind.type === 'MACD' && activeIndicators.includes('MACD')) {
            ['DIF', 'DEA'].forEach(k => {
              if (ind[k]) {
                const s = chartRef.current.addSeries(LineSeries, {
                  color: colorMap['MACD_' + k] || '#1565c0', lineWidth: 1, priceScaleId: 'macd',
                });
                s.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
                s.setData(ind[k].map((v: number, i: number) => ({ time: dates[i]?.replace(/-/g, '/'), value: v })));
                seriesRefs.current.push(s);
              }
            });
          } else if (ind.type === 'KDJ' && activeIndicators.includes('KDJ')) {
            ['K', 'D', 'J'].forEach(k => {
              if (ind[k]) {
                const s = chartRef.current.addSeries(LineSeries, {
                  color: colorMap['KDJ_' + k] || '#333', lineWidth: 1, priceScaleId: 'kdj',
                });
                s.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
                s.setData(ind[k].map((v: number, i: number) => ({ time: dates[i]?.replace(/-/g, '/'), value: v })));
                seriesRefs.current.push(s);
              }
            });
          } else if (ind.type === 'RSI' && activeIndicators.includes('RSI')) {
            const s = chartRef.current.addSeries(LineSeries, {
              color: colorMap.RSI || '#ff5722', lineWidth: 1, priceScaleId: 'rsi',
            });
            s.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
            s.setData(ind.RSI.map((v: number, i: number) => ({ time: dates[i]?.replace(/-/g, '/'), value: v })));
            seriesRefs.current.push(s);
          }
        });
      });
    }
  };

  useEffect(() => { renderChart(); }, [code, activeIndicators]);

  const [searchResults, setSearchResults] = useState<{code: string; name: string}[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = (text: string) => {
    setCode(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!text || text.length < 1) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/api/v1/stocks/search', { params: { q: text } });
        setSearchResults(res.data.items || []);
      } catch { setSearchResults([]); }
    }, 300);
  };

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--mm-space-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p className="mm-heading-sm" style={{ margin: 0 }}>行情与技术指标</p>
        <Button type="primary" onClick={() => navigate('/trading?code=' + code)}>
          模拟交易
        </Button>
      </div>

      {/* ── Search + Indicators ──────────────────────────────── */}
      <div className="mm-card" style={{ marginBottom: 'var(--mm-space-lg)', padding: 'var(--mm-space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mm-space-md)', marginBottom: 'var(--mm-space-md)' }}>
          <AutoComplete
            value={code}
            options={searchResults.map(s => ({ value: s.code + ' - ' + s.name }))}
            onSearch={handleSearch}
            onSelect={v => { setCode(v.split(' - ')[0]); setSearchResults([]); }}
            style={{ width: 280 }}
            placeholder="输入股票代码或名称"
            notFoundContent="未找到匹配股票"
          >
            <Input.Search enterButton="查询" onSearch={v => setCode(v)} />
          </AutoComplete>
        </div>

        <div style={{ display: 'flex', gap: 'var(--mm-space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mm-font-family)', fontSize: 'var(--mm-body-sm-size)', color: 'var(--mm-steel)', fontWeight: 500 }}>技术指标</span>
          {indicatorOptions.map(opt => (
            <label
              key={opt.value}
              className={'mm-pill-tab' + (activeIndicators.includes(opt.value) ? ' mm-pill-tab--active' : '')}
            >
              <Checkbox
                checked={activeIndicators.includes(opt.value)}
                onChange={e => setActiveIndicators(prev =>
                  e.target.checked ? [...prev, opt.value] : prev.filter(v => v !== opt.value)
                )}
                style={{ display: 'none' }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Chart ──────────────────────────────────────────────── */}
      <div className="mm-card" style={{ padding: 'var(--mm-space-md)', position: 'relative', minHeight: 450 }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.6)',
          }}>
            <Spin />
          </div>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
};
export default MarketPage;
