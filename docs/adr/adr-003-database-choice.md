# ADR-003: 使用 SQLite 起步，后续可迁移

**状态**: 已接受  
**上下文**: MVP 阶段需要持久化用户数据、文章、回测结果等。长远可能需要更高的并发写入能力。  
**决策**: MVP 阶段直接使用 SQLite，通过 SQLAlchemy ORM 保持与 PostgreSQL 的兼容性。  
**理由**: 
- 零运维，无需单独配置数据库服务
- SQLAlchemy ORM 统一接口，迁移 Postgres 只需改连接字符串
- 单用户/小型部署场景 SQLite 性能完全足够
**后果**: 高并发写入场景需要迁移到 PostgreSQL；SQLite 使用文件锁，不适合多进程写入。
