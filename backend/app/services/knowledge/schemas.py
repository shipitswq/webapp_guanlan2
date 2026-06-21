from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ArticleOut(BaseModel):
    id: int
    title: str
    summary: str = ""
    category_id: int
    tags: str = ""
    read_count: int = 0
    created_at: Optional[str] = None

class ArticleDetailOut(ArticleOut):
    content: str = ""
    updated_at: Optional[str] = None

class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str = ""
    parent_id: Optional[int] = None
