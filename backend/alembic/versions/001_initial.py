"""initial: create all tables

Revision ID: 001
Revises:
Create Date: 2026-06-20 12:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "articles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("summary", sa.String(500), server_default=""),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("cover_image", sa.String(500), server_default=""),
        sa.Column("tags", sa.String(200), server_default=""),
        sa.Column("read_count", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_articles_id", "articles", ["id"])
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("slug", sa.String(50), nullable=False),
        sa.Column("description", sa.String(200), server_default=""),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
        sa.ForeignKeyConstraint(["parent_id"], ["categories.id"]),
    )
    op.create_index("ix_categories_id", "categories", ["id"])
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("hashed_password", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_table(
        "stock_daily",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stock_code", sa.String(10), nullable=False),
        sa.Column("stock_name", sa.String(50), server_default=""),
        sa.Column("trade_date", sa.Date(), nullable=False),
        sa.Column("open", sa.Float(), nullable=False),
        sa.Column("high", sa.Float(), nullable=False),
        sa.Column("low", sa.Float(), nullable=False),
        sa.Column("close", sa.Float(), nullable=False),
        sa.Column("volume", sa.Integer(), server_default="0"),
        sa.Column("amount", sa.Float(), server_default="0.0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_daily_id", "stock_daily", ["id"])
    op.create_index("ix_stock_daily_stock_code", "stock_daily", ["stock_code"])
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("cash", sa.Float(), server_default="100000.0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_accounts_id", "accounts", ["id"])
    op.create_table(
        "positions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stock_code", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("cost_price", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_positions_id", "positions", ["id"])
    op.create_table(
        "trade_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stock_code", sa.String(10), nullable=False),
        sa.Column("direction", sa.String(4), nullable=False),
        sa.Column("order_type", sa.String(10), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("filled_price", sa.Float(), server_default="0.0"),
        sa.Column("status", sa.String(10), server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("filled_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_trade_orders_id", "trade_orders", ["id"])
    op.create_table(
        "watchlists",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stock_code", sa.String(10), nullable=False),
        sa.Column("added_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_watchlists_id", "watchlists", ["id"])
    op.create_table(
        "backtest_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("strategy_name", sa.String(100), nullable=False),
        sa.Column("stock_code", sa.String(10), nullable=False),
        sa.Column("start_date", sa.String(10), nullable=False),
        sa.Column("end_date", sa.String(10), nullable=False),
        sa.Column("params", sa.Text(), server_default="{}"),
        sa.Column("total_return", sa.Float(), server_default="0.0"),
        sa.Column("annual_return", sa.Float(), server_default="0.0"),
        sa.Column("max_drawdown", sa.Float(), server_default="0.0"),
        sa.Column("sharpe_ratio", sa.Float(), server_default="0.0"),
        sa.Column("trade_count", sa.Integer(), server_default="0"),
        sa.Column("equity_curve", sa.Text(), server_default="[]"),
        sa.Column("trades", sa.Text(), server_default="[]"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_backtest_results_id", "backtest_results", ["id"])
    op.create_table(
        "backtest_strategies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("strategy_type", sa.String(50), nullable=False),
        sa.Column("params", sa.Text(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_backtest_strategies_id", "backtest_strategies", ["id"])
    op.create_table(
        "learning_progress",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default="0"),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["article_id"], ["articles.id"]),
    )
    op.create_index("ix_learning_progress_id", "learning_progress", ["id"])


def downgrade() -> None:
    op.drop_table("learning_progress")
    op.drop_table("backtest_strategies")
    op.drop_table("backtest_results")
    op.drop_table("watchlists")
    op.drop_table("trade_orders")
    op.drop_table("positions")
    op.drop_table("accounts")
    op.drop_table("stock_daily")
    op.drop_table("users")
    op.drop_table("categories")
    op.drop_table("articles")
