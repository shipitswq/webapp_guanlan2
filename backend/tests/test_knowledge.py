def test_list_categories(client):
    resp = client.get("/api/v1/categories")
    assert resp.status_code == 200
    assert "items" in resp.json()

def test_list_articles_empty(client):
    resp = client.get("/api/v1/articles")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data

def test_get_article_not_found(client):
    resp = client.get("/api/v1/articles/999")
    assert resp.status_code == 200
    assert "error" in resp.json()
