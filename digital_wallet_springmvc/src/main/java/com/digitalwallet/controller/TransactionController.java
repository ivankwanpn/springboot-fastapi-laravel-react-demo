package com.digitalwallet.controller;

import com.digitalwallet.model.ApiResponse;
import com.digitalwallet.model.TransactionDTO;
import com.digitalwallet.model.TransferRequest;
import com.digitalwallet.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @PostMapping("/transfer")
    public ResponseEntity<ApiResponse> transfer(@Valid @RequestBody TransferRequest request) {
        Long userId = getCurrentUserId();
        transactionService.transfer(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Transfer completed successfully"));
    }

    @GetMapping
    public ResponseEntity<List<TransactionDTO>> getHistory() {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(transactionService.getHistory(userId));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
