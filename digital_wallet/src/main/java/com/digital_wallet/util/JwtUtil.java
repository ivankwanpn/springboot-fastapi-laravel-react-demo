package com.digital_wallet.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component // 交給 Spring 管理
public class JwtUtil {

    // 從 application.yaml 讀取設定
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    // 1. 產生 Token (將 userId 藏在 Subject 裡面)
    public String generateToken(Long userId, String username) {
        return Jwts.builder()
                .setSubject(String.valueOf(userId)) // 通常把最關鍵的 ID 放進 Subject
                .claim("username", username)        // 可以額外塞入自訂欄位 (Claim)
                .setIssuedAt(new Date(System.currentTimeMillis())) // 發證時間
                .setExpiration(new Date(System.currentTimeMillis() + expiration)) // 過期時間
                .signWith(getSignInKey(), SignatureAlgorithm.HS256) // 使用私鑰與 HS256 演算法簽名
                .compact();
    }

    // 2. 從 Token 中解析出 userId
    public Long extractUserId(String token) {
        Claims claims = extractAllClaims(token);
        return Long.parseLong(claims.getSubject());
    }

    // 3. 驗證 Token 是否合法且未過期
    public boolean isTokenValid(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            return false; // 如果被竄改或過期，解析時會拋出例外
        }
    }

    // --- 私有輔助方法 ---
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}