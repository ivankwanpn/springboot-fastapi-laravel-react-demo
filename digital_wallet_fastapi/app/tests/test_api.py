import uuid
import pytest


class TestAuth:

    async def test_register_success(self, client):
        username = f"reg_{uuid.uuid4().hex[:8]}"
        resp = await client.post("/api/auth/register", json={"username": username, "password": "pass123456"})
        assert resp.status_code == 201
        assert resp.json()["status"] == "SUCCESS"

    async def test_register_duplicate(self, client):
        username = f"dup_{uuid.uuid4().hex[:8]}"
        await client.post("/api/auth/register", json={"username": username, "password": "pass123456"})
        resp = await client.post("/api/auth/register", json={"username": username, "password": "pass123456"})
        assert resp.status_code == 409

    async def test_login_success(self, client):
        username = f"login_{uuid.uuid4().hex[:8]}"
        await client.post("/api/auth/register", json={"username": username, "password": "mypassword"})
        resp = await client.post("/api/auth/login", json={"username": username, "password": "mypassword"})
        assert resp.status_code == 200
        assert "token" in resp.json()

    async def test_login_wrong_password(self, client):
        username = f"badpw_{uuid.uuid4().hex[:8]}"
        await client.post("/api/auth/register", json={"username": username, "password": "correct"})
        resp = await client.post("/api/auth/login", json={"username": username, "password": "wrong"})
        assert resp.status_code == 401

    async def test_login_disabled_user(self, client, admin_headers):
        """Create user, disable via admin, then try login.

        Uses explicit event-loop yields between steps and a default-aware next()
        to avoid StopIteration bubbling on Windows ProactorEventLoop.
        """
        import asyncio

        username = f"disabled_{uuid.uuid4().hex[:8]}"

        # 1. Register user
        await client.post("/api/auth/register", json={"username": username, "password": "mypassword"})
        await asyncio.sleep(0)

        # 2. Get user list to find the ID (avoid bare next())
        resp = await client.get("/api/admin/users", headers=admin_headers)
        await asyncio.sleep(0)
        users = resp.json()["data"]
        user_id = None
        for u in users:
            if u["username"] == username:
                user_id = u["id"]
                break
        assert user_id is not None, f"User '{username}' not found in admin user list"

        # 3. Disable
        await client.put(f"/api/admin/users/{user_id}/disable", headers=admin_headers)
        await asyncio.sleep(0)

        # 4. Try login — must fail
        resp = await client.post("/api/auth/login", json={"username": username, "password": "mypassword"})
        assert resp.status_code == 401


class TestWallet:

    async def test_get_wallet(self, client, user_token):
        resp = await client.get("/api/wallets", headers=user_token["headers"])
        assert resp.status_code == 200

    async def test_get_wallet_no_auth(self, client):
        resp = await client.get("/api/wallets")
        assert resp.status_code == 401


class TestTransaction:

    async def test_transfer_success(self, client, user_token):
        # Create receiver
        recv_name = f"recv_{uuid.uuid4().hex[:8]}"
        await client.post("/api/auth/register", json={"username": recv_name, "password": "pass123456"})
        resp = await client.post("/api/transactions/transfer", headers=user_token["headers"],
            json={"toUsername": recv_name, "amount": 100})
        assert resp.status_code == 200

    async def test_transfer_insufficient_balance(self, client, user_token):
        recv_name = f"poor_{uuid.uuid4().hex[:8]}"
        await client.post("/api/auth/register", json={"username": recv_name, "password": "pass123456"})
        resp = await client.post("/api/transactions/transfer", headers=user_token["headers"],
            json={"toUsername": recv_name, "amount": 99999})
        assert resp.status_code == 400

    async def test_transfer_to_self(self, client, user_token):
        resp = await client.post("/api/transactions/transfer", headers=user_token["headers"],
            json={"toUsername": user_token["username"], "amount": 50})
        assert resp.status_code == 400

    async def test_transfer_to_nonexistent(self, client, user_token):
        resp = await client.post("/api/transactions/transfer", headers=user_token["headers"],
            json={"toUsername": "no_such_user_xyz", "amount": 50})
        assert resp.status_code == 400

    async def test_transaction_history(self, client, user_token):
        resp = await client.get("/api/transactions", headers=user_token["headers"])
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestAdmin:

    async def test_list_users_as_admin(self, client, admin_headers):
        resp = await client.get("/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data

    async def test_list_users_as_regular_user(self, client, user_token):
        resp = await client.get("/api/admin/users", headers=user_token["headers"])
        assert resp.status_code == 403

    async def test_user_detail(self, client, admin_headers, user_token):
        resp = await client.get(f"/api/admin/users/{user_token['user_id']}", headers=admin_headers)
        assert resp.status_code == 200
        assert "wallet" in resp.json()

    async def test_disable_and_enable_user(self, client, admin_headers, user_token):
        uid = user_token["user_id"]
        # Disable
        resp = await client.put(f"/api/admin/users/{uid}/disable", headers=admin_headers)
        assert resp.status_code == 200
        # Enable
        resp = await client.put(f"/api/admin/users/{uid}/enable", headers=admin_headers)
        assert resp.status_code == 200

    async def test_list_transactions(self, client, admin_headers):
        resp = await client.get("/api/admin/transactions", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data

    async def test_transaction_stats(self, client, admin_headers):
        resp = await client.get("/api/admin/transactions/stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "totalTransactions" in data
        assert "dailyVolume" in data

    async def test_admin_endpoints_no_auth(self, client):
        for url in ["/api/admin/users", "/api/admin/transactions", "/api/admin/transactions/stats"]:
            resp = await client.get(url)
            assert resp.status_code == 401, f"{url} should return 401"
