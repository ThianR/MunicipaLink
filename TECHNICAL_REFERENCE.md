# TECHNICAL_REFERENCE - Catálogo de Funciones de MunicipaLink

Este documento es la fuente de verdad técnica del proyecto. Detalla cada función, sus parámetros, validaciones y comportamiento esperado para evitar la duplicación de código y errores de sobreescritura.

-   **Gestión de Solicitudes de Rol**: Los ciudadanos pueden solicitar el rol `municipal` adjuntando documentación. Los admins aprueban/rechazan desde el panel.
-   **Panel Administrativo Centralizado**: Gestión de usuarios, municipalidades, departamentos y solicitudes de rol con diseño premium.
-   **Consolidación SQL**: Motor de base de datos optimizado e idempotente (scripts 00 a 09).

## [REGLA DE ORO]
> [!IMPORTANT]
> **Antes de implementar una nueva función:** Verifica si ya existe en este catálogo. Si modificas una función existente, **actualiza este documento** inmediatamente.
> **Seguridad:** *Siempre* usa `escapeHtml` al inyectar contenido dinámico en el DOM y `confirmarAccion` para flujos críticos.

---

## 1. AuthModule (`src/modules/auth.js`)
Gestiona el estado de autenticación y la identidad del usuario.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Inicializa listeners y verifica sesión inicial. | Configura `onAuthStateChange` de Supabase. |
| `getUsuarioActual()` | Ninguno | Retorna el objeto `user` de Supabase o `null`. | Fuente de verdad para el ID del usuario en otros módulos. |
| `isGuest()` | Ninguno | Retorna `true` si no hay usuario logueado. | Útil para deshabilitar botones de interacción. |
| `manejarAuthUsuario(user)` | `user` (Object) | Procesa el login exitoso, carga el rol y cambia de pantalla. | Dispara el evento `auth:login`. |
| `manejarLoginInvitado()` | Ninguno | Activa el modo invitado con rol `guest`. | Dispara el evento `auth:guest`. |
| `actualizarPassword(pwd)` | `pwd` (String) | Actualiza la contraseña del usuario actual. | Requiere sesión activa o token de recovery. |

---

## 2. ReportsModule (`src/modules/reports.js`)
Lógica central de reportes, comentarios y votos. Utiliza `ReportsService` para acceso a datos.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Configura listeners, filtros e Infinite Scroll. | Implementa IntersectionObserver para carga paginada. |
| `reloadReports()` | Ninguno | Reinicia la paginación y recarga la lista. | Limpia el contenedor antes de cargar la página 0. |
| `loadNextPage()` | Ninguno | Carga el siguiente lote de reportes vía `ReportsService`. | Gestiona flags `isLoadingMore` y `hasMoreReports`. |
| `enviarReporte(event)` | `event` (Submit) | Procesa el formulario y sube evidencias. | Delega la creación a `ReportsService.createReporte`. |
| `renderizarReportes(data, id)` | `data`, `id` | Genera HTML usando `createReportCard` (Template). | **Seguridad:** Usa templates clonados, no strings HTML. |
| `abrirDetalleReporte(id)` | `id` (String) | Cambia a la vista de detalle y carga datos del reporte. | Inicializa Leaflet, `renderTimeline` y `cargarEvidenciasCierre`. |
| `renderTimeline(reporte)` | `reporte` (Object) | Genera la línea de tiempo visual. | Calcula tiempos transcurridos entre hitos. |
| `interactuar(tipo)` | `tipo` (String) | Gestiona Votos (+/-) y Seguir reporte. | **Validación:** Requiere Login. Es tipo toggle. |

---

## 3. ProfileModule (`src/modules/profile.js`)
Gestión de identidad extendida y gamificación.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Configura listeners de perfil y eventos de auth. | Limpia UI al cerrar sesión. |
| `cargarPerfil(userId?)` | `userId` (opcional) | Carga los datos del perfil en el formulario y stats. | Usa `escapeHtml` para renderizar datos de usuario. |
| `enviarSolicitudMunicipal()` | Ninguno | Procesa y envía solicitudes de rol `municipal` con adjuntos. | Requiere login. Adjunta documento de identidad. |
| `guardarPerfil(event)` | `event` (Submit) | Actualiza datos en tabla `perfiles` y sube nuevo avatar. | **Validación:** Solo para el usuario dueño del perfil. |
| `actualizarTrustMeter(perfil)`| `perfil` (Object) | Calcula el % de completitud del perfil (1.0x a 2.0x). | Basado en 7 campos clave (alias, contacto, etc). |
| `cargarEstadisticasGamificacion(uid, isMe)` | `uid`, `isMe` | Llama a RPC para traer XP, Rango, Nivel e insignias. | Retorna el objeto de estadísticas completo. |

---

## 4. MapModule (`src/modules/map.js`)
Integración con mapas geográficos.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Inicializa Leaflet (Lazy Loading), marcador y escucha eventos. | Llama a `detectarUbicacion` al inicio. |
| `centrarEnMunicipalidad(id)` | `id` (String) | Mueve el mapa al centro de la municipalidad. | Parsea coordenadas desde JSON o WKT (POINT). |
| `detectarUbicacion(forzar)` | `forzar` (Bool) | Usa Geo-API del navegador para posicionar al usuario. | Busca la muni más cercana automáticamente. |

---

## 5. UIModule (`src/modules/ui.js`)
Orquestador de navegación y estado visual.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `changeView(name)` | `name` (String) | Cambia entre 'map', 'reports', 'profile', etc. | Dispara `ui:view-changed`. Guarda estado en `localStorage`. |
| `changeTab(name)` | `name` (String) | Cambia entre 'all-requests', 'my-requests', o pestañas admin. | Dispara `ui:tab-changed`. |
| `getCurrentView()` | Ninguno | Retorna el nombre de la vista activa. | Útil para recargas condicionales. |

---

## 6. AdminModule (`src/modules/admin.js`)
Gestión centralizada para administradores.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Inicializa listeners y modales admin. | Solo se carga si el usuario tiene rol `admin`. |
| `cargarUsuarios()` | Ninguno | Lista usuarios usando `TableRenderer`. | Obtiene datos de la vista `v_admin_usuarios`. |
| `cargarSolicitudesRol()` | Ninguno | Renderiza solicitudes usando `TableRenderer`. | Filtra por estado y utiliza `solicitudes_municipales`. |
| `gestionarSolicitudRol(id, est, com, skip)` | `id, est, com, skip` | Aprueba o rechaza solicitud. | `skipConfirmation` permite saltar el modal si ya se validó. |
| `guardarUsuario()` | Ninguno | Actualiza datos y estado (baneo). | Requiere rol `admin`. |
| `enviarResetPassword()` | Ninguno | Dispara recuperación de contraseña. | Utiliza `auth.resetPasswordForEmail`. |

---

## 7. MunicipalModule (`src/modules/municipal.js`)
Gestión de incidencias para funcionarios municipales.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Inicializa panel y carga datos. | Requiere `municipalidad_id` en perfil. |
| `cargarReportes(filtros)` | `filtros` (Object) | Obtiene reportes filtrados. | Usa `TableRenderer` para estados de carga. |
| `abrirDetalleGestion(id)` | `id` (String) | Abre modal premium. | Renderiza con `escapeHtml`. |
| `renderDepartamentosCheckboxes(asignados, estado)` | `asignados, estado` | Lista departamentos filtrables. | Bloquea los ya asignados. |
| `guardarGestion()` | Ninguno | Aplica cambios de prioridad/estado. | **Validación:** Requiere evidencias si es final. |

---

## 8. Servicios y Utilidades (NUEVO)

### `src/services/ReportsService.js` (Data Access Layer)
- `getReportes({muniId, estado, search, sort, page, pageSize, userId})`: Obtiene lista paginada.
- `getReporteById(id)`: Obtiene un reporte único.
- `createReporte(payload)`: Inserta un nuevo reporte.
- `uploadEvidencias(reporteId, userId, archivos)`: Sube imágenes al Storage.

### `src/components/ReportCard.js`
- `createReportCard(data)`: Crea un elemento DOM clonando `#tpl-report-card`. *Reemplaza la concatenación de strings.*

### `src/utils/ui.js`
- `mostrarMensaje(msg, tipo)`: Toast notifications.
- `confirmarAccion(mensaje, titulo)`: **Nuevo**. Muestra un modal de confirmación (Promise-based). Reemplaza `window.confirm`.
- `TableRenderer`: **Nuevo**. Utilidad para renderizar filas de estado en tablas (`showLoading`, `showError`, `showEmpty`).
- `abrirLightbox(url)`: Modal para ver evidencias.

### `src/utils/helpers.js`
- `escapeHtml(str)`: **Crítico**. Sanitiza strings para prevenir XSS.
- `comprimirImagen(file)`: Optimización de imágenes.
- `parseUbicacion(ubicacion)`: Parsea WKT/GeoJSON a `{lat, lng}`.

---
*Fin del Catálogo Técnico.*
