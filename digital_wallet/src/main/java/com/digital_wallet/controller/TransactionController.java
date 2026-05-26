package com.digital_wallet.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.digital_wallet.model.dto.ApiResponse;
import com.digital_wallet.model.dto.TransactionDTO;
import com.digital_wallet.model.dto.TransferRequestDTO;
import com.digital_wallet.service.TransactionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping("/transfer")
    public ResponseEntity<ApiResponse> transfer(@Valid @RequestBody TransferRequestDTO request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long fromUserId = (Long) auth.getPrincipal();

        transactionService.transfer(fromUserId, request.getToUsername(), request.getAmount());
        return ResponseEntity.ok(ApiResponse.success("Transfer completed successfully"));
    }

    @GetMapping
    public ResponseEntity<List<TransactionDTO>> getTransactionHistory() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        List<TransactionDTO> history = transactionService.getTransactionHistory(userId);
        return ResponseEntity.ok(history);
    }
}
