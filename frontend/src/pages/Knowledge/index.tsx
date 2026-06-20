import React, { useEffect, useState } from 'react';
import { Row, Col, Card, List, Typography, Tag, Input, Space } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import api from '../../api/client';

const { Paragraph } = Typography;

interface Article { id: number; title: string; summary: string; category_id: number; tags: string; read_count: number; created_at: string; }
interface Category { id: number; name: string; }

const KnowledgePage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCat, setSelectedCat] = useState<number>(0);
  const [searchText, setSearchText] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articleContent, setArticleContent] = useState('');

  useEffect(() => { api.get('/api/v1/categories').then(r => setCategories(r.data.items)); }, []);
  useEffect(() => {
    const params: any = {};
    if (selectedCat) params.category_id = selectedCat;
    if (searchText) params.q = searchText;
    api.get('/api/v1/articles', { params }).then(r => setArticles(r.data.items));
  }, [selectedCat, searchText]);

  const openArticle = async (art: Article) => {
    setSelectedArticle(art);
    const r = await api.get('/api/v1/articles/' + art.id);
    setArticleContent(r.data.content || '(暂无内容)');
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%' }}>
        <Input.Search placeholder="搜索文章..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 300 }} allowClear />
      </Space>
      <Row gutter={24}>
        <Col span={4}>
          <Card size="small" title="分类">
            <div style={{ cursor: 'pointer', padding: '4px 0', fontWeight: selectedCat === 0 ? 'bold' : 'normal', color: selectedCat === 0 ? '#1890ff' : undefined }} onClick={() => setSelectedCat(0)}>全部</div>
            {categories.map(c => (
              <div key={c.id} style={{ cursor: 'pointer', padding: '4px 0', fontWeight: selectedCat === c.id ? 'bold' : 'normal', color: selectedCat === c.id ? '#1890ff' : undefined }} onClick={() => setSelectedCat(c.id)}>
                <BookOutlined style={{ marginRight: 4 }} />{c.name}
              </div>
            ))}
          </Card>
        </Col>
        <Col span={selectedArticle ? 8 : 20}>
          <List dataSource={articles} renderItem={item => (
            <List.Item onClick={() => openArticle(item)} style={{ cursor: 'pointer' }}>
              <List.Item.Meta title={<span style={{ color: selectedArticle?.id === item.id ? '#1890ff' : undefined }}>{item.title}</span>}
                description={<><Paragraph ellipsis={{ rows: 2 }}>{item.summary}</Paragraph><span style={{ fontSize: 12, color: '#999' }}>阅读 {item.read_count}</span>{item.tags?.split(',').filter(Boolean).map(t => <Tag key={t} style={{ marginLeft: 4 }}>{t}</Tag>)}</>} />
            </List.Item>
          )} />
        </Col>
        {selectedArticle && (
          <Col span={12}>
            <Card title={selectedArticle.title} extra={<a onClick={() => { setSelectedArticle(null); setArticleContent(''); }}>关闭</a>}>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{articleContent}</div>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};
export default KnowledgePage;