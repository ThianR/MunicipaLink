package com.municipalink.backend.controller;

import com.municipalink.backend.model.MunicipalitySummary;
import com.municipalink.backend.model.RequestDetail;
import com.municipalink.backend.service.MockDataRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/municipalities")
public class MunicipalityController {

    private final MockDataRepository repository;

    public MunicipalityController(MockDataRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<MunicipalitySummary> listMunicipalities() {
        return repository.findMunicipalities();
    }

    @GetMapping("/{id}")
    public ResponseEntity<MunicipalitySummary> getMunicipality(@PathVariable String id) {
        return repository.findMunicipalityById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/requests")
    public List<RequestDetail> getRequestsForMunicipality(@PathVariable String id) {
        return repository.findRequestsByMunicipality(id);
    }
}
