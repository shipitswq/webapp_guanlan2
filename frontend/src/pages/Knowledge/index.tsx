import React, { useEffect, useState } from 'react';
import { Input, Tag, Spin } from 'antd';
import { CheckCircleOutlined, BookOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../api/client';

interface Article { id: number; title: string; summary: string; category_id: number; tags: string; read_count: number; created_at: string; }
interface Category { id: number; name: string; }

const KnowledgePage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCat, setSelectedCat] = useState<number>(0);
  const [searchText, setSearchText] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articleContent, setArticleContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<Record<number, boolean>>({});

  // Fetch categories
  useEffect(() => { api.get('/api/v1/categories').then(r => setCategories(r.data.items)); }, []);

  // Fetch articles
  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = {};
    if (selectedCat) params.category_id = selectedCat;
    if (searchText) params.q = searchText;
    api.get('/api/v1/articles', { params }).then(r => setArticles(r.data.items)).finally(() => setLoading(false));
  }, [selectedCat, searchText]);

  // Fetch reading progress (if logged in)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/api/v1/progress').then(r => {
      const map: Record<number, boolean> = {};
      (r.data.items || []).forEach((p: any) => { if (p.is_read) map[p.article_id] = true; });
      setProgress(map);
    }).catch(() => {});
  }, []);

  const openArticle = async (art: Article) => {
    setSelectedArticle(art);
    try {
      const r = await api.get('/api/v1/articles/' + art.id);
      setArticleContent(r.data.content || '(暂无内容)');

      // Mark as read (if logged in)
      const token = localStorage.getItem('token');
      if (token && !progress[art.id]) {
        await api.post('/api/v1/progress/' + art.id + '/read').catch(() => {});
        setProgress(prev => ({ ...prev, [art.id]: true }));
      }
    } catch { setArticleContent('(暂无内容)'); }
  };

  return (
    <div>
      {/* ── Search Bar ────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--mm-space-xl)', display: 'flex', gap: 'var(--mm-space-md)', alignItems: 'center' }}>
        <Input.Search
          placeholder="搜索文章..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 320 }}
          allowClear
        />
        <span style={{ fontFamily: 'var(--mm-font-family)', fontSize: 'var(--mm-caption-size)', color: 'var(--mm-stone)' }}>
          {articles.length} 篇文章
        </span>
      </div>

      <div style={{ display: 'flex', gap: 'var(--mm-space-xl)' }}>
        {/* ── Category Sidebar ───────────────────────────────── */}
        <div className="mm-card" style={{ width: 180, flexShrink: 0, padding: 'var(--mm-space-md)' }}>
          <div className="mm-body-sm" style={{ fontWeight: 600, color: 'var(--mm-ink)', padding: 'var(--mm-space-xs) var(--mm-space-md)', marginBottom: 'var(--mm-space-xs)' }}>
            分类
          </div>
          <button
            className={selectedCat === 0 ? 'mm-sidebar-item--active' : 'mm-sidebar-item'}
            style={{ width: '100%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setSelectedCat(0)}
          >
            <BookOutlined style={{ fontSize: 14 }} />
            全部
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              className={selectedCat === c.id ? 'mm-sidebar-item--active' : 'mm-sidebar-item'}
              style={{ width: '100%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setSelectedCat(c.id)}
            >
              <BookOutlined style={{ fontSize: 14 }} />
              {c.name}
            </button>
          ))}
        </div>

        {/* ── Article List ───────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading && <Spin style={{ display: 'block', margin: '60px auto' }} />}
          {!loading && articles.length === 0 && (
            <div className="mm-card" style={{ textAlign: 'center', padding: 'var(--mm-space-section)' }}>
              <p className="mm-body-sm" style={{ color: 'var(--mm-stone)' }}>暂无文章</p>
            </div>
          )}
          {!loading && articles.map(item => (
            <div
              key={item.id}
              className="mm-card"
              style={{
                marginBottom: 'var(--mm-space-sm)',
                padding: 'var(--mm-space-md) var(--mm-space-lg)',
                cursor: 'pointer',
                borderColor: selectedArticle?.id === item.id ? 'var(--mm-ink)' : 'var(--mm-hairline)',
                transition: 'border-color 150ms',
                display: 'flex',
                gap: 'var(--mm-space-lg)',
                alignItems: 'flex-start',
              }}
              onClick={() => openArticle(item)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--mm-font-family)',
                  fontSize: 'var(--mm-body-md-size)',
                  fontWeight: 600,
                  color: selectedArticle?.id === item.id ? 'var(--mm-ink)' : 'var(--mm-charcoal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  {item.title}
                  {progress[item.id] && (
                    <span style={{ fontFamily: 'var(--mm-font-family)', fontSize: 12, color: 'var(--mm-success-text)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      <CheckCircleOutlined /> 已读
                    </span>
                  )}
                </div>
                <p style={{
                  margin: '4px 0',
                  color: 'var(--mm-slate)',
                  fontSize: 'var(--mm-body-sm-size)',
                  lineHeight: 1.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {item.summary}
                </p>
                <div style={{ display: 'flex', gap: 'var(--mm-space-xs)', alignItems: 'center', marginTop: 'var(--mm-space-xs)' }}>
                  <span style={{ fontFamily: 'var(--mm-font-family)', fontSize: 'var(--mm-caption-size)', color: 'var(--mm-stone)' }}>
                    阅读 {item.read_count}
                  </span>
                  {item.tags?.split(',').filter(Boolean).map(t => (
                    <Tag key={t} style={{ margin: 0, fontSize: 12 }}>{t}</Tag>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Article Content (side panel) ───────────────────── */}
        {selectedArticle && (
          <div className="mm-card" style={{ width: 480, flexShrink: 0, padding: 'var(--mm-space-lg)', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--mm-space-md)' }}>
              <div style={{ fontFamily: 'var(--mm-font-family)', fontSize: 18, fontWeight: 600, color: 'var(--mm-ink)' }}>
                {selectedArticle.title}
                {progress[selectedArticle.id] && (
                  <span className="mm-badge mm-badge-success" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
                    <CheckCircleOutlined /> 已读
                  </span>
                )}
              </div>
              <button
                className="mm-btn-tertiary"
                style={{ padding: '4px 12px', fontSize: 12 }}
                onClick={() => { setSelectedArticle(null); setArticleContent(''); }}
              >
                关闭
              </button>
            </div>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{articleContent}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default KnowledgePage;
