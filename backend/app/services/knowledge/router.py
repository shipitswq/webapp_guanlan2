from fastapi import APIRouter, Depends
from sqlalchemy import select, func, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.article import Article
from app.models.category import Category
router = APIRouter(prefix='/api/v1', tags=['knowledge'])

@router.get('/categories')
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.sort_order))
    return {'items': [{'id': c.id, 'name': c.name, 'slug': c.slug, 'description': c.description} for c in result.scalars().all()]}

@router.get('/articles')
async def list_articles(category_id: int = 0, q: str = '', page: int = 1, size: int = 20, db: AsyncSession = Depends(get_db)):
    query = select(Article)
    if category_id:
        query = query.where(Article.category_id == category_id)
    if q:
        query = query.where(or_(Article.title.contains(q), Article.summary.contains(q), Article.content.contains(q)))
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    query = query.order_by(Article.created_at.desc()).offset((page-1)*size).limit(size)
    result = await db.execute(query)
    items = [{'id': a.id, 'title': a.title, 'summary': a.summary, 'category_id': a.category_id, 'tags': a.tags, 'read_count': a.read_count, 'created_at': a.created_at.isoformat() if a.created_at else ''} for a in result.scalars().all()]
    return {'items': items, 'total': total}

@router.get('/articles/{article_id}')
async def get_article(article_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).where(Article.id == article_id))
    art = result.scalar_one_or_none()
    if not art:
        return {'error': 'not found'}
    await db.execute(update(Article).where(Article.id == article_id).values(read_count=Article.read_count + 1))
    await db.commit()
    art = (await db.execute(select(Article).where(Article.id == article_id))).scalar_one_or_none()
    return {'id': art.id, 'title': art.title, 'summary': art.summary, 'content': art.content, 'category_id': art.category_id, 'tags': art.tags, 'read_count': art.read_count, 'created_at': art.created_at.isoformat() if art.created_at else '', 'updated_at': art.updated_at.isoformat() if art.updated_at else ''}


