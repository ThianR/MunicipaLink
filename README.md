# 🏛️ MunicipaLink

**Plataforma de Participación Ciudadana para la Transparencia Municipal**

MunicipaLink es una aplicación web que empodera a los ciudadanos para reportar incidencias urbanas (baches, luminarias rotas, basura, etc.), realizar seguimientos en tiempo real y fomentar la transparencia gubernamental a través de un sistema de gamificación que recompensa la participación activa.

---

## ✨ Características Principales

### 🗺️ Reportes Georreferenciados
- **Mapa Interactivo**: Visualiza y crea reportes directamente en el mapa usando Leaflet.js y OpenStreetMap
- **Geolocalización Automática**: Detecta tu ubicación y la municipalidad más cercana
- **Evidencias Fotográficas**: Adjunta imágenes comprimidas automáticamente para optimizar el almacenamiento
- **Categorización**: Clasifica incidencias por tipo (infraestructura, servicios, seguridad, etc.)

### 🎮 Gamificación y Engagement
- **Sistema de XP**: Gana puntos de experiencia por reportar, comentar y votar
- **Niveles y Rangos**: Progresa desde "Vecino Observador" hasta "Líder Comunitario"
- **Trust Meter**: Indicador de confiabilidad basado en la completitud del perfil (1.0x - 2.0x multiplicador)
- **Insignias**: Desbloquea logros por hitos de participación

### 👥 Interacción Social
- **Sistema de Votos**: Apoya o rechaza reportes para medir su relevancia
- **Comentarios**: Discute y colabora en la resolución de incidencias
- **Seguimiento de Reportes**: Recibe notificaciones sobre reportes que te interesan
- **Perfiles Públicos**: Visualiza la reputación y contribuciones de otros ciudadanos

### 🛠️ Administración y Control (Nuevo)
- **Gestión de Usuarios**: Listado premium, edición de datos, baneo lógico y reset de contraseña.
- **Control Municipal**: Administración de municipalidades y departamentos.
- **Dashboard**: Estadísticas en tiempo real de la plataforma.

### 📊 Transparencia y Análisis
- **Ranking de Impacto**: Los reportes se ordenan por relevancia relativa usando `PERCENT_RANK`
- **Filtros Avanzados**: Por estado, categoría, fecha y municipalidad
- **Estadísticas Personales**: Visualiza tu impacto en la comunidad
- **Privacidad Configurable**: Controla qué información de tu perfil es pública

---

## 🛠️ Stack Tecnológico

### Frontend
- **HTML5 + CSS3**: Interfaz moderna con diseño premium y glassmorphism
- **JavaScript (ES6 Modules)**: Arquitectura modular sin frameworks pesados
- **Leaflet.js**: Mapas interactivos con OpenStreetMap
- **Lucide Icons**: Sistema de iconografía consistente

### Backend y Servicios
- **Supabase**: Backend-as-a-Service con PostgreSQL + PostGIS
- **Autenticación**: Sistema de usuarios con roles (admin, user, guest)
- **Storage**: Almacenamiento de evidencias fotográficas
- **RPC Functions**: Lógica de negocio en el servidor (cálculo de XP, gamificación)

### Herramientas
- **Compresión de Imágenes**: Optimización automática al 70% de calidad
- **Logger Personalizado**: Sistema de trazabilidad con niveles (info, warn, error)
- **Eventos Personalizados**: Comunicación entre módulos sin acoplamiento

---

## 📁 Arquitectura del Proyecto

```
MunicipaLink/
├── index.html              # Punto de entrada (Single Page App)
├── main.js                 # Inicialización y orquestación
├── styles/                 # Sistema de diseño CSS (Metodología BEM)
├── sql/                    # Scripts de base de datos (vistas, funciones)
│   ├── vistas/             # Vistas SQL (reportes_final_v1, etc.)
│   └── funciones/          # Funciones RPC (calcular_xp, gamificacion)
├── src/                    # Lógica de negocio modularizada
│   ├── modules/            # auth, map, reports, profile, ui, municipalities
│   ├── services/           # Cliente Supabase
│   └── utils/              # helpers, logger, ui (toasts)
├── tests/                  # Pruebas unitarias y de integración
├── AI_CONTEXT.md           # Contexto para agentes de IA
├── ABOUT.md                # Resumen ejecutivo
└── TECHNICAL_REFERENCE.md  # Catálogo técnico y estándares
```

---

## 🚀 Instalación y Configuración

### Prerrequisitos
- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Cuenta de Supabase (gratuita)
- Servidor web local (opcional: Live Server, http-server, etc.)

### Configuración Rápida

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/municipalink.git
   cd municipalink
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Edita `.env` con tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anonima
   ```

3. **Configurar la base de datos**
   - Accede al panel de Supabase
    - Ejecuta los archivos en `sql/` en orden correlativo (00_config.sql hasta 06_semillas.sql).

4. **Iniciar el servidor local**
   ```bash
   # Opción 1: Con Live Server (VS Code)
   # Clic derecho en index.html > Open with Live Server
   
   # Opción 2: Con http-server (Node.js)
   npx http-server -p 8080
   
   # Opción 3: Con Python
   python -m http.server 8080
   ```

5. **Acceder a la aplicación**
   ```
   http://localhost:8080
   ```

---

## 📖 Uso

### Para Ciudadanos
1. **Regístrate** con tu email o ingresa como **Invitado** (solo lectura)
2. **Completa tu perfil** para aumentar tu Trust Meter (multiplicador de XP)
3. **Reporta incidencias** desde el mapa o la vista de reportes
4. **Interactúa** votando, comentando y siguiendo reportes relevantes
5. **Sube de nivel** y desbloquea insignias por tu participación

### Para Administradores
- Acceso al panel de administración (próximamente)
- Gestión de reportes y moderación de contenido
- Estadísticas municipales y reportes de impacto

---

## 🎨 Principios de Diseño

- **Premium First**: Diseño moderno con gradientes, glassmorphism y animaciones suaves
- **Mobile Responsive**: Optimizado para dispositivos móviles y tablets
- **Accesibilidad**: Contraste adecuado, navegación por teclado, semántica HTML5
- **Performance**: Compresión de imágenes, lazy loading, optimización de consultas

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Lee `AI_CONTEXT.md` y `TECHNICAL_REFERENCE.md` antes de empezar
2. Crea un fork del repositorio
3. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
4. Mantén la modularidad: cada módulo tiene una responsabilidad clara
5. Usa el Logger para trazabilidad (`Logger.info`, `Logger.warn`, `Logger.error`)
6. Actualiza `TECHNICAL_REFERENCE.md` si modificas funciones existentes
7. Haz commit de tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
8. Push a la rama (`git push origin feature/nueva-funcionalidad`)
9. Abre un Pull Request

### Reglas de Oro
- **No duplicar código**: Consulta `TECHNICAL_REFERENCE.md` antes de crear funciones
- **Database First**: Las validaciones y cálculos complejos van en Supabase (vistas/RPC)
- **Eventos sobre callbacks**: Usa Custom Events para comunicación entre módulos
- **CSS Variables**: Respeta las variables de color definidas en `style.css`

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## 🌟 Roadmap

- [x] Panel de administración avanzado (Usuarios/Munis)
- [ ] Notificaciones push en tiempo real
- [ ] Exportación de reportes a PDF/Excel
- [ ] Integración con redes sociales
- [ ] App móvil nativa (React Native / Flutter)
- [ ] Sistema de recompensas y badges NFT
- [ ] API pública para desarrolladores

---

## 📞 Contacto y Soporte

- **Issues**: [GitHub Issues](https://github.com/tu-usuario/municipalink/issues)
- **Documentación**: Ver `AI_CONTEXT.md` y `TECHNICAL_REFERENCE.md`
- **Email**: soporte@municipalink.com (ejemplo)

---

<div align="center">
  <p>Hecho con ❤️ para mejorar nuestras comunidades</p>
  <p><strong>MunicipaLink</strong> - Conectando ciudadanos con sus municipalidades</p>
</div>
