import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
} from 'lightweight-charts';

// lightweight-charts v5 IPaneApi<HorzScaleItem> — use any to avoid generic noise
type PaneApi = ReturnType<IChartApi['addPane']>;

export interface KlineData {
  dates: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export type Period = 'daily' | '5m' | '15m' | '30m' | '60m';

export const PERIOD_LABELS: Record<Period, string> = {
  daily: '日线',
  '5m': '5分钟',
  '15m': '15分钟',
  '30m': '30分钟',
  '60m': '60分钟',
};

export const PERIOD_OPTIONS: Period[] = ['5m', '15m', '30m', '60m', 'daily'];

export const COLORS: Record<string, string> = {
  MA5: '#2196f3',
  MA10: '#4caf50',
  MA20: '#ff9800',
  MA60: '#f44336',
  BOLL_MA: '#9c27b0',
  BOLL_UPPER: '#e91e63',
  BOLL_LOWER: '#e91e63',
  MACD_DIF: '#1565c0',
  MACD_DEA: '#c62828',
  MACD_HIST_UP: '#ef5350',
  MACD_HIST_DOWN: '#26a69a',
  KDJ_K: '#4caf50',
  KDJ_D: '#2196f3',
  KDJ_J: '#f44336',
  RSI: '#ff5722',
  REF_OVERBOUGHT: '#ef5350',
  REF_OVERSOLD: '#26a69a',
};

/** Convert date string to lightweight-charts time value.
 *  - "2025-06-10" (daily) → keep as business day string
 *  - "2025-06-10 15:00:00" (intraday) → UNIX timestamp (seconds)
 */
function toChartTime(dateStr: string): string | number {
  if (dateStr.includes(' ')) {
    return Math.floor(new Date(dateStr.replace(' ', 'T')).getTime() / 1000);
  }
  return dateStr;
}

export class ChartManager {
  chart: IChartApi;
  private mainOverlaySeries: ISeriesApi<'Line'>[] = [];
  private subPaneMap: Map<string, PaneApi> = new Map();
  private subPaneSeries: ISeriesApi<any>[] = [];

  candleSeries: ISeriesApi<'Candlestick'> | null = null;
  volumeSeries: ISeriesApi<'Histogram'> | null = null;

  private _lastDates: string[] = [];

  constructor(container: HTMLElement) {
    const chart = createChart(container, {
      width: container.clientWidth,
      height: Math.max(400, Math.min(window.innerHeight * 0.6, 700)),
      layout: { background: { color: '#ffffff' }, textColor: '#222222' },
      grid: { vertLines: { color: '#f0f0f0' }, horzLines: { color: '#f0f0f0' } },
      timeScale: { timeVisible: false },
      crosshair: { mode: 0 },
    });
    this.chart = chart;
  }

  /** Update time scale based on K-line period.
   *  - Daily → date-only axis (YYYY-MM-DD)
   *  - Minute-level → show time (HH:MM) on axis
   */
  setPeriod(period: Period): void {
    const isIntraday = period !== 'daily';
    this.chart.applyOptions({
      timeScale: { timeVisible: isIntraday },
    });
  }

  // ── Main chart ────────────────────────────────────────────────

  addCandlestickSeries(): ISeriesApi<'Candlestick'> {
    this.candleSeries = this.chart.addSeries(CandlestickSeries);
    return this.candleSeries;
  }

  addVolumeSeries(): ISeriesApi<'Histogram'> {
    this.volumeSeries = this.chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    this.volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    return this.volumeSeries;
  }

  setMainData(data: KlineData): void {
    if (!this.candleSeries || !this.volumeSeries) return;
    const { dates, open, high, low, close, volume } = data;
    if (!dates?.length) return;
    this._lastDates = dates;

    this.candleSeries.setData(
      dates.map((d, i) => ({
        time: toChartTime(d),
        open: open[i],
        high: high[i],
        low: low[i],
        close: close[i],
      }))
    );
    this.volumeSeries.setData(
      dates.map((d, i) => ({
        time: toChartTime(d),
        value: volume[i],
        color: close[i] >= open[i] ? '#26a69a' : '#ef5350',
      }))
    );
  }

  addMainIndicatorLine(
    dataPoints: Array<{ time: string; value: number }>,
    color: string,
    lineStyle: LineStyle = LineStyle.Solid,
    lineWidth: number = 1,
  ): ISeriesApi<'Line'> {
    const series = this.chart.addSeries(LineSeries, {
      color,
      lineWidth: lineWidth as any,
      lineStyle,
    });
    series.setData(dataPoints.map(p => ({ time: toChartTime(p.time), value: p.value })));
    this.mainOverlaySeries.push(series);
    return series;
  }

  clearMainIndicators(): void {
    for (const s of this.mainOverlaySeries) {
      try { this.chart.removeSeries(s); } catch { /* ignore */ }
    }
    this.mainOverlaySeries = [];
  }

  // ── Sub-panes ─────────────────────────────────────────────────

  ensureSubPane(type: 'MACD' | 'KDJ' | 'RSI'): PaneApi {
    if (this.subPaneMap.has(type)) {
      return this.subPaneMap.get(type)!;
    }
    const pane = this.chart.addPane();
    pane.setHeight(120);
    this.subPaneMap.set(type, pane);
    return pane;
  }

  addSubPaneLine(
    pane: PaneApi,
    data: Array<{ time: string; value: number }>,
    color: string,
    lineStyle: LineStyle = LineStyle.Solid,
  ): ISeriesApi<'Line'> {
    const series = pane.addSeries(LineSeries, {
      color,
      lineWidth: 1 as any,
      lineStyle,
    });
    series.setData(data.map(p => ({ time: toChartTime(p.time), value: p.value })));
    this.subPaneSeries.push(series);
    return series;
  }

  addSubPaneHistogram(
    pane: PaneApi,
    data: Array<{ time: string; value: number; color?: string }>,
  ): ISeriesApi<'Histogram'> {
    const series = pane.addSeries(HistogramSeries);
    series.setData(data.map(p => ({ time: toChartTime(p.time), value: p.value, color: p.color })));
    this.subPaneSeries.push(series);
    return series;
  }

  addSubPaneRefLine(
    pane: PaneApi,
    value: number,
    color: string,
  ): ISeriesApi<'Line'> {
    const dates = this._lastDates.length > 0
      ? this._lastDates
      : ['2000-01-01', '2099-12-31'];
    const points = [
      { time: dates[0], value },
      { time: dates[dates.length - 1], value },
    ];
    return this.addSubPaneLine(pane, points, color, LineStyle.Dashed);
  }

  clearSubPanes(): void {
    for (const s of this.subPaneSeries) {
      try { this.chart.removeSeries(s); } catch { /* ignore */ }
    }
    this.subPaneSeries = [];
    this.subPaneMap.clear();
  }

  // ── Cleanup ───────────────────────────────────────────────────

  destroy(): void {
    this.chart.remove();
  }
}
