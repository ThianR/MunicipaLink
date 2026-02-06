# TECHNICAL_REFERENCE - Catálogo de Funciones de MunicipaLink

Este documento es la fuente de verdad técnica del proyecto. Detalla cada función, sus parámetros, validaciones y comportamiento esperado para evitar la duplicación de código y errores de sobreescritura.

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
| `abrirDetalleReporte(id)` | `id` (String) | Cambia a la vista de detalle y carga datos del reporte. | Inicializa Leaflet y llama a `cargarInteracciones(id)`. |
| `cargarInteracciones(id)` | `id` (String) | Obtiene conteos de votos y aplica clase `.active` (verde) si el usuario actual ya interactuó. | Gestiona estados de `thumbs-up`, `thumbs-down` y `eye`. |
| `interactuar(tipo)` | `tipo` (String) | Gestiona Votos (+/-) y Seguir reporte. Refresca UI inmediatamente. | **Validación:** Requiere Login. Es tipo toggle. |
| `verPerfilCiudadano(e, uid, name, avatar)` | Varios | Abre un modal con el resumen del perfil de un vecino. | Aplica restricciones de privacidad (campos ocultos). |

---

## 3. ProfileModule (`src/modules/profile.js`)
Gestión de identidad extendida y gamificación.

| Función | Parámetros | Descripción | Validaciones / Notas |
| :--- | :--- | :--- | :--- |
| `init()` | Ninguno | Configura listeners de perfil y eventos de auth. | Limpia UI al cerrar sesión. |
| `cargarPerfil(userId?)` | `userId` (opcional) | Carga los datos del perfil en el formulario y stats. | Si no es el perfil propio, oculta elementos con clase `.private-field`. |
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
| `changeTab(name)` | `name` (String) | Cambia entre 'all-requests' y 'my-requests'. | Dispara `ui:tab-changed`. |
| `getCurrentView()` | Ninguno | Retorna el nombre de la vista activa. | Útil para recargas condicionales. |

---

## 6. Utilidades e Infraestructura

### `src/utils/ui.js`
- `mostrarMensaje(msg, tipo)`: Toast notifications (success, error, info).
- `abrirLightbox(url)`: Modal para ver evidencias/imágenes a tamaño completo.
- `aplicarRol(rol)`: Cambia clases en el `body` para ocultar/mostrar elementos por CSS.

### `src/utils/helpers.js`
- `comprimirImagen(file)`: Retorna Promise con el archivo comprimido (70% calidad, máx 1280px).

### Clases CSS Especiales (`style.css`)
- `.btn-orange`: Botón de acción destacado en color naranja (#f97316).
- `.private-field`: Contenedores que se ocultan automáticamente en perfiles ajenos.
- `.active` (en interacciones): Iconos que se tornan verdes (#10b981) para indicar interacción del usuario actual.

---
*Fin del Catálogo Técnico.*
