# UI Design Guidelines - MunicipaLink Premium

Este documento establece los estándares de diseño para mantener una interfaz coherente, profesional y de alta calidad en todo el proyecto.

## 1. Formularios Premium

Para formularios que requieran un acabado profesional (modales de creación, edición, perfiles), se deben utilizar las siguientes clases y estructuras:

### Contenedor de Formulario (.card-premium)
Cada sección lógica o formulario en un modal debe estar envuelto en un `.card-premium`.
- **Fondo:** `#f8fafc` (Gris azulado muy claro)
- **Borde:** `1px solid #e2e8f0`
- **Radio:** `12px`

### Grilla de Formulario (.form-grid-premium)
Divide los campos en columnas responsivas.
- **Diferencia:** Usa `gap: 1.5rem` y se adapta automáticamente a móviles.

### Campos con Iconos (.input-with-icon)
Cada `form-group` importante debe incluir un icono de Lucide.
```html
<div class="form-group">
    <label>Etiqueta</label>
    <div class="input-with-icon">
        <i data-lucide="icon-name"></i>
        <input type="text" class="input" placeholder="...">
    </div>
</div>
```

## 2. Listados y Tablas Premium

Todas las tablas que manejen datos del sistema deben seguir este patrón para asegurar legibilidad y control.

### Contenedor de Tabla (.table-container-premium)
- **Borde y Radio:** `12px` con `overflow: hidden`.
- **Fondo:** Blanco puro.

### Envoltorio de Scroll (.table-wrapper-scroll)
Permite que la tabla tenga scroll interno sin afectar el layout de la página.
- **Altura máxima:** `500px` por defecto.
- **Header Stickiness:** Los encabezados (`thead`) deben ser pegajosos (`sticky`).

### Toolbar de Acciones (.toolbar-premium)
Contiene buscadores y botones de acción rápida.
- **Buscador (.search-premium):** Siempre debe incluir el icono de lupa y padding lateral.

## 3. Dashboards y Estadísticas
Para el Panel Admin y vistas de analítica:

### Grilla de Estadísticas (.admin-stats-grid)
- **Diseño:** 3 columnas (usuarios, reportes, municipalidades).
- **Cartas (.stat-card):** Título en gris suave, número grande en color acento.

### Mini Estadísticas (.admin-stats-mini)
Utilizado en la parte superior de las tablas para dar contexto rápido.
- **Estructura:** Flex row con espaciado uniforme y etiquetas en negrita.

## 3. Estados y Badges

Usa badges redondeados (`.badge-premium`) para estados:
- **Activo/Éxito:** `.status-active` (Verde)
- **Pendiente/Alerta:** `.status-pending` (Amarillo/Naranja)
- **Error/Peligro:** `.status-danger` (Rojo)

---
*Nota: Estos estilos están definidos globalmente en `styles/components/forms.css` y `styles/components/tables.css`.*
