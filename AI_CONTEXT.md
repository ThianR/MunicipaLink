# MunicipaLink - AI Context & Project Overview

Este documento proporciona el contexto necesario para que cualquier Agente de IA pueda comprender, navegar y contribuir al proyecto MunicipaLink de manera consistente.

## Propósito del Proyecto
MunicipaLink es una plataforma de participación ciudadana que permite a los ciudadanos reportar incidencias (baches, luminarias, basura, etc.) en sus municipalidades, realizar seguimientos y fomentar la transparencia gubernamental a través de un sistema de gamificación (XP, niveles, rangos).

### Para Administradores
-   **Panel de Administración**: Ubicado en `/admin` (simulado por vista), permite gestionar usuarios (edición, baneo), municipalidades, departamentos y **solicitudes de rol municipal**.
-   **Motor de Base de Datos**: Estructura SQL consolidada e idempotente en `/sql` (archivos 00-07).

### Nuevas Funcionalidades Clave
1. **Panel Admin de Control**: Gestión integral de usuarios (baneo, edición, reset de password) y municipalidades.
2. **Gamificación Inteligente**: Sistema de XP, niveles y rangos que recompensa la participación activa.

## Stack Tecnológico
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6 Modules).
- **Backend / DB**: Supabase (PostgreSQL + PostGIS).
- **Mapas**: Leaflet.js (OpenStreetMap).
- **Iconos**: Lucide Icons.
- **Utilidades**: Compresión de imágenes, Logger personalizado.

## Arquitectura de Archivos
El proyecto sigue una estructura modular para facilitar el mantenimiento:

```text
├── index.html          # Punto de entrada único (Single Page App style)
├── main.js             # Inicialización de la aplicación y orquestación
├── sql/                # Engine SQL consolidado (00_config.sql a 06_semillas.sql)
├── src/
│   ├── modules/        # Lógica de negocio (auth, reports, map, profile, ui)
│   ├── services/       # Clientes externos (supabase)
│   └── utils/          # Utilidades (helpers, logger, ui)
└── styles/             # CSS Modularizado (Metodología BEM)
    ├── base/           # Variables, Reset, Tipografía
    ├── components/     # Botones, Cards, Modales, Gamificación
    ├── layout/         # Estructura del Layout (Header, Sidebar, Navigation)
    ├── views/          # Estilos específicos de cada vista (Map, Reports, etc.)
    └── utilities/      # Helpers y clases de utilidad
```

## Flujos Principales & Comunicación
- **Módulos**: Cada archivo en `src/modules/` exporta un objeto con un método `init()`.
- **Eventos**: Los módulos se comunican principalmente a través de Eventos Personalizados de JavaScript:
    - `auth:login`, `auth:logout`, `auth:guest`: Cambios de estado de usuario.
    - `ui:view-changed`, `ui:tab-changed`: Cambios en la interfaz.
    - `muni:changed`: Sincronización de municipalidad seleccionada.
- **Vistas**: Las "páginas" son `div` con la clase `.view` dentro de `index.html`. `UIModule.changeView(name)` gestiona la visibilidad.

## Guía para el Agente IA (REGLAS DE ORO)
1. **No Duplicar**: Antes de crear una función, consulta `TECHNICAL_REFERENCE.md`.
2. **Estandar BEM**: El CSS **DEBE** seguir fielmente la convención `Bloque__Elemento--Modificador`.
3. **Estilos Modulares**: No agregues estilos a `style.css` (está en desuso). Usa el archivo correspondiente en `/styles`.
4. **Modularidad JS**: Mantén la lógica dentro del módulo correspondiente. No pongas lógica de mapas en `reports.js`.
5. **Database First**: Muchas validaciones y cálculos (XP, búsqueda, prioridad) ocurren en Supabase vía Vistas o Funciones RPC. Consulta `sql/`.
6. **Logs**: Usa `Logger.info`, `Logger.warn`, `Logger.error` para trazabilidad.
7. **Aesthetics**: El diseño es premium. Respeta las variables de color en `styles/base/variables.css` y el uso de Lucide icons.

---
*Este documento debe ser la primera lectura para cualquier agente que se incorpore al desarrollo del proyecto.*
