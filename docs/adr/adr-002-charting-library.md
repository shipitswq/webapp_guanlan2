# ADR-002: 使用 lightweight-charts 作为图表库

**状态**: 已接受  
**上下文**: 需要渲染 K 线图和技术指标叠加显示。备选方案：ECharts（通用图表库）、lightweight-charts（TradingView 出品）、D3.js（底层渲染）。  
**决策**: 采用 lightweight-charts (TradingView)。  
**理由**: 
- 专为金融图表设计，K 线渲染性能极优
- 内置十字光标、缩放拖动交互
- 支持叠加指标线
- 包体积小（~40KB gzip）
**后果**: 需要自行实现技术指标的标记/注释（lightweight-charts 不内置指标线）。
