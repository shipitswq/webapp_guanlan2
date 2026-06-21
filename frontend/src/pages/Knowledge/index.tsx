import React, { useEffect, useState } from 'react';
import { Input, Tag, Spin, Button, Modal, Form, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../api/client';

interface Article { id: number; title: string; summary: string; category_id: number; tags: string; read_count: number; created_at: string; }
interface Category { id: number; name: string; }

const { TextArea } = Input;

const KnowledgePage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCat, setSelectedCat] = useState<number>(0);
  const [searchText, setSearchText] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articleContent, setArticleContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/api/v1/categories').then(r => setCategories(r.data.items)); }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = {};
    if (selectedCat) params.category_id = selectedCat;
    if (searchText) params.q = searchText;
    api.get('/api/v1/articles', { params }).then(r => setArticles(r.data.items)).finally(() => setLoading(false));
  }, [selectedCat, searchText]);

  const openArticle = async (art: Article) => {
    setSelectedArticle(art);
    try {
      const r = await api.get('/api/v1/articles/' + art.id);
      setArticleContent(r.data.content || '');
    } catch { setArticleContent(''); }
  };

  const openCreateModal = () => {
    setEditingArticle(null);
    form.resetFields();
    form.setFieldsValue({ category_id: selectedCat || 1 });
    setModalOpen(true);
  };

  const openEditModal = async (art: Article) => {
    setEditingArticle(art);
    try {
      const detail = await api.get('/api/v1/articles/' + art.id);
      form.setFieldsValue({
        title: art.title,
        summary: art.summary,
        category_id: art.category_id,
        tags: art.tags,
        content: detail.data.content || '',
      });
    } catch {
      form.setFieldsValue({
        title: art.title,
        summary: art.summary,
        category_id: art.category_id,
        tags: art.tags,
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingArticle) {
        const cur = await api.get('/api/v1/articles/' + editingArticle.id);
        await api.put('/api/v1/articles/' + editingArticle.id, {
          ...values,
          content: values.content !== undefined ? values.content : (cur.data.content || ''),
        });
        message.success('已更新');
      } else {
        await api.post('/api/v1/articles', { ...values, content: values.content || '# 新文章\\n\\n在此输入内容...' });
        message.success('已创建');
      }
      setModalOpen(false);
      form.resetFields();
      const params: Record<string, string | number> = {};
      if (selectedCat) params.category_id = selectedCat;
      if (searchText) params.q = searchText;
      api.get('/api/v1/articles', { params }).then(r => setArticles(r.data.items));
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('保存失败');
    } finally { setSaving(false); }
  };

  const handleDelete = async (art: Article) => {
    try {
      await api.delete('/api/v1/articles/' + art.id);
      message.success('已删除');
      if (selectedArticle?.id === art.id) {
        setSelectedArticle(null);
        setArticleContent('');
      }
      const params: Record<string, string | number> = {};
      if (selectedCat) params.category_id = selectedCat;
      if (searchText) params.q = searchText;
      api.get('/api/v1/articles', { params }).then(r => setArticles(r.data.items));
    } catch { message.error('删除失败'); }
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--mm-space-xl)', display: 'flex', gap: 'var(--mm-space-md)', alignItems: 'center' }}>
        <Input.Search
          placeholder={'\u641c\u7d22\u6587\u7ae0...'}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 320 }}
          allowClear
        />
        <span style={{ fontFamily: 'var(--mm-font-family)', fontSize: 'var(--mm-caption-size)', color: 'var(--mm-stone)' }}>
          {articles.length} {'\u7bc7\u6587\u7ae0'}
        </span>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          {'\u65b0\u5efa\u6587\u7ae0'}
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--mm-space-xl)' }}>
        <div className="mm-card" style={{ width: 180, flexShrink: 0, padding: 'var(--mm-space-md)' }}>
          <div className="mm-body-sm" style={{ fontWeight: 600, color: 'var(--mm-ink)', padding: 'var(--mm-space-xs) var(--mm-space-md)', marginBottom: 'var(--mm-space-xs)' }}>
            {'\u5206\u7c7b'}
          </div>
          <button
            className={selectedCat === 0 ? 'mm-sidebar-item--active' : 'mm-sidebar-item'}
            style={{ width: '100%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setSelectedCat(0)}
          >
            <BookOutlined style={{ fontSize: 14 }} />
            {'\u5168\u90e8'}
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

        <div style={{ flex: 1, minWidth: 0 }}>
          {loading && <Spin style={{ display: 'block', margin: '60px auto' }} />}
          {!loading && articles.length === 0 && (
            <div className="mm-card" style={{ textAlign: 'center', padding: 'var(--mm-space-section)' }}>
              <p className="mm-body-sm" style={{ color: 'var(--mm-stone)' }}>{'\u6682\u65e0\u6587\u7ae0'}</p>
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
                display: 'flex',
                gap: 'var(--mm-space-lg)',
                alignItems: 'flex-start',
              }}
              onClick={() => openArticle(item)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--mm-font-family)', fontSize: 'var(--mm-body-md-size)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.title}
                </div>
                <p style={{ margin: '4px 0', color: 'var(--mm-slate)', fontSize: 'var(--mm-body-sm-size)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.summary}
                </p>
                <div style={{ display: 'flex', gap: 'var(--mm-space-xs)', alignItems: 'center', marginTop: 'var(--mm-space-xs)' }}>
                  <span style={{ fontFamily: 'var(--mm-font-family)', fontSize: 'var(--mm-caption-size)', color: 'var(--mm-stone)' }}>
                    {'\u9605\u8bfb'} {item.read_count}
                  </span>
                  {item.tags?.split(',').filter(Boolean).map(t => (
                    <Tag key={t} style={{ margin: 0, fontSize: 12 }}>{t}</Tag>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditModal(item)} />
                <Popconfirm title={'\u786e\u5b9a\u5220\u9664\u6b64\u6587\u7ae0\uff1f'} onConfirm={() => handleDelete(item)} okText={'\u786e\u5b9a'} cancelText={'\u53d6\u6d88'}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>

        {selectedArticle && (
          <div className="mm-card" style={{ width: 480, flexShrink: 0, padding: 'var(--mm-space-lg)', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--mm-space-md)' }}>
              <div style={{ fontFamily: 'var(--mm-font-family)', fontSize: 18, fontWeight: 600 }}>{selectedArticle.title}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditModal(selectedArticle)} />
                <Popconfirm title={'\u786e\u5b9a\u5220\u9664\uff1f'} onConfirm={() => handleDelete(selectedArticle)} okText={'\u786e\u5b9a'} cancelText={'\u53d6\u6d88'}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
                <button className="mm-btn-tertiary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => { setSelectedArticle(null); setArticleContent(''); }}>
                  {'\u5173\u95ed'}
                </button>
              </div>
            </div>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{articleContent}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <Modal
        title={editingArticle ? '\u7f16\u8f91\u6587\u7ae0' : '\u65b0\u5efa\u6587\u7ae0'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        width={640}
        okText={'\u4fdd\u5b58'}
        cancelText={'\u53d6\u6d88'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label={'\u6807\u9898'} rules={[{ required: true, message: '\u8bf7\u8f93\u5165\u6587\u7ae0\u6807\u9898' }]}>
            <Input placeholder={'\u6587\u7ae0\u6807\u9898'} />
          </Form.Item>
          <Form.Item name="category_id" label={'\u5206\u7c7b'} rules={[{ required: true }]}>
            <Select>
              {categories.map(c => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="summary" label={'\u6458\u8981'}>
            <Input.TextArea rows={2} placeholder={'\u7b80\u77ed\u6458\u8981\uff08\u53ef\u9009\uff09'} />
          </Form.Item>
          <Form.Item name="content" label={'\u5185\u5bb9 (Markdown)'}>
            <TextArea rows={10} placeholder={'\u652f\u6301 Markdown \u683c\u5f0f'} />
          </Form.Item>
          <Form.Item name="tags" label={'\u6807\u7b7e'}>
            <Input placeholder={'\u9017\u53f7\u5206\u9694\uff0c\u5982: \u57fa\u7840,\u5165\u95e8'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default KnowledgePage;
