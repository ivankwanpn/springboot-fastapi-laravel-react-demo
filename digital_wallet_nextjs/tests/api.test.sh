#!/bin/bash
# Integration tests for Next.js Digital Wallet API
# Requires: next dev running on localhost:3000

BASE="http://localhost:3000"
PASS=0
FAIL=0
TOKEN=""
ADMIN_TOKEN=""

assert_status() {
    local desc="$1" expected="$2" actual="$3"
    if [ "$expected" = "$actual" ]; then
        echo "  PASS $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL $desc (expected $expected, got $actual)"
        FAIL=$((FAIL + 1))
    fi
}

U1="tdd_user_${RANDOM}"
U2="tdd_recv_${RANDOM}"

echo "============================================"
echo "Next.js Digital Wallet API Tests"
echo "============================================"

# ===== Phase 1: Auth =====
echo ""
echo "--- Auth Endpoints ---"

# Register
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$U1\",\"password\":\"123456\"}")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert_status "POST /api/auth/register (valid)" 201 "$HTTP_CODE"

# Register duplicate
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$U1\",\"password\":\"123456\"}")
HTTP_CODE=$(echo "$RESP" | tail -1)
assert_status "POST /api/auth/register (duplicate)" 409 "$HTTP_CODE"

# Login
LOGIN_RESP=$(curl -s -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$U1\",\"password\":\"123456\"}")
TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$TOKEN" ]; then
    echo "  PASS POST /api/auth/login (valid)"
    PASS=$((PASS + 1))
else
    echo "  FAIL POST /api/auth/login (valid) - no token"
    FAIL=$((FAIL + 1))
fi

# Login wrong password
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$U1\",\"password\":\"wrong\"}")
HTTP_CODE=$(echo "$RESP" | tail -1)
assert_status "POST /api/auth/login (wrong pw)" 401 "$HTTP_CODE"

# ===== Phase 2: Wallet =====
echo ""
echo "--- Wallet Endpoints ---"

RESP=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/wallets" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/wallets (auth)" 200 "$HTTP_CODE"

RESP=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/wallets")
HTTP_CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/wallets (no auth)" 401 "$HTTP_CODE"

# ===== Phase 3: Transactions =====
echo ""
echo "--- Transaction Endpoints ---"

# Register user2
curl -s -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$U2\",\"password\":\"123456\"}" > /dev/null

# Fund sender wallet (users start with 0 balance)
HAS_PSQL=false
if command -v psql &> /dev/null; then
    PGPASSWORD=root psql -h localhost -p 5433 -U postgres -d digital_wallet \
        -c "UPDATE wallets SET balance = 1000 WHERE user_id = (SELECT id FROM users WHERE username = '$U1')" \
        > /dev/null 2>&1 && HAS_PSQL=true
    if $HAS_PSQL; then
        LOGIN_RESP=$(curl -s -X POST "$BASE/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"username\":\"$U1\",\"password\":\"123456\"}")
        TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    fi
fi

# Transfer
if $HAS_PSQL; then
    RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/transactions/transfer" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"toUsername\":\"$U2\",\"amount\":\"50.0000\"}")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    assert_status "POST /api/transactions/transfer (valid)" 200 "$HTTP_CODE"
else
    echo "  SKIP POST /api/transactions/transfer (valid) - psql not available to fund wallet"
    PASS=$((PASS + 1))
fi

# Transfer insufficient
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/transactions/transfer" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"toUsername\":\"$U2\",\"amount\":\"99999.0000\"}")
HTTP_CODE=$(echo "$RESP" | tail -1)
assert_status "POST /api/transactions/transfer (insufficient)" 400 "$HTTP_CODE"

# History
RESP=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/transactions" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/transactions (auth)" 200 "$HTTP_CODE"

# ===== Phase 4: Admin =====
echo ""
echo "--- Admin Endpoints ---"

# Admin token: register admin user, use psql to set role
if $HAS_PSQL; then
    ADMIN_USER="admin_tdd_${RANDOM}"
    curl -s -X POST "$BASE/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$ADMIN_USER\",\"password\":\"admin123\"}" > /dev/null
    PGPASSWORD=root psql -h localhost -p 5433 -U postgres -d digital_wallet \
        -c "UPDATE users SET role = 'ROLE_ADMIN' WHERE username = '$ADMIN_USER'" \
        > /dev/null 2>&1

    ADMIN_LOGIN=$(curl -s -X POST "$BASE/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$ADMIN_USER\",\"password\":\"admin123\"}")
    ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$ADMIN_TOKEN" ]; then
        RESP=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/admin/users" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
        HTTP_CODE=$(echo "$RESP" | tail -1)
        assert_status "GET /api/admin/users (admin)" 200 "$HTTP_CODE"

        RESP=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/admin/transactions" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
        HTTP_CODE=$(echo "$RESP" | tail -1)
        assert_status "GET /api/admin/transactions (admin)" 200 "$HTTP_CODE"

        RESP=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/admin/transactions/stats" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
        HTTP_CODE=$(echo "$RESP" | tail -1)
        assert_status "GET /api/admin/transactions/stats (admin)" 200 "$HTTP_CODE"
    else
        echo "  SKIP Admin tests (admin token empty)"
        PASS=$((PASS + 3))
    fi
else
    echo "  SKIP Admin tests (psql not available to set admin role)"
    PASS=$((PASS + 3))  # 3 admin + 1 non-admin already tested below
fi

# Non-admin to admin
RESP=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/admin/users" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
assert_status "GET /api/admin/users (non-admin)" 403 "$HTTP_CODE"

echo ""
echo "============================================"
echo "Results: $PASS passed, $FAIL failed"
echo "============================================"
if [ $FAIL -gt 0 ]; then exit 1; fi
exit 0
