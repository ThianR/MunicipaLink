package com.municipalink.backend.service;

import com.municipalink.backend.model.AdminSummary;
import com.municipalink.backend.model.MunicipalitySummary;
import com.municipalink.backend.model.RequestDetail;
import com.municipalink.backend.model.UserAccount;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class MockDataRepository {

    private final List<MunicipalitySummary> municipalities = List.of(
            new MunicipalitySummary(
                    "asuncion",
                    "Municipalidad de Asunción",
                    28,
                    15,
                    new MunicipalitySummary.MunicipalityBreakdown(12, 8, 15)
            ),
            new MunicipalitySummary(
                    "ciudad_del_este",
                    "Municipalidad de Ciudad del Este",
                    18,
                    10,
                    new MunicipalitySummary.MunicipalityBreakdown(7, 5, 12)
            ),
            new MunicipalitySummary(
                    "encarnacion",
                    "Municipalidad de Encarnación",
                    12,
                    8,
                    new MunicipalitySummary.MunicipalityBreakdown(4, 3, 9)
            )
    );

    private final Map<String, List<RequestDetail>> requestsByMunicipality = Map.of(
            "asuncion", List.of(
                    new RequestDetail(
                            1,
                            "asuncion",
                            "reparacion",
                            "Reparación",
                            "Bache en la calle principal",
                            "pendiente",
                            LocalDate.of(2025, 4, 10),
                            OffsetDateTime.of(2025, 4, 10, 14, 30, 0, 0, ZoneOffset.ofHours(-4)),
                            "Calle Palma 123",
                            List.of("https://cdn.pixabay.com/photo/2018/01/17/04/14/road-3087868_1280.jpg"),
                            null
                    ),
                    new RequestDetail(
                            2,
                            "asuncion",
                            "mantenimiento",
                            "Mantenimiento",
                            "Poste de luz caído",
                            "en-progreso",
                            LocalDate.of(2025, 4, 9),
                            OffsetDateTime.of(2025, 4, 10, 9, 15, 0, 0, ZoneOffset.ofHours(-4)),
                            "Avda. España 234",
                            List.of("https://cdn.pixabay.com/photo/2016/10/22/20/34/outdoors-1761292_1280.jpg"),
                            "El equipo de mantenimiento está en camino para evaluar la situación."
                    ),
                    new RequestDetail(
                            3,
                            "asuncion",
                            "creacion",
                            "Creación",
                            "Solicitud de semáforo en intersección",
                            "pendiente",
                            LocalDate.of(2025, 4, 8),
                            OffsetDateTime.of(2025, 4, 8, 16, 45, 0, 0, ZoneOffset.ofHours(-4)),
                            "Cruce Itá Ybaté y Mcal. López",
                            List.of("https://cdn.pixabay.com/photo/2017/08/01/11/48/blue-2564660_1280.jpg"),
                            null
                    ),
                    new RequestDetail(
                            4,
                            "asuncion",
                            "alerta",
                            "Alerta",
                            "Árbol a punto de caer",
                            "completado",
                            LocalDate.of(2025, 4, 7),
                            OffsetDateTime.of(2025, 4, 9, 11, 5, 0, 0, ZoneOffset.ofHours(-4)),
                            "Plaza Uruguaya",
                            List.of("https://cdn.pixabay.com/photo/2015/07/05/13/44/beach-832346_1280.jpg"),
                            "Se retiró el árbol y se aseguró el perímetro."
                    )
            ),
            "ciudad_del_este", List.of(
                    new RequestDetail(
                            5,
                            "ciudad_del_este",
                            "alerta",
                            "Alerta",
                            "Cordón de seguridad dañado",
                            "pendiente",
                            LocalDate.of(2025, 4, 6),
                            OffsetDateTime.of(2025, 4, 6, 10, 0, 0, 0, ZoneOffset.ofHours(-4)),
                            "Costanera de Ciudad del Este",
                            List.of(),
                            null
                    ),
                    new RequestDetail(
                            6,
                            "ciudad_del_este",
                            "reparacion",
                            "Reparación",
                            "Semáforo intermitente",
                            "en-progreso",
                            LocalDate.of(2025, 4, 5),
                            OffsetDateTime.of(2025, 4, 7, 15, 20, 0, 0, ZoneOffset.ofHours(-4)),
                            "Avenida Monseñor Rodríguez",
                            List.of(),
                            "Equipo técnico asignado, espera de repuestos"
                    )
            ),
            "encarnacion", List.of(
                    new RequestDetail(
                            7,
                            "encarnacion",
                            "mantenimiento",
                            "Mantenimiento",
                            "Limpieza de plaza central",
                            "completado",
                            LocalDate.of(2025, 3, 30),
                            OffsetDateTime.of(2025, 4, 2, 8, 45, 0, 0, ZoneOffset.ofHours(-4)),
                            "Plaza de Armas",
                            List.of(),
                            "Jornada de limpieza completada con apoyo de voluntarios"
                    )
            )
    );

    private final List<UserAccount> users = List.of(
            new UserAccount(1, "Juan Pérez", "juan@example.com", "citizen", null),
            new UserAccount(2, "María González", "maria@example.com", "municipal", "asuncion"),
            new UserAccount(3, "Admin User", "admin@example.com", "admin", null)
    );

    private final AdminSummary adminSummary = new AdminSummary(325, 18, 0.76, 3.2);

    public List<MunicipalitySummary> findMunicipalities() {
        return municipalities;
    }

    public Optional<MunicipalitySummary> findMunicipalityById(String id) {
        return municipalities.stream()
                .filter(municipality -> municipality.id().equals(id))
                .findFirst();
    }

    public List<RequestDetail> findRequestsByMunicipality(String municipalityId) {
        return requestsByMunicipality.getOrDefault(municipalityId, List.of());
    }

    public Optional<RequestDetail> findRequestById(long requestId) {
        return requestsByMunicipality.values().stream()
                .flatMap(List::stream)
                .filter(request -> request.id() == requestId)
                .findFirst();
    }

    public List<UserAccount> findUsers() {
        return users;
    }

    public AdminSummary getAdminSummary() {
        return adminSummary;
    }
}
