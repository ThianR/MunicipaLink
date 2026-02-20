# Análisis de Optimización de Rendimiento: `sql/02_vistas.sql`

## 1. Descripción del Problema

La vista SQL `reportes_final_v1` definida en `sql/02_vistas.sql` actualmente utiliza subconsultas correlacionadas en la lista `SELECT` para calcular los conteos de `interacciones` (votos positivos) y `comentarios`. Este patrón se conoce como el "problema de la consulta N+1" en el contexto de ORMs, pero en SQL, resulta en un plan de ejecución de bucle anidado donde las subconsultas se ejecutan para cada fila devuelta por la consulta principal.

**Patrón de Consulta Actual:**
```sql
SELECT
    r.id,
    ...,
    (SELECT COUNT(*) FROM interacciones i WHERE i.reporte_id = r.id AND i.tipo = 'voto_positivo') as votos_positivos,
    (SELECT COUNT(*) FROM comentarios com WHERE com.reporte_id = r.id) as total_comentarios
FROM reportes r
...
```

**Implicación de Rendimiento:**
*   Para `N` reportes, la base de datos ejecuta `N` subconsultas para votos y `N` subconsultas para comentarios.
*   Esto escala linealmente con el número de reportes (`O(N)`), lo que puede convertirse en un cuello de botella a medida que crece el conjunto de datos.
*   Aunque los optimizadores modernos (como el de Postgres) a veces pueden reescribir esto en un `LEFT JOIN LATERAL`, no está garantizado y a menudo resulta en planes subóptimos.

## 2. Solución Propuesta

La vista se reescribirá para usar `LEFT JOIN` en las tablas `interacciones` y `comentarios`, combinado con `GROUP BY` en la clave primaria de `reportes` (y otras columnas de tablas unidas).

**Patrón de Consulta Optimizado:**
```sql
SELECT
    r.id,
    ...,
    COUNT(DISTINCT CASE WHEN i.tipo = 'voto_positivo' THEN i.id END) as votos_positivos,
    COUNT(DISTINCT com.id) as total_comentarios
FROM reportes r
LEFT JOIN interacciones i ON r.id = i.reporte_id
LEFT JOIN comentarios com ON r.id = com.reporte_id
GROUP BY r.id, m.id, c.id, p.id
```

**Beneficios:**
*   **Complejidad Reducida:** La base de datos puede ejecutar las uniones en una sola pasada (por ejemplo, usando Hash Join o Merge Join), lo cual es típicamente mucho más rápido que los bucles anidados para grandes conjuntos de datos.
*   **Escalabilidad:** El tiempo de ejecución escalará mejor con el número de reportes (`O(N log N)` o `O(N)` dependiendo del tipo de unión e índices) en lugar de estrictamente lineal con altos factores constantes por fila.
*   **Previsibilidad:** Las uniones explícitas dan al optimizador una estructura más clara con la que trabajar.

## 3. Estrategia de Verificación y Benchmark

### Por qué no es Factible un Benchmark en Vivo
Debido a las restricciones del entorno de desarrollo:
*   No hay una instancia de PostgreSQL en ejecución para ejecutar consultas.
*   No existe un conjunto de datos existente de tamaño suficiente para demostrar la diferencia de rendimiento.
*   No podemos usar `EXPLAIN ANALYZE` para obtener tiempos de ejecución reales.

### Verificación Estática
En su lugar, verificaremos la optimización mediante:
1.  **Análisis Estructural:** Asegurando que la sintaxis SQL sea válida y siga el patrón `LEFT JOIN ... GROUP BY`.
2.  **Verificación de Corrección:** Verificando que las columnas de salida coincidan con la definición original de la vista (preservando el contrato de la API).
3.  **Revisión de Código:** Confirmando que `COUNT(DISTINCT ...)` se usa correctamente para manejar el potencial producto cartesiano de unir múltiples relaciones uno a muchos (interacciones y comentarios).

## 4. Impacto Esperado
Esperamos una reducción significativa en el tiempo de ejecución de consultas para selecciones de `reportes_final_v1`, especialmente al filtrar por `municipalidad_id` o al obtener listas grandes de reportes. La mejora será más notable cuando el número de reportes, interacciones y comentarios sea alto.
