// municipal.js
// Módulo para usuarios con rol 'municipal'.
// Permite gestionar los reportes de su municipalidad:
// asignar departamentos, definir prioridad, y cerrar con evidencias.

import { supabaseClient } from '../services/supabase.js';

import { Logger } from '../utils/logger.js';
import { hexToDouble } from '../utils/helpers.js';
import { mostrarMensaje } from '../utils/ui.js';

// Estado interno del módulo
const state = {
    municipalidadId: null,
    municipalidadNombre: null,
    reporteActual: null,
    departamentos: [],
};

/**
 * Comprime un archivo de imagen usando canvas para reducir el tamaño antes de subir.
 * @param {File} archivo
 * @returns {Promise<Blob>}
 */
async function comprimirImagen(archivo) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(archivo);
        img.onload = () => {
            const MAX = 1024;
            let { width, height } = img;
            if (width > MAX || height > MAX) {
                const ratio = Math.min(MAX / width, MAX / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
                'image/webp', 0.8);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
        img.src = url;
    });
}

/**
 * Obtiene el municipalidad_id del usuario autenticado.
 * Estrategia de 3 niveles para máxima resiliencia:
 *   1. RPC obtener_municipalidad_usuario (requiere SQL migración aplicada)
 *   2. Consulta directa a perfiles.municipalidad_id
 *   3. Consulta a solicitudes_municipales con estado='aprobado'
 * @returns {Promise<string|null>}
 */
async function obtenerMunicipalidadUsuario() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    // Nivel 1: RPC (post-migración SQL)
    try {
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('obtener_municipalidad_usuario');
        if (!rpcError && rpcData) {
            Logger.info('MunicipalModule: municipalidad_id obtenida via RPC');
            return rpcData;
        }
    } catch (_) { /* intentional fallthrough */ }

    // Nivel 2: perfiles.municipalidad_id (post-migración SQL con update de trigger)
    try {
        const { data: perfilData } = await supabaseClient
            .from('perfiles')
            .select('municipalidad_id')
            .eq('id', user.id)
            .single();
        if (perfilData?.municipalidad_id) {
            Logger.info('MunicipalModule: municipalidad_id obtenida via perfiles');
            return perfilData.municipalidad_id;
        }
    } catch (_) { /* intentional fallthrough */ }

    // Nivel 3: solicitudes_municipales aprobada (siempre disponible sin migración)
    try {
        const { data: solicitud } = await supabaseClient
            .from('solicitudes_municipales')
            .select('municipalidad_id')
            .eq('usuario_id', user.id)
            .eq('estado', 'aprobado')
            .order('actualizado_en', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (solicitud?.municipalidad_id) {
            Logger.info('MunicipalModule: municipalidad_id obtenida via solicitudes_municipales');
            return solicitud.municipalidad_id;
        }
    } catch (_) { /* intentional fallthrough */ }

    Logger.error('MunicipalModule: No se pudo determinar la municipalidad del usuario en ningún nivel.');
    return null;
}


/**
 * Carga los departamentos de la municipalidad del usuario.
 * Guarda el resultado en state.departamentos.
 */
async function cargarDepartamentos() {
    if (!state.municipalidadId) return;
    const { data, error } = await supabaseClient
        .from('departamentos')
        .select('id, nombre')
        .eq('municipalidad_id', state.municipalidadId)
        .order('nombre');

    if (error) {
        Logger.error('MunicipalModule: Error cargando departamentos', error);
        return;
    }
    state.departamentos = data || [];
}

/**
 * Carga y renderiza los reportes de la municipalidad del usuario.
 * Aplica filtros opcionales de estado y prioridad.
 * @param {{ estado?: string, prioridad?: string }} filtros
 */
async function cargarReportes(filtros = {}) {
    const lista = document.getElementById('municipal-reportes-lista');
    if (!lista) return;

    if (!state.municipalidadId) {
        lista.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">
            <i data-lucide="alert-circle" style="width:16px;height:16px;margin-right:0.5rem;"></i>
            No se pudo determinar la municipalidad del usuario.</td></tr>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    lista.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">
        <i data-lucide="loader-2" style="animation: spin 1s linear infinite;"></i> Cargando...</td></tr>`;

    // Consulta principal de reportes (sin join a perfiles — FK va a auth.users, no a perfiles)
    let query = supabaseClient
        .from('reportes')
        .select(`
            id, numero_solicitud, descripcion, estado, usuario_id,
            prioridad_gestion, fecha_asignacion, creado_en, ubicacion,
            categorias(nombre, icono),
            departamentos!departamento_id(nombre)
        `)
        .eq('municipalidad_id', state.municipalidadId)
        .order('creado_en', { ascending: false });

    if (filtros.estado && filtros.estado !== 'todos') {
        query = query.eq('estado', filtros.estado);
    }
    if (filtros.prioridad && filtros.prioridad !== 'todas') {
        query = query.eq('prioridad_gestion', filtros.prioridad);
    }

    const { data, error } = await query;

    if (error) {
        Logger.error('MunicipalModule: Error cargando reportes', error);
        lista.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar reportes: ${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        renderReportes([]);
        return;
    }

    // Enriquecer con datos de perfiles (consulta separada por limitación de FK)
    const uuids = [...new Set(data.map(r => r.usuario_id).filter(Boolean))];
    let perfilesMap = {};
    if (uuids.length > 0) {
        const { data: perfilesData } = await supabaseClient
            .from('perfiles')
            .select('id, nombre_completo, alias, email')
            .in('id', uuids);
        if (perfilesData) {
            perfilesData.forEach(p => { perfilesMap[p.id] = p; });
        }
    }

    // Adjuntar perfil al reporte
    const enriched = data.map(r => ({
        ...r,
        perfiles: perfilesMap[r.usuario_id] || null,
    }));

    renderReportes(enriched);
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Genera el HTML de las filas de la tabla de reportes municipales.
 * @param {Array} data
 */
function renderReportes(data) {
    const lista = document.getElementById('municipal-reportes-lista');
    if (!lista) return;

    if (data.length === 0) {
        lista.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">
            No hay reportes para esta municipalidad.</td></tr>`;
        return;
    }

    const prioridadConfig = {
        baja: { color: '#10b981', label: 'Baja' },
        media: { color: '#f59e0b', label: 'Media' },
        alta: { color: '#f97316', label: 'Alta' },
        urgente: { color: '#ef4444', label: 'Urgente' },
    };

    const estadoConfig = {
        'Pendiente': { color: '#64748b', icon: 'clock' },
        'En proceso': { color: '#3b82f6', icon: 'loader-2' },
        'Resuelto': { color: '#10b981', icon: 'check-circle' },
        'Rechazado': { color: '#ef4444', icon: 'x-circle' },
    };

    lista.innerHTML = data.map(r => {
        const prio = prioridadConfig[r.prioridad_gestion] || prioridadConfig.media;
        const est = estadoConfig[r.estado] || estadoConfig['Pendiente'];
        const ciudadano = r.perfiles?.alias || r.perfiles?.nombre_completo || '—';
        const depto = r.departamentos?.nombre || '<span style="color:var(--text-muted)">Sin asignar</span>';
        const fecha = r.creado_en ? new Date(r.creado_en).toLocaleDateString('es-PY') : '—';

        return `<tr>
            <td>
                <span style="font-weight:600; font-size:0.75rem; color: var(--primary);">${r.numero_solicitud || r.id.slice(0, 8)}</span><br>
                <span style="font-size:0.75rem; color: var(--text-muted);">${fecha}</span>
            </td>
            <td style="max-width: 200px; font-size:0.85rem;">${r.descripcion || '—'}</td>
            <td>${ciudadano}</td>
            <td>${depto}</td>
            <td>
                <span style="display:inline-flex; align-items:center; gap:0.35rem; padding: 0.25rem 0.65rem;
                             background: ${est.color}20; color: ${est.color};
                             border-radius: 999px; font-size: 0.75rem; font-weight: 600;">
                    <i data-lucide="${est.icon}" style="width:12px;height:12px;"></i>
                    ${r.estado}
                </span>
            </td>
            <td>
                <span class="priority-badge priority-${r.prioridad_gestion || 'media'}">${prio.label}</span>
                <button class="btn-ver-detalle-municipal button button--outline"
                        data-id="${r.id}"
                        style="margin-top:0.35rem; font-size:0.75rem; padding: 0.25rem 0.75rem; width:100%; display:flex; align-items:center; justify-content:center; gap:0.35rem;">
                    <i data-lucide="clipboard-edit" style="width:13px;height:13px;"></i> Gestionar
                </button>
            </td>
        </tr>`;
    }).join('');

    // Vincular botones de detalle
    lista.querySelectorAll('.btn-ver-detalle-municipal').forEach(btn => {
        btn.addEventListener('click', () => abrirDetalleGestion(btn.dataset.id));
    });

    if (window.lucide) window.lucide.createIcons();
}

/**
 * Abre el modal de gestión con los datos del reporte seleccionado.
 * Siempre re-fetcha para garantizar datos frescos (nunca usa caché).
 * @param {string} reporteId
 */
async function abrirDetalleGestion(reporteId) {
    // Limpiar filtro de departamentos si existe
    const deptoFiltro = document.getElementById('mgestion-depto-filtro');
    if (deptoFiltro) deptoFiltro.value = '';

    const { data, error } = await supabaseClient
        .from('reportes')
        .select(`
            id, numero_solicitud, descripcion, estado, prioridad_gestion,
            fecha_asignacion, creado_en, observacion_municipal, usuario_id,
            ultimo_modificado_por, ubicacion,
            categorias(nombre, icono),
            municipalidades(nombre)
        `)
        .eq('id', reporteId)
        .single();

    if (error || !data) {
        mostrarMensaje('Error al cargar el reporte.', 'error');
        return;
    }

    // Obtener perfil del ciudadano por separado (FK va a auth.users, no a perfiles)
    let perfilCiudadano = null;
    if (data.usuario_id) {
        const { data: pData } = await supabaseClient
            .from('perfiles')
            .select('nombre_completo, alias, email')
            .eq('id', data.usuario_id)
            .maybeSingle();
        perfilCiudadano = pData || null;
    }

    // Obtener departamentos ya asignados desde la tabla junction
    const { data: deptosAsignados } = await supabaseClient
        .from('reporte_departamentos')
        .select('departamento_id, asignado_en, departamentos(nombre)')
        .eq('reporte_id', reporteId)
        .order('asignado_en', { ascending: true });

    const reporte = { ...data, perfiles: perfilCiudadano, deptos_asignados: deptosAsignados || [] };
    state.reporteActual = reporte;

    // Poblar modal
    // — Header
    document.getElementById('mgestion-numero').textContent = reporte.numero_solicitud || `#${reporte.id.slice(0, 8)}`;
    document.getElementById('mgestion-estado-badge').textContent = reporte.estado;

    // — Ciudadano
    const p = reporte.perfiles;
    document.getElementById('mgestion-ciudadano').textContent = p?.alias || p?.nombre_completo || '—';
    document.getElementById('mgestion-email').textContent = p?.email || '—';

    // — Detalles del reporte
    document.getElementById('mgestion-descripcion').textContent = reporte.descripcion || '—';
    document.getElementById('mgestion-categoria').textContent = reporte.categorias?.nombre || '—';
    document.getElementById('mgestion-fecha-creacion').textContent =
        reporte.creado_en ? new Date(reporte.creado_en).toLocaleString('es-PY') : '—';

    // — Departamentos (checkboxes multi-select con lock)
    renderDepartamentosCheckboxes(reporte.deptos_asignados, reporte.estado);

    // — Prioridad
    document.getElementById('mgestion-prioridad').value = reporte.prioridad_gestion || 'media';

    // — Estado actual
    document.getElementById('mgestion-estado').value = reporte.estado;

    // — Observación
    document.getElementById('mgestion-observacion').value = reporte.observacion_municipal || '';

    // — Fecha primera asignación
    const fAsignacion = document.getElementById('mgestion-fecha-asignacion');
    if (reporte.deptos_asignados.length > 0) {
        const primera = reporte.deptos_asignados[0].asignado_en;
        fAsignacion.textContent = primera ? new Date(primera).toLocaleString('es-PY') : 'Registrada';
    } else {
        fAsignacion.textContent = 'Pendiente de asignación';
    }

    // — Zona de cierre
    actualizarVisibilidadCierre();

    // — GPS Button
    const btnGps = document.getElementById('btn-mgestion-gps');
    if (btnGps) {
        btnGps.style.display = 'none';
        if (reporte.ubicacion) {
            const coords = parseUbicacion(reporte.ubicacion);
            if (coords) {
                btnGps.href = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
                btnGps.style.display = 'flex';
            }
        }
    }

    // Abrir modal
    const modal = document.getElementById('modal-gestion-reporte');
    modal.style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Parsea la ubicación (Hex PostGIS o GeoJSON) para obtener Lat/Lng.
 * @param {string|object} ubicacion
 * @returns {{lat: number, lng: number} | null}
 */
function parseUbicacion(ubicacion) {
    if (!ubicacion) return null;
    let lat, lng;

    try {
        if (typeof ubicacion === 'string') {
            // Hex WKB format de Supabase/PostGIS
            if (ubicacion.startsWith('0101')) {
                const hasSRID = ubicacion.substring(8, 10) === '20';
                const offset = hasSRID ? 18 : 10;
                lng = hexToDouble(ubicacion.substring(offset, offset + 16));
                lat = hexToDouble(ubicacion.substring(offset + 16, offset + 32));
            } else {
                // WKT format "POINT(lng lat)"
                const match = ubicacion.match(/POINT\(([^ ]+) ([^ ]+)\)/) || ubicacion.match(/\(([^ ]+) ([^ ]+)\)/);
                if (match) {
                    lng = parseFloat(match[1]);
                    lat = parseFloat(match[2]);
                }
            }
        } else if (ubicacion.coordinates) {
            // GeoJSON format
            lng = ubicacion.coordinates[0];
            lat = ubicacion.coordinates[1];
        }

        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
        }
    } catch (e) {
        console.error('Error parseando ubicación:', e);
    }
    return null;
}

/**
 * Renderiza los departamentos en el modal como checkboxes.
 * Los ya asignados aparecen como badges bloqueados.
 * Los no asignados aparecen como checkboxes habilitados para agregar.
 * @param {Array} asignados - Filas de reporte_departamentos con join a departamentos
 * @param {string} estadoReporte - Estado actual del reporte
 */
function renderDepartamentosCheckboxes(asignados, estadoReporte) {
    const lista = document.getElementById('mgestion-departamentos-lista');
    if (!lista) return;

    const reporteCerrado = estadoReporte === 'Resuelto' || estadoReporte === 'Rechazado';
    const idsAsignados = new Set(asignados.map(a => a.departamento_id));

    let html = '';

    // — Departamentos ya asignados (bloqueados)
    if (asignados.length > 0) {
        html += asignados.map(a => `
            <div style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem;
                        background:#d1fae5; border-radius:8px; border:1px solid #6ee7b7;">
                <i data-lucide="check-circle" style="width:14px;height:14px;color:#059669;flex-shrink:0;"></i>
                <span style="font-size:0.875rem; font-weight:600; color:#065f46; flex:1;">
                    ${a.departamentos?.nombre || 'Departamento'}
                </span>
                <span style="font-size:0.7rem; color:#6ee7b7; white-space:nowrap;">
                    <i data-lucide="lock" style="width:10px;height:10px;"></i> Asignado
                </span>
                <input type="hidden" name="depto-asignado" value="${a.departamento_id}">
            </div>
        `).join('');
    }

    // — Departamentos disponibles para agregar
    const disponibles = state.departamentos.filter(d => !idsAsignados.has(d.id));

    if (!reporteCerrado && disponibles.length > 0) {
        if (asignados.length > 0) {
            html += `<div style="border-top:1px solid #e2e8f0; margin:0.25rem 0; padding-top:0.25rem;"
                         title="Podés agregar más departamentos"></div>`;
        }
        html += disponibles.map(d => `
            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.45rem 0.5rem;
                          cursor:pointer; border-radius:8px; transition:background 0.15s;"
                   onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" name="depto-nuevo" value="${d.id}"
                       style="width:16px;height:16px;accent-color:var(--primary,#10b981);cursor:pointer;">
                <span style="font-size:0.875rem; color:var(--text-main);">${d.nombre}</span>
            </label>
        `).join('');
    } else if (reporteCerrado && disponibles.length > 0) {
        // Reporte cerrado: mostrar disponibles como informativos, deshabilitados
        html += disponibles.map(d => `
            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.45rem 0.5rem; opacity:0.45;">
                <input type="checkbox" name="depto-nuevo" value="${d.id}" disabled
                       style="width:16px;height:16px;">
                <span style="font-size:0.875rem; color:var(--text-muted);">${d.nombre}</span>
            </label>
        `).join('');
    }

    if (html === '') {
        html = `<span style="font-size:0.82rem; color:var(--text-muted);">No hay departamentos disponibles.</span>`;
    }

    lista.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Muestra u oculta la zona de evidencias de cierre según el estado seleccionado.
 */
function actualizarVisibilidadCierre() {
    const estado = document.getElementById('mgestion-estado')?.value;
    const zonaCierre = document.getElementById('mgestion-zona-cierre');
    if (!zonaCierre) return;
    const esFinal = estado === 'Resuelto' || estado === 'Rechazado';
    zonaCierre.style.display = esFinal ? 'block' : 'none';
}

/**
 * Valida y guarda los cambios de gestión del reporte.
 * Los nuevos departamentos se insertan en reporte_departamentos.
 * El primer departamento asignado también actualiza reportes.departamento_id
 * para que el trigger registre fecha_asignacion.
 */
async function guardarGestion() {
    const reporte = state.reporteActual;
    if (!reporte) return;

    const btnGuardar = document.getElementById('btn-mgestion-guardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    const nuevaPrio = document.getElementById('mgestion-prioridad').value;
    const nuevoEstado = document.getElementById('mgestion-estado').value;
    const observacion = document.getElementById('mgestion-observacion').value.trim();

    // Obtener nuevos departamentos a asignar (checkboxes marcados de los disponibles)
    const checkeados = document.querySelectorAll('#mgestion-departamentos-lista input[name="depto-nuevo"]:checked');
    const nuevosDeptos = Array.from(checkeados).map(cb => cb.value);

    // Validar evidencias si se va a cerrar
    const esFinal = nuevoEstado === 'Resuelto' || nuevoEstado === 'Rechazado';
    const archivos = document.getElementById('mgestion-evidencias')?.files;

    if (esFinal && (!archivos || archivos.length === 0)) {
        mostrarMensaje('Debes adjuntar al menos una evidencia para cerrar el reporte.', 'error');
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Cambios';
        return;
    }

    // Preparar update base del reporte
    const updatePayload = {
        prioridad_gestion: nuevaPrio,
        estado: nuevoEstado,
        observacion_municipal: observacion || null,
    };

    // Solo setear departamento_id la primera vez (para que el trigger registre fecha_asignacion)
    const esPrimerDepto = (reporte.deptos_asignados?.length || 0) === 0 && nuevosDeptos.length > 0;
    if (esPrimerDepto) {
        updatePayload.departamento_id = nuevosDeptos[0];
    }

    const { error: updateError } = await supabaseClient
        .from('reportes')
        .update(updatePayload)
        .eq('id', reporte.id);

    if (updateError) {
        Logger.error('MunicipalModule: Error al actualizar reporte', updateError);
        mostrarMensaje('Error al guardar los cambios.', 'error');
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Cambios';
        return;
    }

    // Insertar nuevos departamentos en la tabla junction
    if (nuevosDeptos.length > 0) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const filas = nuevosDeptos.map(deptoId => ({
            reporte_id: reporte.id,
            departamento_id: deptoId,
            asignado_por: user?.id || null,
        }));

        const { error: insertError } = await supabaseClient
            .from('reporte_departamentos')
            .insert(filas);

        if (insertError) {
            Logger.error('MunicipalModule: Error al insertar departamentos', insertError);
            mostrarMensaje('Reporte actualizado pero falló la asignación de departamentos.', 'warning');
        }
    }

    // Subir evidencias de cierre si corresponde
    if (esFinal && archivos && archivos.length > 0) {
        const tipo = nuevoEstado === 'Resuelto' ? 'resolucion' : 'rechazo';
        await subirEvidenciasCierre(reporte.id, archivos, tipo);
    }

    mostrarMensaje('Reporte actualizado correctamente.', 'success');
    cerrarModalGestion();

    // Recargar lista con los filtros actuales
    const filtroEstado = document.getElementById('municipal-filtro-estado')?.value;
    const filtroPrioridad = document.getElementById('municipal-filtro-prioridad')?.value;
    await cargarReportes({ estado: filtroEstado, prioridad: filtroPrioridad });
}

/**
 * Sube imágenes al Storage de Supabase e inserta registros en evidencias_cierre.
 * @param {string} reporteId
 * @param {FileList} archivos
 * @param {'resolucion'|'rechazo'} tipo
 */
async function subirEvidenciasCierre(reporteId, archivos, tipo) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    for (const archivo of Array.from(archivos)) {
        try {
            const comprimido = await comprimirImagen(archivo);
            const nombreArchivo = `cierre/${reporteId}/${Date.now()}_${archivo.name}`;
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('evidencias')
                .upload(nombreArchivo, comprimido, { upsert: false, contentType: archivo.type });

            if (uploadError) {
                Logger.error('MunicipalModule: Error subiendo evidencia de cierre', uploadError);
                continue;
            }

            const { data: pub } = supabaseClient.storage.from('evidencias').getPublicUrl(nombreArchivo);

            await supabaseClient.from('evidencias_cierre').insert({
                reporte_id: reporteId,
                imagen_url: pub.publicUrl,
                tipo,
                subido_por: user.id,
            });
        } catch (e) {
            Logger.error('MunicipalModule: Excepción al subir evidencia de cierre', e);
        }
    }
}

/**
 * Cierra el modal de gestión de reportes.
 */
function cerrarModalGestion() {
    const modal = document.getElementById('modal-gestion-reporte');
    if (modal) modal.style.display = 'none';
    state.reporteActual = null;
    // Limpiar evidencias
    const inputEvidencias = document.getElementById('mgestion-evidencias');
    if (inputEvidencias) inputEvidencias.value = '';
}

/**
 * Configura todos los listeners del panel municipal.
 */
function configurarListeners() {
    // Botón guardar en modal
    document.getElementById('btn-mgestion-guardar')?.addEventListener('click', guardarGestion);

    // Cerrar modal
    document.getElementById('btn-mgestion-cerrar')?.addEventListener('click', cerrarModalGestion);

    // Filtro de departamentos en modal (gestión multi-depto)
    document.getElementById('mgestion-depto-filtro')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const lista = document.getElementById('mgestion-departamentos-lista');
        if (!lista) return;

        // Filtrar tanto los badges (asignados) como los labels (nuevos)
        const items = lista.querySelectorAll('div, label');
        items.forEach(item => {
            // Buscamos el texto dentro del item. 
            // En badges está en un span con font-weight 600, en labels está en un span final.
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    });
    document.getElementById('modal-gestion-reporte')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) cerrarModalGestion();
    });

    // Cambio de estado → mostrar/ocultar zona de evidencias de cierre
    document.getElementById('mgestion-estado')?.addEventListener('change', actualizarVisibilidadCierre);

    // Filtros del listado
    document.getElementById('municipal-filtro-estado')?.addEventListener('change', () => {
        cargarReportes({
            estado: document.getElementById('municipal-filtro-estado').value,
            prioridad: document.getElementById('municipal-filtro-prioridad').value,
        });
    });
    document.getElementById('municipal-filtro-prioridad')?.addEventListener('change', () => {
        cargarReportes({
            estado: document.getElementById('municipal-filtro-estado').value,
            prioridad: document.getElementById('municipal-filtro-prioridad').value,
        });
    });

    // Buscador de reportes
    const searchInput = document.getElementById('municipal-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase();
            document.querySelectorAll('#municipal-reportes-lista tr').forEach(tr => {
                tr.style.display = tr.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }

    // Drag-and-drop en zona de evidencias
    const dropzone = document.getElementById('mgestion-dropzone');
    const inputFile = document.getElementById('mgestion-evidencias');
    if (dropzone && inputFile) {
        dropzone.addEventListener('click', () => inputFile.click());
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            inputFile.files = e.dataTransfer.files;
            actualizarPreviewEvidencias(e.dataTransfer.files);
        });
        inputFile.addEventListener('change', () => actualizarPreviewEvidencias(inputFile.files));
    }
}

/**
 * Muestra los nombres de archivos seleccionados en la zona de drop.
 * @param {FileList} archivos
 */
function actualizarPreviewEvidencias(archivos) {
    const preview = document.getElementById('mgestion-evidencias-preview');
    if (!preview) return;
    preview.innerHTML = Array.from(archivos).map(f =>
        `<span style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.25rem 0.5rem;
                       background:#f0fdf4;border-radius:6px;font-size:0.75rem;color:var(--primary);">
            <i data-lucide="file-image" style="width:12px;height:12px;"></i>${f.name}
        </span>`
    ).join('');
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Inicializa el panel municipal cuando el usuario se loguea con rol 'municipal'.
 */
async function cargarPanelMunicipal() {
    // Obtener la municipalidad del usuario
    state.municipalidadId = await obtenerMunicipalidadUsuario();

    if (!state.municipalidadId) {
        Logger.warn('MunicipalModule: No se pudo obtener municipalidad del usuario.');
        return;
    }

    // Obtener nombre de la municipalidad para el header
    const { data: muni } = await supabaseClient
        .from('municipalidades')
        .select('nombre')
        .eq('id', state.municipalidadId)
        .single();

    state.municipalidadNombre = muni?.nombre || 'Mi Municipalidad';

    const titulo = document.getElementById('municipal-panel-titulo');
    if (titulo) titulo.textContent = state.municipalidadNombre;

    // Cargar departamentos disponibles
    await cargarDepartamentos();

    // Cargar reportes iniciales sin filtros
    await cargarReportes();
}

/**
 * Punto de entrada del módulo.
 */
export const MunicipalModule = {
    init() {
        Logger.info('MunicipalModule: inicializando...');
        configurarListeners();

        // Cargar el panel cuando el usuario autenticado sea municipal
        document.addEventListener('auth:login', async (e) => {
            const { rol } = e.detail || {};
            if (rol === 'municipal') {
                await cargarPanelMunicipal();
            }
        });

        // Recargar datos al navegar a la vista municipal
        document.addEventListener('ui:view-changed', async (e) => {
            if (e.detail?.view === 'municipal' && state.municipalidadId) {
                await cargarReportes();
            }
        });
    }
};
