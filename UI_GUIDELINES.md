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
Evolución a Tarjetas Premium (.admin-stat-card):
- **Estructura:** Flex row con un icono destacado (`.admin-stat-icon`) y un bloque de información (`.admin-stat-info`).
- **Visual:** Sombra suave (`0 4px 6px -1px rgba(0,0,0,0.05)`), bordes redondeados de `16px`, y color de acento según el dato.

### Mini Estadísticas (.admin-stats-mini)
Utilizado en la parte superior de las tablas para dar contexto rápido.
- **Estructura:** Flex row con espaciado uniforme y etiquetas en negrita.

## 4. Navegación Administrativa Compacta

Para mantener la funcionalidad sin saturar la vista, se han definido dos niveles de navegación administrativa:

### A. Acceso Global (Sidebar Principal)
- **Sección Compacta:** Uso de `.sidebar__section` y `.sidebar__label` para separar visualmente las herramientas admin sin ocupar espacio excesivo.
- **Scroll Interno:** El contenedor `.sidebar__nav` debe tener `overflow-y: auto` para asegurar usabilidad en pantallas pequeñas, manteniendo los controles superiores fijos.

### B. Navegación Interna (.admin-sidebar)
Para vistas con múltiples sub-secciones (Panel Admin):
- **Tabs con Iconos:** Botones `.admin-tab-btn` que incluyen un `.admin-tab-icon` dedicado.
- **Estados:** El ítem activo debe usar `var(--primary-light)` para el fondo del icono y una sombra sutil para destacar.

## 5. Modales Premium V2 (Experiencia Inmersiva)

Para modales informativos o de gestión crítica (ej. Detalles de Solicitud), se debe seguir el patrón de "Header Gradiente con Curva":

### Estructura del Modal
- **Contenedor:** `.modal__content` con `border-radius: 20px` y `overflow: hidden`.
- **Encabezado:** Gradiente lineal (`linear-gradient(135deg, var(--primary) 0%, #059669 100%)`) con un separador SVG de onda (`wave`) en la base para transicionar al cuerpo blanco.
- **Botón de Cierre Interno:** El botón `.btn-close` (✕) debe estar **dentro** del header con `position: absolute`. El header debe tener `position: relative` para contenerlo.
- **Icono de Cabecera:** Enmarcado en un círculo con fondo semi-transparente (`backdrop-filter: blur(4px)`).
- **Cuerpo:** Espaciado generoso (`padding: 1.5rem 1.75rem`) con componentes estructurados:
    - **Chips de Información:** Flexbox con iconos y etiquetas en gris suave.
    - **Áreas de Texto Estéticas:** Los `textarea` dentro de modales deben usar `width: 100%` para cubrir todo el ancho disponible y mantener la armonía visual.
    - **Bordes de Acento:** Bordes acentuados con el color de la marca (ej. `border-left: 3px solid var(--primary)`).
- **Acciones**: Botones con iconos Lucide que ocupen el ancho completo (`flex: 1`).

### 5. Navegación y Multi-selección

#### Botones de Navegación (GPS)
- **Capa Flotante**: En mapas, el botón "Ir al lugar" debe estar centrado en la parte inferior (`left: 50%`, `bottom: 1.25rem`) con sombra pronunciada para flotabilidad.
- **Micro-interactividad**: Uso de `white-space: nowrap` para evitar cortes de texto en dispositivos móviles.

#### Selectores Filtrables
- **Input de Búsqueda**: Siempre que una lista de selección (checkboxes/radios) tenga más de 5 elementos, debe incluir un campo de búsqueda superior con icono de lupa para filtrado dinámico en tiempo real.
- **Estados Bloqueados**: Los elementos ya seleccionados que formen parte del historial (ej. departamentos ya asignados) deben renderizarse como badges deshabilitados con icono de candado.

### Ejemplo de Header Premium
```html
<div style="background: linear-gradient(135deg, var(--primary) 0%, #059669 100%); padding: 1.75rem; position:relative;">
    <!-- Contenido y SVG de onda al final -->
</div>
```

---
*Nota: Estos estilos están definidos globalmente en `styles/components/modals.css` (clases base) y se extienden con estilos inline o utilidades en el HTML para máxima flexibilidad.*

---
*Nota: Estos estilos están definidos globalmente en `styles/components/forms.css` y `styles/components/tables.css`.*
