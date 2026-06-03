package com.digitalwallet.controller;

import com.digitalwallet.model.*;
import com.digitalwallet.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private AdminService adminService;

    public void setAdminService(AdminService adminService) { this.adminService = adminService; }

    @GetMapping("/users")
    public ResponseEntity<PaginatedResponse<UserDTO>> listUsers(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.listUsers(search, page, size));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserDetailDTO> getUserDetail(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUserDetail(id));
    }

    @PutMapping("/users/{id}/disable")
    public ResponseEntity<ApiResponse> disableUser(@PathVariable Long id) {
        adminService.disableUser(id);
        return ResponseEntity.ok(ApiResponse.success("User disabled successfully"));
    }

    @PutMapping("/users/{id}/enable")
    public ResponseEntity<ApiResponse> enableUser(@PathVariable Long id) {
        adminService.enableUser(id);
        return ResponseEntity.ok(ApiResponse.success("User enabled successfully"));
    }

    @GetMapping("/transactions")
    public ResponseEntity<PaginatedResponse<AdminTransactionDTO>> listTransactions(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.listTransactions(username, from, to, page, size));
    }

    @GetMapping("/transactions/stats")
    public ResponseEntity<TransactionStatsDTO> getTransactionStats(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(adminService.getTransactionStats(from, to));
    }
}
