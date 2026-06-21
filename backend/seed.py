"""Database seed script — populates categories and articles."""

import asyncio
import datetime
from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.category import Category
from app.models.article import Article


async def seed():
    async with async_session_factory() as db:
        # ── Categories ────────────────────────────────────────────
        existing = await db.execute(select(Category))
        if existing.scalars().all():
            print("Database already has data, skipping seed.")
            return

        cats = [
            Category(id=1, name="基础知识", slug="basics", description="股票市场基础知识", sort_order=1),
            Category(id=2, name="技术分析", slug="technical", description="K线、指标等技术分析方法", sort_order=2),
            Category(id=3, name="基本面分析", slug="fundamental", description="财报、估值等基本面分析方法", sort_order=3),
            Category(id=4, name="投资心理", slug="psychology", description="投资心理学与交易纪律", sort_order=4),
        ]
        db.add_all(cats)

        # ── Articles ──────────────────────────────────────────────
        now = datetime.datetime.utcnow()
        articles = [
            Article(
                category_id=1, title="股票是什么？",
                summary="了解股票的基本概念、种类和交易规则，是进入股市的第一步。",
                content="""# 股票是什么？

股票是股份有限公司发行的所有权凭证，持有股票即成为公司股东。

## 股票的基本特征

- **流动性**：可以在证券交易所自由买卖
- **风险性**：股价波动带来收益或损失
- **收益性**：分红和股价上涨是主要收益来源

## A股交易规则

| 规则 | 说明 |
|------|------|
| 交易时间 | 周一至周五 9:30-11:30, 13:00-15:00 |
| 最小单位 | 100股（1手） |
| 涨跌幅限制 | 主板 ±10%，创业板 ±20% |
| 交易制度 | T+1（当天买入次日才能卖出） |

## 常见股票类型

- **主板股票**：代码以 600/000 开头
- **创业板**：代码以 300 开头
- **科创板**：代码以 688 开头
""",
                tags="基础,入门", read_count=0, created_at=now
            ),
            Article(
                category_id=1, title="如何看懂K线图",
                summary="K线图是技术分析的基础，掌握K线含义是分析行情的第一步。",
                content="""# 如何看懂K线图

K线图（蜡烛图）是最常用的股票价格可视化方式。

## K线的组成

每根K线包含四个价格信息：

```
      最高价 ────┬────
                 │
     上影线      │
                 │
     收盘价 ────┼────  (阳线为红色/绿色，阴线为绿色/红色)
                 │
     开盘价 ────┼────
                 │
     下影线      │
                 │
      最低价 ────┴────
```

## 常见K线形态

- **光头光脚阳线**：开盘即最低，收盘即最高，买方强势
- **十字星**：开盘价与收盘价接近，市场犹豫
- **锤子线**：下影线较长，可能预示底部反转
""",
                tags="K线,技术分析,入门", read_count=0, created_at=now
            ),
            Article(
                category_id=2, title="移动平均线（MA）详解",
                summary="MA是最基础的趋势跟踪指标，本文详细讲解MA的计算方法和使用技巧。",
                content="""# 移动平均线（MA）详解

移动平均线（Moving Average）是最常用的技术指标之一。

## 计算方法

MA = 一定周期内收盘价的平均值

例如 MA5 = 最近5个交易日收盘价的平均值。

## 常用参数

| 周期 | 名称 | 用途 |
|------|------|------|
| MA5 | 5日均线 | 短线趋势 |
| MA10 | 10日均线 | 短线支撑/压力 |
| MA20 | 20日均线 | 中线趋势 |
| MA60 | 60日均线 | 长线趋势 |

## 金叉与死叉

- **金叉**：短期MA上穿长期MA → 买入信号
- **死叉**：短期MA下穿长期MA → 卖出信号

这是双均线交叉策略的核心逻辑。
""",
                tags="技术指标,MA,均线", read_count=0, created_at=now
            ),
            Article(
                category_id=2, title="MACD指标使用指南",
                summary="MACD是趋势跟踪型指标，适合判断趋势方向和强度。",
                content="""# MACD指标使用指南

MACD（指数平滑异同移动平均线）由三部分组成：DIF线、DEA线和柱状图。

## 组成

- **DIF线**：快线 - 12日EMA与26日EMA的差值
- **DEA线**：慢线 - DIF的9日EMA
- **柱状图**：(DIF - DEA) × 2

## 使用技巧

### 金叉与死叉
- DIF上穿DEA → 金叉，买入信号
- DIF下穿DEA → 死叉，卖出信号

### 背离
- **底背离**：股价新低但MACD不创新低 → 可能见底
- **顶背离**：股价新高但MACD不创新高 → 可能见顶

> 注意：MACD是滞后指标，在震荡市中容易产生假信号。
""",
                tags="技术指标,MACD,趋势", read_count=0, created_at=now
            ),
            Article(
                category_id=2, title="布林带（BOLL）的原理与应用",
                summary="布林带通过价格的标准差来评估股价的相对高低位置。",
                content="""# 布林带（BOLL）的原理与应用

布林带由John Bollinger发明，包含三条线：

- **中轨**：N日移动平均线（通常N=20）
- **上轨**：中轨 + K × 标准差
- **下轨**：中轨 - K × 标准差

## 应用方法

1. **价格触及上轨**：可能超买，注意回调风险
2. **价格触及下轨**：可能超卖，关注反弹机会
3. **带宽收窄**：可能即将出现大幅波动
4. **带宽扩大**：趋势正在加强

## 参数设置

默认参数为(20, 2)，即20日均线±2倍标准差。
""",
                tags="技术指标,BOLL,布林带", read_count=0, created_at=now
            ),
            Article(
                category_id=3, title="市盈率（PE）怎么看",
                summary="市盈率是估值最常用的指标，了解它的含义和局限性很重要。",
                content="""# 市盈率（PE）怎么看

市盈率 = 股价 ÷ 每股收益（EPS）

## PE的类型

| 类型 | 说明 |
|------|------|
| 静态PE | 使用上一年度财报的EPS |
| 滚动PE (TTM) | 使用最近四个季度的EPS |
| 动态PE | 使用分析师预测的未来EPS |

## PE的局限性

- 亏损公司的PE为负值，无法参考
- 不同行业的PE差异很大（科技股通常高于银行股）
- PE不能反映公司的成长性

> PE结合行业平均水平和公司历史PE来看更有意义。
""",
                tags="基本面,估值,PE", read_count=0, created_at=now
            ),
            Article(
                category_id=4, title="交易心理与情绪管理",
                summary="成功的交易不仅需要技术，更需要良好的心理素质。",
                content="""# 交易心理与情绪管理

## 常见心理陷阱

### 1. 恐惧与贪婪
- **贪婪**：追高买入，不舍得止盈
- **恐惧**：割肉在地板上，错过反弹

### 2. 确认偏误
只关注支持自己持仓的信息，忽视反面信号。

### 3. 沉没成本谬误
因为已经亏损就继续持有，而不是基于未来预期做决策。

## 建议

- 建立交易计划并严格执行
- 设置止损和止盈位
- 控制单笔交易的风险（不超过总资金的2%）
- 记录交易日志，复盘盈亏原因
""",
                tags="心理,风控,交易纪律", read_count=0, created_at=now
            ),
            Article(
                category_id=1, title="A股交易费用详解",
                summary="了解印花税、佣金等交易成本，是理性投资的第一步。",
                content="""# A股交易费用详解

## 费用构成

| 费用类型 | 费率 | 收取方 |
|----------|------|--------|
| 印花税 | 成交额的0.05% | 国家税务（仅卖出时收） |
| 佣金 | 成交额的0.01%-0.03% | 证券公司（买卖双收） |
| 过户费 | 成交额的0.001% | 中国结算 |

## 举例

买入10000元股票，佣金0.025%：
- 买入费用：10000 × 0.025% = 2.5元
- 卖出费用：10000 × (0.025% + 0.05%) = 7.5元
- 总费用：约10元

> 小额交易时手续费占比很高，长期来看不容忽视。
""",
                tags="费用,交易规则,入门", read_count=0, created_at=now
            ),
        ]
        db.add_all(articles)
        await db.commit()
        print(f"Seeded {len(cats)} categories and {len(articles)} articles.")


if __name__ == "__main__":
    asyncio.run(seed())
