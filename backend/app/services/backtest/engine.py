import pandas as pd
import numpy as np

class BacktestEngine:
    def __init__(self, df, strategy, params=None):
        self.df = df.copy()
        self.strategy = strategy
        self.params = params or {}
        self.equity_curve = []
        self.trades = []
        self.capital = 100000

    def run(self):
        df = self.df.sort_values("date").reset_index(drop=True)
        position = 0
        cash = self.capital
        for i in range(len(df)):
            row = df.iloc[i]
            close = row.get("close", 0)
            signal = self._get_signal(df, i)
            if signal == "buy" and position == 0 and close > 0:
                position = int(cash / close)
                cash -= position * close
                self.trades.append({"date": str(row["date"]), "type": "buy", "price": float(close), "quantity": position})
            elif signal == "sell" and position > 0:
                cash += position * close
                self.trades.append({"date": str(row["date"]), "type": "sell", "price": float(close), "quantity": position})
                position = 0
            self.equity_curve.append({"date": str(row["date"]), "capital": round(cash + position * close, 2)})
        final_value = cash + position * df.iloc[-1].get("close", 0)
        total_return = (final_value / self.capital - 1) * 100
        annual_return = self._calc_annual_return(total_return, len(df))
        max_dd = self._calc_max_drawdown()
        sharpe = self._calc_sharpe(len(df))
        return {
            "total_return": round(total_return, 2), "annual_return": round(annual_return, 2),
            "max_drawdown": round(max_dd, 2), "sharpe_ratio": round(sharpe, 2),
            "trade_count": len(self.trades), "equity_curve": self.equity_curve, "trades": self.trades,
        }

    def _get_signal(self, df, i):
        if self.strategy == "ma_cross":
            n1 = int(self.params.get("n1", 5)); n2 = int(self.params.get("n2", 20))
            if i < max(n1, n2): return ""
            ma1 = df["close"].iloc[i-n1+1:i+1].mean(); ma2 = df["close"].iloc[i-n2+1:i+1].mean()
            ma1_prev = df["close"].iloc[i-n1:i].mean() if i >= n1 else ma1
            ma2_prev = df["close"].iloc[i-n2:i].mean() if i >= n2 else ma2
            if ma1_prev <= ma2_prev and ma1 > ma2: return "buy"
            if ma1_prev >= ma2_prev and ma1 < ma2: return "sell"
        elif self.strategy == "macd":
            if i < 34: return ""
            close = df["close"]
            ema12 = close.iloc[:i+1].ewm(span=12).mean().iloc[-1]; ema26 = close.iloc[:i+1].ewm(span=26).mean().iloc[-1]
            ema12_prev = close.iloc[:i].ewm(span=12).mean().iloc[-1] if i > 0 else ema12
            ema26_prev = close.iloc[:i].ewm(span=26).mean().iloc[-1] if i > 0 else ema26
            dif = ema12 - ema26; dif_prev = ema12_prev - ema26_prev
            if dif_prev < 0 and dif > 0: return "buy"
            if dif_prev > 0 and dif < 0: return "sell"
        return ""

    def _calc_annual_return(self, tr, days):
        return ((1 + tr / 100) ** (252 / max(days, 1)) - 1) * 100 if days > 252 else tr
    def _calc_max_drawdown(self):
        if not self.equity_curve: return 0
        values = [e["capital"] for e in self.equity_curve]; peak = values[0]; dd = 0
        for v in values:
            if v > peak: peak = v
            dd = max(dd, (peak - v) / peak)
        return dd * 100
    def _calc_sharpe(self, days):
        if not self.equity_curve or days < 2: return 0
        values = [e["capital"] for e in self.equity_curve]
        returns = [(values[i] / values[i-1] - 1) for i in range(1, len(values)) if values[i-1] > 0]
        if not returns: return 0
        return round(np.mean(returns) / np.std(returns) * np.sqrt(252), 2) if np.std(returns) > 0 else 0