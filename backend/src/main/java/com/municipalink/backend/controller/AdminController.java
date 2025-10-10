package com.municipalink.backend.controller;

import com.municipalink.backend.model.AdminSummary;
import com.municipalink.backend.model.UserAccount;
import com.municipalink.backend.service.MockDataRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final MockDataRepository repository;

    public AdminController(MockDataRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/summary")
    public AdminSummary getSummary() {
        return repository.getAdminSummary();
    }

    @GetMapping("/users")
    public List<UserAccount> getUsers() {
        return repository.findUsers();
    }
}
