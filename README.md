# MunicipaLink

Proyecto ideado para conectar más a la comunidad con su municipalidad.

## Estructura del proyecto

```
backend/
├── pom.xml
└── src/
    ├── main/
    │   ├── java/com/municipalink/backend/
    │   │   ├── controller/
    │   │   ├── model/
    │   │   └── service/
    │   └── resources/
    └── test/
public/
├── assets/
│   ├── css/
│   │   └── app.css
│   └── js/
│       └── app.js
└── index.html
```

- **public/index.html** contiene el marcado principal de la aplicación.
- **public/assets/css/app.css** agrupa los estilos personalizados.
- **public/assets/js/app.js** mantiene la lógica de interacción del prototipo.
- **backend/** aloja una API de Spring Boot con datos simulados para el prototipo.

## API simulada con Spring Boot

La carpeta `backend` incluye un servicio REST construido con Spring Boot que expone endpoints en `/api`.
Los datos retornados son JSON generados desde un repositorio en memoria (`MockDataRepository`) que emula respuestas de una base de datos.

### Ejecución

Desde la carpeta `backend` ejecuta:

```bash
mvn spring-boot:run
```

El servicio quedará disponible en <http://localhost:8080> con los siguientes endpoints de ejemplo:

- `GET /api/municipalities` — Resumen de municipalidades y métricas.
- `GET /api/municipalities/{id}/requests` — Solicitudes asociadas a una municipalidad.
- `GET /api/requests/{id}` — Detalle de una solicitud específica.
- `GET /api/admin/summary` — Indicadores generales para el panel administrativo.
- `GET /api/admin/users` — Listado de usuarios registrados en el sistema.

## Visualización del frontend

Dentro de la carpeta `public` se incluye un pequeño servidor HTTP sin dependencias externas para facilitar las pruebas en entornos
sin acceso a npm. Para levantar la interfaz ejecuta:

```bash
node public/server.js
```

El servidor escuchará en <http://localhost:3000> y entregará automáticamente `index.html` para cualquier ruta desconocida, lo que
permite navegar por la aplicación sin errores 404.
