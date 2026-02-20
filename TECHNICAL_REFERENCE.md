# TECHNICAL_REFERENCE - Catálogo de Funciones de MunicipaLink

Este documento es la fuente de verdad técnica del proyecto. Detalla cada función, sus parámetros, validaciones y comportamiento esperado para evitar la duplicación de código y errores de sobreescritura.

-   **Gestión de Solicitudes de Rol**: Los ciudadanos pueden solicitar el rol `municipal` adjuntando documentación. Los admins aprueban/rechazan desde el panel.
-   **Panel Administrativo Centralizado**: Gestión de usuarios, municipalidades, departamentos y solicitudes de rol con diseño premium.
-   **Consolidación SQL**: Motor de base de datos optimizado e idempotente (scripts 00 a 09).

## [REGLA DE ORO]
> [!IMPORTANT]
> **Antes de implementar una nueva función:** Verifica si ya existe en este catálogo. Si modificas una función existente, **actualiza este documento** inmediatamente.

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
Lógica central de reportes, comentarios y votos.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Configura listeners de filtros, búsqueda y eventos UI. | Orquesta la recarga de reportes al cambiar de vista. |
| `reloadReports()` | Ninguno | Recarga los reportes aplicando filtros y orden actual. | Detecta automáticamente qué pestaña está activa. |
| `aplicarOrdenamiento(query)` | `query` (Supabase) | Aplica orden por fecha o relevancia a la consulta. | El orden 'impact' usa `relevancia_relativa` (estrellas) como criterio principal. |
| `enviarReporte(event)` | `event` (Submit) | Procesa el formulario de nuevo reporte y sube evidencias. | **Validaciones:** Requiere Login y Municipalidad seleccionada. Comprime imágenes. |
| `renderizarReportes(data, id)` | `data` (Array), `id` (String) | Genera el HTML de las tarjetas de reporte en el contenedor. | Utiliza `renderStars` y datos de la vista `reportes_final_v1`. |
| `renderStars(relevance, score)` | `relevance` (0-1), `score` (Number) | Retorna el HTML de estrellas (1-5) según impacto relativo. | Prioriza `relevancia_relativa` (PERCENT_RANK). Fallback a score absoluto. |
| `abrirDetalleReporte(id)` | `id` (String) | Cambia a la vista de detalle y carga datos del reporte. | Inicializa Leaflet, `renderTimeline` y `cargarEvidenciasCierre`. |
| `renderTimeline(reporte)` | `reporte` (Object) | Genera la línea de tiempo visual (Creación → Asignación → Resolución). | Calcula tiempos transcurridos entre hitos de tiempo. |
| `cargarEvidenciasCierre(id, e, obs)` | `id, estado, obs` | Muestra fotos de resolución/rechazo y observaciones del funcionario. | Solo se activa si el estado es final. |
| `interactuar(tipo)` | `tipo` (String) | Gestiona Votos (+/-) y Seguir reporte. Refresca UI inmediatamente. | **Validación:** Requiere Login. Es tipo toggle. |
| `verPerfilCiudadano(e, uid, name, avatar)` | Varios | Navega a la vista de perfil del ciudadano y carga sus datos. | Redirige a UIModule.changeView('profile') y emite `profile:load-user`. |

---

## 3. ProfileModule (`src/modules/profile.js`)
Gestión de identidad extendida y gamificación.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Configura listeners de perfil y eventos de auth. | Limpia UI al cerrar sesión. |
| `cargarPerfil(userId?)` | `userId` (opcional) | Carga los datos del perfil en el formulario y stats. | Si no es el perfil propio, oculta elementos con clase `.private-field`. |
| `enviarSolicitudMunicipal()` | Ninguno | Procesa y envía solicitudes de rol `municipal` con adjuntos. | Requiere login. Adjunta documento de identidad. |
| `guardarPerfil(event)` | `event` (Submit) | Actualiza datos en tabla `perfiles` y sube nuevo avatar. | **Validación:** Solo para el usuario dueño del perfil. |
| `actualizarTrustMeter(perfil)`| `perfil` (Object) | Calcula el % de completitud del perfil (1.0x a 2.0x). | Basado en 7 campos clave (alias, contacto, etc). |
| `cargarEstadisticasGamificacion(uid, isMe)` | `uid` (String), `isMe` (Bool) | Llama a RPC para traer XP, Rango, Nivel e insignias. | Retorna el objeto de estadísticas completo. |

---

## 4. MapModule (`src/modules/map.js`)
Integración con mapas geográficos.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Inicializa Leaflet, marcador y escucha `muni:changed`. | Llama a `detectarUbicacion` al inicio. |
| `centrarEnMunicipalidad(id)` | `id` (String) | Mueve el mapa al centro de la municipalidad. | Parsea coordenadas desde JSON o WKT (POINT). |
| `detectarUbicacion(forzar)` | `forzar` (Bool) | Usa Geo-API del navegador para posicionar al usuario. | Busca la muni más cercana automáticamente. |

---

## 5. UIModule (`src/modules/ui.js`)
Orquestador de navegación y estado visual.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `changeView(name)` | `name` (String) | Cambia entre 'map', 'reports', 'profile', etc. | Dispara `ui:view-changed`. Guarda estado en `localStorage`. |
| `changeTab(name)` | `name` (String) | Cambia entre 'all-requests', 'my-requests', o pestañas de admin. | Dispara `ui:tab-changed`. |
| `getCurrentView()` | Ninguno | Retorna el nombre de la vista activa. | Útil para recargas condicionales. |

---

## 6. AdminModule (`src/modules/admin.js`)
Gestión centralizada para administradores.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Inicializa listeners de búsqueda, pestañas y modales admin. | Solo se carga si el usuario tiene rol `admin`. |
| `cargarUsuarios()` | Ninguno | Lista usuarios en la tabla premium con filtros de búsqueda. | Obtiene datos de la vista `v_admin_usuarios`. |
| `cargarSolicitudesRol()` | Ninguno | Obtiene y renderiza la lista de solicitudes de rol municipal. | Filtra por estado y utiliza la tabla `solicitudes_municipales`. |
| `gestionarSolicitudRol(id, estado, msj)` | `id`, `estado`, `msj` | Aprueba o rechaza una solicitud de rol. | **Nota:** Dispara trigger SQL para cambiar rol en `perfiles`. |
| `guardarUsuario()` | Ninguno | Actualiza datos (rol, nivel, alias) y estado `activo` (baneo). | Requiere rol `admin`. |
| `enviarResetPassword()` | Ninguno | Dispara el flujo de recuperación de Supabase para un usuario. | Utiliza `auth.resetPasswordForEmail`. |
| `cambiarPestanaAdmin(id)` | `id` (String) | Cambia entre Dashboard, Municipalidades y Usuarios. | Gestiona clases `.active` en paneles. |
| `exportarReportesCSV()` | Ninguno | Descarga el listado filtrado actual en formato CSV. | Pendiente de implementación (ver Roadmap). |

---

## 7. MunicipalModule (`src/modules/municipal.js`)
Gestión de incidencias para funcionarios municipales.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Inicializa el panel, carga departamentos y reportes de la muni asignada. | Requiere que el usuario tenga un `municipalidad_id` en su perfil. |
| `cargarReportes(filtros)` | `filtros` (Object) | Obtiene reportes filtrados por estado y prioridad. | Usa join explícito a `departamentos!departamento_id`. |
| `abrirDetalleGestion(id)` | `id` (String) | Abre el modal premium para gestionar una solicitud específica. | Siempre re-fetcha datos (sin caché) para garantizar frescura. |
| `renderDepartamentosCheckboxes(asignados, estado)` | `asignados, estado` | Renderiza la lista filtrable de departamentos. | Bloquea (lock) los ya asignados para evitar edición de historial. |
| `guardarGestion()` | Ninguno | Aplica cambios de prioridad, estado y asignación de departamentos. | **Validación:** Requiere evidencias si el estado es final. |
| `subirEvidenciasCierre()` | Ninguno | Sube fotos al bucket y registra en `evidencias_cierre`. | Comprime antes de subir. |

---

---

## 6. Utilidades e Infraestructura

### `src/utils/ui.js`
- `mostrarMensaje(msg, tipo)`: Toast notifications (success, error, info).
- `abrirLightbox(url)`: Modal para ver evidencias/imágenes a tamaño completo.
- `aplicarRol(rol)`: Cambia clases en el `body` para ocultar/mostrar elementos por CSS. Útil para habilitar el botón de Panel Admin.

### `src/utils/helpers.js`
- `comprimirImagen(file)`: Retorna Promise con el archivo comprimido (70% calidad, máx 1280px).
- `formatFecha(isoString)`: Formatea fechas a LocalDateString (es-ES).
- `parseUbicacion(ubicacion)`: Convierte formatos PostGIS (Hex/WKT) o GeoJSON a `{lat, lng}`. (Consolidado en `municipal.js` temporalmente).

### 🎨 Arquitectura de Estilos (`/styles`)
El proyecto ha migrado de un archivo único a un sistema modular basado en **BEM**:

- **Variables (`base/variables.css`)**: Centraliza colores (`--primary`, `--warning`), sombras y espaciados.
- **Componentes (`components/`)**:
    - `buttons.css`: Estilos de botones con estados `.active`.
    - `cards.css`: Tarjetas de reportes y sus elementos BEM.
    - `gamification.css`: Estilos de niveles, XP y el nuevo perfil de ciudadano circular.
- **Vistas (`views/`)**: Estilos específicos para cada sección de la app (Mapa, Reportes, Perfil).

### 🗄️ Estructura SQL (`/sql`)
El motor de base de datos está organizado de forma secuencial e idempotente:

- **`00_config.sql`**: Extensiones y secuencias.
- **`01_tablas.sql`**: Definición de todas las tablas y sus relaciones.
- **`02_vistas.sql`**: Vista maestra `reportes_final_v1` con cálculos de impacto.
- **`03_seguridad.sql`**: Políticas RLS unificadas (RBAC incluido).
- **`04_funciones.sql`**: Triggers y lógica RPC (gamificación, solicitudes).
- **`05_permisos.sql`**: Grants base para roles de red.
- **`06_semillas.sql`**: Datos maestros (categorías iniciales).
- **`07_solicitudes_rol.sql`**: Sistema de gestión de solicitudes de rol municipal.
- **`08_vistas_admin.sql`**: Vista `v_admin_usuarios` con cálculos de gamificación para el panel.
- **`09_gestion_municipal.sql`**: Migración consolidada: Gestión avanzada, Multi-departamento, RLS y Triggers.

---
*Fin del Catálogo Técnico.*
