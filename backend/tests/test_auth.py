def test_register(client):
    resp = client.post("/api/v1/auth/register", json={"username": "testuser", "password": "testpass123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert "user_id" in data

def test_register_duplicate(client):
    client.post("/api/v1/auth/register", json={"username": "dupuser", "password": "testpass123"})
    resp = client.post("/api/v1/auth/register", json={"username": "dupuser", "password": "testpass123"})
    assert resp.status_code == 400

def test_login(client):
    client.post("/api/v1/auth/register", json={"username": "loginuser", "password": "testpass123"})
    resp = client.post("/api/v1/auth/login", json={"username": "loginuser", "password": "testpass123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data

def test_login_invalid(client):
    resp = client.post("/api/v1/auth/login", json={"username": "nobody", "password": "wrongpass"})
    assert resp.status_code == 401

def test_watchlist_requires_auth(client):
    resp = client.get("/api/v1/watchlist")
    assert resp.status_code == 403
