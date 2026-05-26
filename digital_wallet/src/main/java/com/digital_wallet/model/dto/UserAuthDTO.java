package com.digital_wallet.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 內部認證用 DTO - 包含 passwordHash，僅限 Service/Mapper 層使用
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAuthDTO {
    private Long id;
    private String username;
    private String passwordHash;
    private String role;
}
