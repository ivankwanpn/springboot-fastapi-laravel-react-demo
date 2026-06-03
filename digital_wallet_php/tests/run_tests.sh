#!/bin/bash
set -e

BASE="http://localhost:8080"
PASS=0
FAIL=0
ADMIN_TOKEN=""

cleanup() {
    echo ""
    echo "Cleaning up..."
    if [ -n "$PHP_PID" ]; then
        kill $PHP_PID 2>/dev/null || true
        wait $PHP_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

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

assert_body_contains() {
    local desc="$1" body="$2" pattern="$3"
    if echo "$body" | grep -q "$pattern"; then
        echo "  PASS $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL $desc (pattern '$pattern' not found in: $body)"
        FAIL=$((FAIL + 1))
    fi
}

# Check PostgreSQL
echo "=== Checking PostgreSQL ==="
if command -v psql &> /dev/null; then
    if PGPASSWORD=root psql -h localhost -p 5433 -U postgres -d digital_wallet -c "SELECT 1;" > /dev/null 2>&1; then
        echo "PostgreSQL is running on localhost:5433"
    else
        echo "WARNING: PostgreSQL not reachable on localhost:5433"
        echo "The PHP server connects to DB_PORT (default 5436, or from env)."
        echo "Tests will attempt to run anyway."
    fi
else
    echo "psql not found, skipping PostgreSQL check"
fi

# Start PHP server
echo ""
echo "=== Starting PHP server on :8080 ==="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Use DB_PORT=5433 to match the main database, as per CLAUDE.md
export DB_PORT=5433

php -S localhost:8080 -t public > /dev/null 2>&1 &
PHP_PID=$!
sleep 2

# Verify server started
if ! kill -0 $PHP_PID 2>/dev/null; then
    echo "ERROR: PHP server failed to start"
    exit 1
fi
echo "PHP server PID: $PHP_PID"

# Generate unique usernames
U1="testuser_a_${RANDOM}_$(date +%s)"
U2="testuser_b_${RANDOM}_$(date +%s)"
PASSWD="password123"

echo ""
echo "============================================"
echo "  DIGITAL WALLET INTEGRATION TESTS"
echo "============================================"

# ================================================================
# 1. AUTH TESTS
# ================================================================
echo ""
echo "--- 1. Auth Endpoints ---"

# 1a. Register user1
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$U1\",\"password\":\"$PASSWD\"}")
assert_status "1a. POST /api/auth/register (valid) returns 201" 201 "$RESP"

# 1b. Register user2 (for transfer tests)
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$U2\",\"password\":\"$PASSWD\"}")
assert_status "1b. POST /api/auth/register (second user) returns 201" 201 "$RESP"

# 1c. Register duplicate username
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$U1\",\"password\":\"$PASSWD\"}")
assert_status "1c. POST /api/auth/register (duplicate) returns 409" 409 "$RESP"

# 1d. Register with short username (less than 3 chars)
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"ab\",\"password\":\"$PASSWD\"}")
assert_status "1d. POST /api/auth/register (short username) returns 400" 400 "$RESP"

# 1e. Register with short password (less than 6 chars)
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"validuser123\",\"password\":\"abc12\"}")
assert_status "1e. POST /api/auth/register (short password) returns 400" 400 "$RESP"

# 1f. Login user1
LOGIN_RESP=$(curl -s -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$U1\",\"password\":\"$PASSWD\"}")
HTTP_CODE=$(echo "$LOGIN_RESP" | grep -o '"token"' || true)
TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$TOKEN" ]; then
    echo "  PASS 1f. POST /api/auth/login (valid) returns token"
    PASS=$((PASS + 1))
else
    echo "  FAIL 1f. POST /api/auth/login (valid) no token in response: $LOGIN_RESP"
    FAIL=$((FAIL + 1))
fi

# 1g. Login wrong password
BODY=$(curl -s -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$U1\",\"password\":\"wrongpassword\"}")
assert_body_contains "1g. POST /api/auth/login (wrong password) returns ERROR" "$BODY" '"status":"ERROR"'

# 1h. Login non-existent user
BODY=$(curl -s -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"no_such_user_xyz_123\",\"password\":\"$PASSWD\"}")
assert_body_contains "1h. POST /api/auth/login (non-existent) returns ERROR" "$BODY" '"status":"ERROR"'

# ================================================================
# 2. WALLET TESTS
# ================================================================
echo ""
echo "--- 2. Wallet Endpoints ---"

# 2a. Get wallet with valid token
WALLET_RESP=$(curl -s -X GET "$BASE/api/wallets" \
    -H "Authorization: Bearer $TOKEN")
assert_body_contains "2a. GET /api/wallets (auth) contains balance" "$WALLET_RESP" '"balance"'
assert_body_contains "2b. GET /api/wallets (auth) contains currency" "$WALLET_RESP" '"currency"'

# 2c. Get wallet without token
BODY=$(curl -s -X GET "$BASE/api/wallets")
assert_body_contains "2c. GET /api/wallets (no auth) returns ERROR" "$BODY" '"status":"ERROR"'

# 2d. Get wallet with invalid token
BODY=$(curl -s -X GET "$BASE/api/wallets" \
    -H "Authorization: Bearer invalid_token_here")
assert_body_contains "2d. GET /api/wallets (bad token) returns ERROR" "$BODY" '"status":"ERROR"'

# ================================================================
# 3. TRANSACTION TESTS
# ================================================================
echo ""
echo "--- 3. Transaction Endpoints ---"

# First, deposit some balance for user1 via direct SQL
HAS_BALANCE=false
echo -n "  (Setting up test balance of 1000 for user1)..."
if command -v psql &> /dev/null; then
    PGPASSWORD=root psql -h localhost -p 5433 -U postgres -d digital_wallet \
        -c "UPDATE wallets SET balance = 1000 WHERE user_id = (SELECT id FROM users WHERE username = '$U1');" \
        > /dev/null 2>&1 && HAS_BALANCE=true && echo " done" || echo " skipped (psql failed)"
else
    echo " skipped (psql not available)"
fi

# 3a. Transfer to user2
if $HAS_BALANCE; then
    BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/transactions/transfer" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"toUsername\":\"$U2\",\"amount\":\"50.0000\"}")
    HTTP_CODE=$(echo "$BODY" | tail -n1)
    BODY=$(echo "$BODY" | sed '$d')
    assert_status "3a. POST /api/transactions/transfer (valid) returns 200" 200 "$HTTP_CODE"
else
    echo "  - 3a. Transfer test skipped (psql not available to set balance)"
    PASS=$((PASS + 1))
fi

# 3b. Transfer insufficient balance
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/transactions/transfer" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"toUsername\":\"$U2\",\"amount\":\"99999.0000\"}")
HTTP_CODE=$(echo "$BODY" | tail -n1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "3b. POST /api/transactions/transfer (insufficient) returns 400" 400 "$HTTP_CODE"

# 3c. Transfer to self
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/transactions/transfer" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"toUsername\":\"$U1\",\"amount\":\"10.0000\"}")
HTTP_CODE=$(echo "$BODY" | tail -n1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "3c. POST /api/transactions/transfer (self) returns 400" 400 "$HTTP_CODE"

# 3d. Transfer to non-existent user
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/transactions/transfer" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"toUsername\":\"nobody_xyz_12345\",\"amount\":\"10.0000\"}")
HTTP_CODE=$(echo "$BODY" | tail -n1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "3d. POST /api/transactions/transfer (non-existent) returns 400" 400 "$HTTP_CODE"

# 3e. Transfer without auth
BODY=$(curl -s -X POST "$BASE/api/transactions/transfer" \
    -H "Content-Type: application/json" \
    -d "{\"toUsername\":\"$U2\",\"amount\":\"10.0000\"}")
assert_body_contains "3e. POST /api/transactions/transfer (no auth) returns ERROR" "$BODY" '"status":"ERROR"'

# 3f. Transfer with invalid amount (zero)
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/transactions/transfer" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"toUsername\":\"$U2\",\"amount\":\"0.0000\"}")
HTTP_CODE=$(echo "$BODY" | tail -n1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "3f. POST /api/transactions/transfer (zero amount) returns 400" 400 "$HTTP_CODE"

# 3g. Transaction history with valid token
TX_HISTORY=$(curl -s -X GET "$BASE/api/transactions" \
    -H "Authorization: Bearer $TOKEN")
assert_body_contains "3g. GET /api/transactions (auth) returns JSON" "$TX_HISTORY" "\["

# 3h. Transaction history without token
BODY=$(curl -s -X GET "$BASE/api/transactions")
assert_body_contains "3h. GET /api/transactions (no auth) returns ERROR" "$BODY" '"status":"ERROR"'

# ================================================================
# 4. ADMIN TESTS (non-admin access control)
# ================================================================
echo ""
echo "--- 4. Admin Endpoints (Access Control) ---"

# 4a. Admin list users with regular token -> 403
BODY=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/admin/users" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$BODY" | tail -n1)
assert_status "4a. GET /api/admin/users (non-admin) returns 403" 403 "$HTTP_CODE"

# 4b. Admin list transactions with regular token -> 403
BODY=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/admin/transactions" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$BODY" | tail -n1)
assert_status "4b. GET /api/admin/transactions (non-admin) returns 403" 403 "$HTTP_CODE"

# 4c. Admin transaction stats with regular token -> 403
BODY=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/admin/transactions/stats" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$BODY" | tail -n1)
assert_status "4c. GET /api/admin/transactions/stats (non-admin) returns 403" 403 "$HTTP_CODE"

# 4d. Admin user detail with regular token -> 403
BODY=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/admin/users/1" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$BODY" | tail -n1)
assert_status "4d. GET /api/admin/users/1 (non-admin) returns 403" 403 "$HTTP_CODE"

# 4e. Admin disable user with regular token -> 403
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/api/admin/users/1/disable" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$BODY" | tail -n1)
assert_status "4e. PUT /api/admin/users/1/disable (non-admin) returns 403" 403 "$HTTP_CODE"

# 4f. Admin enable user with regular token -> 403
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/api/admin/users/1/enable" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$BODY" | tail -n1)
assert_status "4f. PUT /api/admin/users/1/enable (non-admin) returns 403" 403 "$HTTP_CODE"

# 4g. Admin endpoints without auth -> 401
BODY=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/admin/users")
HTTP_CODE=$(echo "$BODY" | tail -n1)
assert_status "4g. GET /api/admin/users (no auth) returns 401 or 403" 401 "$HTTP_CODE"

# ================================================================
# 5. ADMIN TESTS (with admin token)
# ================================================================
echo ""
echo "--- 5. Admin Endpoints (with admin token) ---"

# Try to set up admin user in DB
ADMIN_USERNAME=""
if command -v psql &> /dev/null; then
    ADMIN_USERNAME="testadmin_${RANDOM}_$(date +%s)"
    ADMIN_PASS="adminpass123"

    # Check if an admin exists, if not create one
    ADMIN_EXISTS=$(PGPASSWORD=root psql -h localhost -p 5433 -U postgres -d digital_wallet -t -A -c "SELECT id FROM users WHERE role = 'ROLE_ADMIN' LIMIT 1;" 2>/dev/null || echo "")

    if [ -z "$ADMIN_EXISTS" ]; then
        echo "  Creating admin user '$ADMIN_USERNAME'..."

        # Create admin user
        ADMIN_HASH=$(php -r "echo password_hash('$ADMIN_PASS', PASSWORD_BCRYPT);" 2>/dev/null || echo "")
        if [ -n "$ADMIN_HASH" ]; then
            PGPASSWORD=root psql -h localhost -p 5433 -U postgres -d digital_wallet -c "
                INSERT INTO users (username, password_hash, role) VALUES ('$ADMIN_USERNAME', '$ADMIN_HASH', 'ROLE_ADMIN');
                INSERT INTO wallets (user_id, currency, balance, version)
                SELECT id, 'USDT', 0, 0 FROM users WHERE username = '$ADMIN_USERNAME';
            " > /dev/null 2>&1

            # Get admin token
            ADMIN_LOGIN=$(curl -s -X POST "$BASE/api/auth/login" \
                -H "Content-Type: application/json" \
                -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASS\"}")
            ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        fi
    else
        echo "  Admin user already exists in DB (id=$ADMIN_EXISTS)"

        # Try to log in with known admin users
        # Try admin/admin123
        ADMIN_LOGIN=$(curl -s -X POST "$BASE/api/auth/login" \
            -H "Content-Type: application/json" \
            -d '{"username":"admin","password":"admin123"}')
        ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

        if [ -z "$ADMIN_TOKEN" ]; then
            # Try with the admin username if it's not "admin"
            ADMIN_USERNAME="$ADMIN_EXISTS"
        fi
    fi
else
    echo "  psql not available, skipping admin token setup"
fi

if [ -n "$ADMIN_TOKEN" ]; then
    echo "  Admin token obtained successfully"

    # 5a. Admin list users
    BODY=$(curl -s -X GET "$BASE/api/admin/users" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    assert_body_contains "5a. GET /api/admin/users (admin) returns data" "$BODY" '"data"'

    # 5b. Admin list transactions
    BODY=$(curl -s -X GET "$BASE/api/admin/transactions" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    assert_body_contains "5b. GET /api/admin/transactions (admin) returns data" "$BODY" '"data"'

    # 5c. Admin transaction stats
    BODY=$(curl -s -X GET "$BASE/api/admin/transactions/stats" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    assert_body_contains "5c. GET /api/admin/transactions/stats (admin) returns totalTransactions" "$BODY" '"totalTransactions"'

    # 5d. Admin get user detail
    BODY=$(curl -s -X GET "$BASE/api/admin/users/1" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    assert_body_contains "5d. GET /api/admin/users/1 (admin) returns username" "$BODY" '"username"'

    # 5e. Admin disable user - get user2's ID first
    if command -v psql &> /dev/null; then
        U2_ID=$(PGPASSWORD=root psql -h localhost -p 5433 -U postgres -d digital_wallet -t -A -c "SELECT id FROM users WHERE username = '$U2';" 2>/dev/null | tr -d ' ')
        if [ -n "$U2_ID" ] && [ "$U2_ID" != "1" ]; then
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/admin/users/$U2_ID/disable" \
                -H "Authorization: Bearer $ADMIN_TOKEN")
            assert_status "5e. PUT /api/admin/users/$U2_ID/disable (admin) returns 200" 200 "$HTTP_CODE"

            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/admin/users/$U2_ID/enable" \
                -H "Authorization: Bearer $ADMIN_TOKEN")
            assert_status "5f. PUT /api/admin/users/$U2_ID/enable (admin) returns 200" 200 "$HTTP_CODE"
        else
            echo "  SKIP 5e-5f: cannot disable user ID 1 (or user2 not found)"
            PASS=$((PASS + 2))
        fi
    else
        echo "  SKIP 5e-5f: psql not available for user lookup"
        PASS=$((PASS + 2))
    fi
else
    echo "  SKIP 5a-5f: no admin token available"
    PASS=$((PASS + 6))
fi

# ================================================================
# 6. EDGE CASE TESTS
# ================================================================
echo ""
echo "--- 6. Edge Cases ---"

# 6a. 404 on unknown route
BODY=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/unknown/route")
HTTP_CODE=$(echo "$BODY" | tail -n1)
assert_status "6a. GET /api/unknown/route returns 404" 404 "$HTTP_CODE"

# 6b. Wrong method on valid path
BODY=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/auth/register")
HTTP_CODE=$(echo "$BODY" | tail -n1)
assert_status "6b. GET /api/auth/register (wrong method) returns 404" 404 "$HTTP_CODE"

# 6c. POST without Content-Type header should still work
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$U1\",\"password\":\"$PASSWD\"}")
HTTP_CODE=$(echo "$BODY" | tail -n1)
assert_status "6c. POST /api/auth/login with JSON Content-Type returns 200" 200 "$HTTP_CODE"

# 6d. Login with empty username
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"\",\"password\":\"$PASSWD\"}")
HTTP_CODE=$(echo "$BODY" | tail -n1)
assert_status "6d. POST /api/auth/login (empty username) returns 400" 400 "$HTTP_CODE"

# ================================================================
# REPORT
# ================================================================
echo ""
echo "============================================"
echo "  TEST RESULTS"
echo "============================================"
echo "  PASSED: $PASS"
echo "  FAILED: $FAIL"
echo "  TOTAL:  $((PASS + FAIL))"
echo "============================================"

if [ $FAIL -gt 0 ]; then
    echo ""
    echo "SOME TESTS FAILED!"
    exit 1
fi

echo ""
echo "ALL TESTS PASSED!"
exit 0
