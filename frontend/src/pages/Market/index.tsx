import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input, Spin, AutoComplete, Button } from 'antd';
import { ChartManager, COLORS, PERIOD_OPTIONS, PERIOD_LABELS } from './ChartManager';
import type { KlineData, Period } from './ChartManager';
import api from '../../api/client';

const indicatorOptions = [
  { label: 'MA5', value: 'MA5' }, { label: 'MA10', value: 'MA10' }, { label: 'MA20', value: 'MA20' }, { label: 'MA60', value: 'MA60' },
  { label: 'MACD', value: 'MACD' }, { label: 'KDJ', value: 'KDJ' }, { label: 'RSI', value: 'RSI' }, { label: '布林带', value: 'BOLL' },
];

const MarketPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<ChartManager | null>(null);

  // Read code & period from URL, fallback to defaults
  const [code, setCode] = useState(() => searchParams.get('code') || '000001');
  const [period, setPeriod] = useState<Period>(() => {
    const p = searchParams.get('period');
    return (PERIOD_OPTIONS.includes(p as Period) ? p : 'daily') as Period;
  });
  const [loading, setLoading] = useState(false);
  const [loadingIndicators, setLoadingIndicators] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['MA5', 'MA10', 'MA20']);
  const klineDataRef = useRef<KlineData | null>(null);

  // ── Init ChartManager ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const manager = new ChartManager(containerRef.current);
    managerRef.current = manager;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          manager.chart.applyOptions({ width, height });
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => { resizeObserver.disconnect(); manager.destroy(); };
  }, []);

  // ── Fetch K-line (on code or period change) ────────────────────
  const fetchAndRenderKline = useCallback(async (stockCode: string, klinePeriod: Period) => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/stocks/' + stockCode + '/kline', {
        params: { period: klinePeriod },
      });
      const data: KlineData = res.data;
      if (!data?.dates?.length) return;

      klineDataRef.current = data;
      const m = managerRef.current;
      if (!m) return;

      // Rebuild main chart
      if (m.candleSeries) { try { m.chart.removeSeries(m.candleSeries); } catch { /* */ } }
      if (m.volumeSeries) { try { m.chart.removeSeries(m.volumeSeries); } catch { /* */ } }
      m.clearMainIndicators();
      m.clearSubPanes();

      m.setPeriod(klinePeriod);
      m.addCandlestickSeries();
      m.addVolumeSeries();
      m.setMainData(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Render main chart overlays (MA/BOLL) ──────────────────────
  const renderMainOverlays = useCallback((indicatorList: any[], dates: string[]) => {
    const m = managerRef.current;
    if (!m) return;
    m.clearMainIndicators();

    for (const ind of indicatorList) {
      if (ind.type === 'MA') {
        [5, 10, 20, 60].forEach(n => {
          const k = 'MA' + n;
          if (activeIndicators.includes(k) && ind[k]) {
            m.addMainIndicatorLine(
              ind[k].map((v: number, i: number) => ({ time: dates[i], value: v })),
              COLORS[k] || '#333',
            );
          }
        });
      }
      if (ind.type === 'BOLL' && activeIndicators.includes('BOLL')) {
        (['MA', 'UPPER', 'LOWER'] as const).forEach(key => {
          if (ind[key]) {
            const isMA = key === 'MA';
            m.addMainIndicatorLine(
              ind[key].map((v: number, i: number) => ({ time: dates[i], value: v })),
              COLORS['BOLL_' + key] || '#e91e63',
              isMA ? undefined : 2, // Dashed for upper/lower
            );
          }
        });
      }
    }
  }, [activeIndicators]);

  // ── Render sub-panes (MACD/KDJ/RSI) ───────────────────────────
  const renderSubPanels = useCallback((indicatorList: any[], dates: string[]) => {
    const m = managerRef.current;
    if (!m) return;
    m.clearSubPanes();

    for (const ind of indicatorList) {
      if (ind.type === 'MACD' && activeIndicators.includes('MACD')) {
        const pane = m.ensureSubPane('MACD');
        // DIF line
        if (ind.DIF) {
          m.addSubPaneLine(pane,
            ind.DIF.map((v: number, i: number) => ({ time: dates[i], value: v })),
            COLORS.MACD_DIF);
        }
        // DEA line
        if (ind.DEA) {
          m.addSubPaneLine(pane,
            ind.DEA.map((v: number, i: number) => ({ time: dates[i], value: v })),
            COLORS.MACD_DEA);
        }
        // Histogram (HIST field from Task-022)
        const histData = ind.HIST || ind.MACD;
        if (histData) {
          m.addSubPaneHistogram(pane,
            histData.map((v: number, i: number) => ({
              time: dates[i],
              value: v,
              color: v >= 0 ? COLORS.MACD_HIST_UP : COLORS.MACD_HIST_DOWN,
            })));
        }
      }

      if (ind.type === 'KDJ' && activeIndicators.includes('KDJ')) {
        const pane = m.ensureSubPane('KDJ');
        if (ind.K) m.addSubPaneLine(pane,
          ind.K.map((v: number, i: number) => ({ time: dates[i], value: v })), COLORS.KDJ_K);
        if (ind.D) m.addSubPaneLine(pane,
          ind.D.map((v: number, i: number) => ({ time: dates[i], value: v })), COLORS.KDJ_D);
        if (ind.J) m.addSubPaneLine(pane,
          ind.J.map((v: number, i: number) => ({ time: dates[i], value: v })), COLORS.KDJ_J);
        // Reference lines
        m.addSubPaneRefLine(pane, 80, COLORS.REF_OVERBOUGHT);
        m.addSubPaneRefLine(pane, 20, COLORS.REF_OVERSOLD);
      }

      if (ind.type === 'RSI' && activeIndicators.includes('RSI')) {
        const pane = m.ensureSubPane('RSI');
        if (ind.RSI) {
          m.addSubPaneLine(pane,
            ind.RSI.map((v: number, i: number) => ({ time: dates[i], value: v })), COLORS.RSI);
        }
        // Reference lines
        m.addSubPaneRefLine(pane, 70, COLORS.REF_OVERBOUGHT);
        m.addSubPaneRefLine(pane, 30, COLORS.REF_OVERSOLD);
      }
    }

    // Adjust chart height to accommodate sub-panes
    const subPaneCount = ['MACD', 'KDJ', 'RSI'].filter(t => activeIndicators.includes(t)).length;
    const baseHeight = Math.max(400, Math.min(window.innerHeight * 0.6, 700));
    const totalHeight = baseHeight + subPaneCount * 120;
    m.chart.applyOptions({ height: totalHeight > 1000 ? 1000 : totalHeight });
  }, [activeIndicators]);

  // ── Fetch indicators (on code, period, or activeIndicators change)
  const fetchAndRenderIndicators = useCallback(async (stockCode: string, activeTypes: string[], klinePeriod: Period) => {
    if (!activeTypes.length) {
      const m = managerRef.current;
      if (m) { m.clearMainIndicators(); m.clearSubPanes(); }
      return;
    }
    setLoadingIndicators(true);
    try {
      const res = await api.get('/api/v1/stocks/' + stockCode + '/indicators', {
        params: { types: activeTypes.join(','), period: klinePeriod },
      });
      const { dates, indicators } = res.data;
      if (!indicators?.length) return;

      renderMainOverlays(indicators, dates);
      renderSubPanels(indicators, dates);
    } finally {
      setLoadingIndicators(false);
    }
  }, [renderMainOverlays, renderSubPanels]);

  // ── Effect: code/period change → K-line + indicators ────────────
  useEffect(() => {
    if (!managerRef.current) return;
    setSearchParams({ code, period }, { replace: true });
    fetchAndRenderKline(code, period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, period]);

  // ── Effect: code/period/indicators change → indicators ───────────
  useEffect(() => {
    if (!managerRef.current || !klineDataRef.current) return;
    fetchAndRenderIndicators(code, activeIndicators, period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, period, activeIndicators]);

  // ── Search ────────────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState<{code: string; name: string}[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchText, setSearchText] = useState(code);
  const [stockName, setStockName] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync search text + fetch name when code changes
  useEffect(() => {
    setSearchText(code);
    if (!code) { setStockName(''); return; }
    // Try local search results first (instant)
    const match = searchResults.find(s => s.code === code);
    if (match) {
      setStockName(match.name);
      setSearchText(code + ' - ' + match.name);
      return;
    }
    // Otherwise fetch from backend
    let cancelled = false;
    api.get('/api/v1/stocks/search', { params: { q: code } })
      .then(res => {
        if (cancelled) return;
        const items = res.data.items || [];
        const found = items.find((s: {code: string; name: string}) => s.code === code);
        const name = found ? found.name : '';
        setStockName(name);
        if (name) setSearchText(code + ' - ' + name);
      })
      .catch(() => { if (!cancelled) setStockName(''); });
    return () => { cancelled = true; };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!text || text.length < 1) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/api/v1/stocks/search', { params: { q: text } });
        const items = res.data.items || [];
        setSearchResults(items);
        // If current code matches a result, capture the name
        const match = items.find((s: {code: string; name: string}) => s.code === code);
        if (match) setStockName(match.name);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 300);
  };

  const handleSelect = (value: string) => {
    const selectedCode = value.split(' - ')[0];
    const selectedName = value.includes(' - ') ? value.split(' - ')[1] : '';
    setSearchText(value);
    setStockName(selectedName);
    setCode(selectedCode);
    setSearchResults([]);
  };

  const handleSearchSubmit = (value: string) => {
    // Extract code from "code - name" or use raw input
    const extractedCode = value.includes(' - ') ? value.split(' - ')[0].trim() : value.trim();
    if (extractedCode) {
      // Look up name from search results if available
      const match = searchResults.find(s => s.code === extractedCode);
      if (match) {
        setStockName(match.name);
        setSearchText(extractedCode + ' - ' + match.name);
      } else {
        setSearchText(extractedCode);
      }
      setCode(extractedCode);
    }
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
            value={searchText}
            options={searchResults.map(s => ({ value: s.code + ' - ' + s.name }))}
            onSearch={handleSearch}
            onSelect={handleSelect}
            onChange={setSearchText}
            style={{ width: 280 }}
            placeholder="输入股票代码或名称"
            notFoundContent={searching ? '搜索中...' : '未找到匹配股票'}
          >
            <Input.Search enterButton="查询" onSearch={handleSearchSubmit} />
          </AutoComplete>
        </div>

        {/* ── Period selector ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 'var(--mm-space-md)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--mm-space-md)' }}>
          <span style={{ fontFamily: 'var(--mm-font-family)', fontSize: 'var(--mm-body-sm-size)', color: 'var(--mm-steel)', fontWeight: 500 }}>K线周期</span>
          {PERIOD_OPTIONS.map(p => (
            <label
              key={p}
              className={'mm-pill-tab' + (period === p ? ' mm-pill-tab--active' : '')}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--mm-space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mm-font-family)', fontSize: 'var(--mm-body-sm-size)', color: 'var(--mm-steel)', fontWeight: 500 }}>技术指标</span>
          {indicatorOptions.map(opt => (
            <label
              key={opt.value}
              className={'mm-pill-tab' + (activeIndicators.includes(opt.value) ? ' mm-pill-tab--active' : '')}
              onClick={() => setActiveIndicators(prev =>
                prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value]
              )}
            >
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Chart ──────────────────────────────────────────────── */}
      <div className="mm-card" style={{ padding: 'var(--mm-space-md)', position: 'relative', minHeight: 450 }}>
        {/* Current stock indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mm-space-sm)', marginBottom: 'var(--mm-space-sm)', padding: '0 4px' }}>
          <span style={{
            fontFamily: 'var(--mm-font-family)', fontSize: 'var(--mm-body-md-size)', fontWeight: 600,
            color: 'var(--mm-ink)',
          }}>
            {code}
          </span>
          {stockName && (
            <span style={{
              fontFamily: 'var(--mm-font-family)', fontSize: 'var(--mm-body-sm-size)',
              color: 'var(--mm-steel)',
            }}>
              {stockName}
            </span>
          )}
          <span style={{
            fontFamily: 'var(--mm-font-family)', fontSize: 'var(--mm-body-xs-size)', color: 'var(--mm-steel)',
            padding: '1px 8px', borderRadius: 4, background: 'var(--mm-mist)', marginLeft: 'auto',
          }}>
            {PERIOD_LABELS[period]}
          </span>
        </div>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.6)',
          }}>
            <Spin />
          </div>
        )}
        {loadingIndicators && !loading && (
          <div style={{
            position: 'absolute', top: 8, right: 8, zIndex: 10,
            background: 'rgba(255,255,255,0.8)', borderRadius: 4, padding: '2px 8px',
          }}>
            <Spin size="small" />
          </div>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
};
export default MarketPage;
