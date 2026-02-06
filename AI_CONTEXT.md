# MunicipaLink - AI Context & Project Overview

Este documento proporciona el contexto necesario para que cualquier Agente de IA pueda comprender, navegar y contribuir al proyecto MunicipaLink de manera consistente.

## Propósito del Proyecto
MunicipaLink es una plataforma de participación ciudadana que permite a los ciudadanos reportar incidencias (baches, luminarias, basura, etc.) en sus municipalidades, realizar seguimientos y fomentar la transparencia gubernamental a través de un sistema de gamificación (XP, niveles, rangos).

## Stack Tecnológico
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6 Modules).
- **Backend / DB**: Supabase (PostgreSQL + PostGIS).
- **Mapas**: Leaflet.js (OpenStreetMap).
- **Iconos**: Lucide Icons.
- **Utilidades**: Compresión de imágenes, Logger personalizado.

## Arquitectura de Archivos
El proyecto sigue una estructura modular para facilitar el mantenimiento:

```text
/
├── index.html          # Punto de entrada único (Single Page App style)
├── style.css           # Estilos globales y específicos de vistas
├── main.js             # Inicialización de la aplicación y orquestación
├── sql/                # Scripts de base de datos, vistas y funciones RPC
├── src/
│   ├── config.js       # Configuraciones globales (Supabase, Coordenadas default)
│   ├── services/
│   │   └── supabase.js # Cliente de Supabase configurado
│   ├── modules/        # Lógica de negocio por dominio
│   │   ├── auth.js     # Gestión de sesión (Login, Registro, Invitado)
│   │   ├── map.js      # Integración con Leaflet y geolocalización
│   │   ├── reports.js  # Gestión de reportes, comentarios e interacciones
│   │   ├── profile.js  # Perfil de usuario, gamificación y seguidores
│   │   ├── ui.js       # Navegación entre vistas y tabs
│   │   └── municipalities.js # Gestión de selectores y datos municipales
│   └── utils/          # Utilidades compartidas
│       ├── helpers.js  # Compresión de imágenes y formatos
│       ├── logger.js   # Sistema de logs con timestamp y niveles
│       └── ui.js       # Manipulaciones comunes del DOM y toasts
```

## Flujos Principales & Comunicación
- **Módulos**: Cada archivo en `src/modules/` exporta un objeto con un método `init()`.
- **Eventos**: Los módulos se comunican principalmente a través de Eventos Personalizados de JavaScript:
    - `auth:login`, `auth:logout`, `auth:guest`: Cambios de estado de usuario.
    - `ui:view-changed`, `ui:tab-changed`: Cambios en la interfaz.
    - `muni:changed`: Sincronización de municipalidad seleccionada.
- **Vistas**: Las "páginas" son `div` con la clase `.view` dentro de `index.html`. `UIModule.changeView(name)` gestiona la visibilidad.

## Guía para el Agente IA
1. **No Duplicar**: Antes de crear una función, consulta `TECHNICAL_REFERENCE.md`.
2. **Modularidad**: Mantén la lógica dentro del módulo correspondiente. No pongas lógica de mapas en `reports.js`.
3. **Database First**: Muchas validaciones y cálculos (XP, búsqueda, prioridad) ocurren en Supabase vía Vistas o Funciones RPC. Consulta `sql/`.
4. **Logs**: Usa `Logger.info`, `Logger.warn`, `Logger.error` para trazabilidad.
5. **Aesthetics**: El diseño es premium. Respeta las variables de color en `style.css` y el uso de Lucide icons.

---
*Este documento debe ser la primera lectura para cualquier agente que se incorpore al desarrollo del proyecto.*
