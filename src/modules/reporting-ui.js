import { ReportingService } from '../services/ReportingService.js';
import { ReportsService } from '../services/ReportsService.js';
import { supabaseClient } from '../services/supabase.js';
import { Logger } from '../utils/logger.js';
import { mostrarMensaje } from '../utils/ui.js';

export function setupReportingListeners() {
    // Escuchar cambios de vista para renderizar el hub
    document.addEventListener('ui:view-changed', async (e) => {
        if (e.detail?.view === 'reporting-hub') {
            await renderReportingHub();
            setupFilterListeners();
        }
    });

    // Delegación de eventos para las tarjetas del hub
    document.getElementById('view-reporting-hub')?.addEventListener('click', (e) => {
        const card = e.target.closest('.report-item-card');
        if (!card) return;

        const action = card.dataset.action;
        if (action === 'citizen-pdf') exportCitizenPDF();
        if (action === 'citizen-excel') exportCitizenExcel();
        if (action === 'muni-pdf') exportMunicipalPDF();
        if (action === 'muni-excel') exportMunicipalExcel();
        if (action === 'admin-comparison') exportAdminComparison();
    });

    // Mantener listeners de botones contextuales (compatibilidad)
    document.getElementById('btn-citizen-export-pdf')?.addEventListener('click', exportCitizenPDF);
    document.getElementById('btn-citizen-export-excel')?.addEventListener('click', exportCitizenExcel);
    document.getElementById('btn-muni-export-pdf')?.addEventListener('click', exportMunicipalPDF);
    document.getElementById('btn-muni-export-excel')?.addEventListener('click', exportMunicipalExcel);
    document.getElementById('btn-admin-export-comparison')?.addEventListener('click', exportAdminComparison);
}

/**
 * Renderiza dinámicamente las tarjetas de reportes en el Hub.
 */
export async function renderReportingHub() {
    const citizenGrid = document.getElementById('reports-citizen-grid');
    const municipalGrid = document.getElementById('reports-municipal-grid');
    const adminGrid = document.getElementById('reports-admin-grid');

    if (!citizenGrid) return;

    // Obtener sesión y perfil para RBAC a nivel de contenido
    const { data: { user } } = await supabaseClient.auth.getUser();
    let profile = null;
    if (user) {
        const { data } = await supabaseClient.from('perfiles').select('rol, municipalidad_id').eq('id', user.id).single();
        profile = data;
    }

    // Reportes Ciudadanos (Siempre visibles)
    citizenGrid.innerHTML = `
        <div class="report-item-card" data-action="citizen-pdf">
            <div class="report-item-icon icon-pdf"><i data-lucide="file-text"></i></div>
            <div class="report-item-info">
                <h4>Resumen de Participación</h4>
                <p>Documento PDF con tus estadísticas de impacto y reporte de solicitudes.</p>
            </div>
            <div class="report-item-footer">
                <span class="report-item-badge">PDF</span>
                <span class="btn-report-export">Exportar <i data-lucide="chevron-right"></i></span>
            </div>
        </div>
        <div class="report-item-card" data-action="citizen-excel">
            <div class="report-item-icon icon-excel"><i data-lucide="file-spreadsheet"></i></div>
            <div class="report-item-info">
                <h4>Historial de Reportes</h4>
                <p>Listado completo de tus reportes en formato Excel para control personal.</p>
            </div>
            <div class="report-item-footer">
                <span class="report-item-badge">EXCEL</span>
                <span class="btn-report-export">Descargar <i data-lucide="chevron-right"></i></span>
            </div>
        </div>
    `;

    // Reportes Municipales (Visibles para rol municipal y admin)
    if (municipalGrid) {
        const isAuthorizedMuni = ['admin', 'municipal'].includes(profile?.rol);
        if (isAuthorizedMuni) {
            municipalGrid.innerHTML = `
                <div class="report-item-card" data-action="muni-pdf">
                    <div class="report-item-icon icon-stats"><i data-lucide="line-chart"></i></div>
                    <div class="report-item-info">
                        <h4>Dashboard Ejecutivo</h4>
                        <p>Resumen gerencial de la gestión municipal actual y tasa de resolución.</p>
                    </div>
                    <div class="report-item-footer">
                        <span class="report-item-badge">PDF</span>
                        <span class="btn-report-export">Generar <i data-lucide="chevron-right"></i></span>
                    </div>
                </div>
                <div class="report-item-card" data-action="muni-excel">
                    <div class="report-item-icon icon-excel"><i data-lucide="table"></i></div>
                    <div class="report-item-info">
                        <h4>Planilla Operativa</h4>
                        <p>Detalle técnico de todos los incidentes para análisis en profundidad.</p>
                    </div>
                    <div class="report-item-footer">
                        <span class="report-item-badge">EXCEL</span>
                        <span class="btn-report-export">Descargar <i data-lucide="chevron-right"></i></span>
                    </div>
                </div>
            `;
            // Asegurar visibilidad del contenedor padre
            const sectionMuni = municipalGrid.closest('.reporting-section');
            if (sectionMuni) sectionMuni.style.display = 'block';
        } else {
            municipalGrid.innerHTML = '';
            const sectionMuni = municipalGrid.closest('.reporting-section');
            if (sectionMuni) sectionMuni.style.display = 'none';
        }
    }

    // Reportes Administrativos (Solo Admin)
    if (adminGrid) {
        if (profile?.rol === 'admin') {
            adminGrid.innerHTML = `
                <div class="report-item-card" data-action="admin-comparison">
                    <div class="report-item-icon icon-stats" style="background:#fef3c7; color:#d97706;"><i data-lucide="globe"></i></div>
                    <div class="report-item-info">
                        <h4>Comparativa Nacional</h4>
                        <p>Análisis comparativo de gestión entre todas las municipalidades registradas.</p>
                    </div>
                    <div class="report-item-footer">
                        <span class="report-item-badge">EXCEL</span>
                        <span class="btn-report-export">Exportar <i data-lucide="chevron-right"></i></span>
                    </div>
                </div>
                <div class="report-item-card" data-action="admin-muni-summary">
                    <div class="report-item-icon icon-stats" style="background:#ede9fe; color:#7c3aed;"><i data-lucide="building"></i></div>
                    <div class="report-item-info">
                        <h4>Resumen por Municipalidad</h4>
                        <p>Estado general de cada municipalidad: reportes activos, resueltos y pendientes.</p>
                    </div>
                    <div class="report-item-footer">
                        <span class="report-item-badge">PDF</span>
                        <span class="btn-report-export">Exportar <i data-lucide="chevron-right"></i></span>
                    </div>
                </div>
                <!-- ... resto de tarjetas ... -->
            `;
            const sectionAdmin = adminGrid.closest('.reporting-section');
            if (sectionAdmin) sectionAdmin.style.display = 'block';
        } else {
            adminGrid.innerHTML = '';
            const sectionAdmin = adminGrid.closest('.reporting-section');
            if (sectionAdmin) sectionAdmin.style.display = 'none';
        }
    }

    if (window.lucide) window.lucide.createIcons();

    if (profile?.rol === 'admin') {
        populateMuniFilter();
    }
}

function getReportFilters() {
    return {
        startDate: document.getElementById('report-filter-start')?.value || null,
        endDate: document.getElementById('report-filter-end')?.value || null,
        status: document.getElementById('report-filter-status')?.value || 'todos',
        muniId: document.getElementById('report-filter-muni')?.value !== 'todas' ? document.getElementById('report-filter-muni')?.value : null
    };
}

function setupFilterListeners() {
    const filters = ['report-filter-start', 'report-filter-end', 'report-filter-status', 'report-filter-muni'];
    filters.forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            // Podríamos refrescar algo visual si fuera necesario, 
            // pero los filtros se aplican al momento de exportar.
            Logger.info('Filtros actualizados:', getReportFilters());
        });
    });
}

async function populateMuniFilter() {
    const muniSelect = document.getElementById('report-filter-muni');
    if (!muniSelect || muniSelect.options.length > 1) return;

    try {
        const { data: munis } = await supabaseClient.from('municipalidades').select('id, nombre').order('nombre');
        if (munis) {
            munis.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.nombre;
                muniSelect.appendChild(opt);
            });
        }
    } catch (error) {
        Logger.error('Error poblando filtro de munis:', error);
    }
}

/** --- CIUDADANO --- **/

async function exportCitizenPDF() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const filters = getReportFilters();
        const { data } = await ReportsService.getReportes({
            userId: user.id,
            pageSize: 1000,
            estado: filters.status,
            startDate: filters.startDate,
            endDate: filters.endDate
        });

        const solvedCount = data.filter(r => r.estado === 'resuelto').length;
        const total = data.length;

        const tableData = data.map(r => [
            r.numero_solicitud || r.id.substring(0, 8),
            new Date(r.creado_en).toLocaleDateString(),
            r.categoria || 'General',
            r.estado.toUpperCase(),
            r.prioridad || 'Baja'
        ]);

        await ReportingService.exportToPDF({
            title: 'Resumen de Participación Ciudadana',
            subtitle: `Usuario: ${user.email} | Impacto: ${solvedCount} soluciones logradas`,
            columns: ['Solicitud', 'Fecha', 'Categoría', 'Estado', 'Prioridad'],
            data: tableData,
            filename: `mi_participacion_${new Date().getTime()}.pdf`
        });

        mostrarMensaje('Reporte generado con éxito', 'success');
    } catch (error) {
        Logger.error('Error exportando reporte ciudadano:', error);
        mostrarMensaje('Error al generar el reporte', 'error');
    }
}

async function exportCitizenExcel() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const filters = getReportFilters();
        const { data } = await ReportsService.getReportes({
            userId: user.id,
            pageSize: 1000,
            estado: filters.status,
            startDate: filters.startDate,
            endDate: filters.endDate
        });

        const columns = [
            { header: 'ID Solicitud', key: 'id', width: 15 },
            { header: 'Fecha', key: 'fecha', width: 15 },
            { header: 'Descripción', key: 'desc', width: 40 },
            { header: 'Categoría', key: 'cat', width: 20 },
            { header: 'Estado', key: 'status', width: 15 },
            { header: 'Prioridad', key: 'prio', width: 15 }
        ];

        const tableData = data.map(r => ({
            id: r.numero_solicitud || r.id,
            fecha: new Date(r.creado_en).toLocaleDateString(),
            desc: r.descripcion,
            cat: r.categoria,
            status: r.estado,
            prio: r.prioridad
        }));

        await ReportingService.exportToExcel({
            sheetName: 'Mis Reportes',
            columns,
            data: tableData,
            filename: `historial_reportes_${new Date().getTime()}.xlsx`
        });
    } catch (error) {
        Logger.error('Error exportando excel ciudadano:', error);
    }
}

/** --- MUNICIPAL --- **/

async function exportMunicipalPDF() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data: profile } = await supabaseClient.from('perfiles').select('municipalidad_id, rol').eq('id', user.id).single();

        let muniId = profile?.municipalidad_id;
        const filters = getReportFilters();

        // Si el usuario cambia el filtro de muni y es admin, respetamos eso
        if (profile?.rol === 'admin' && filters.muniId) {
            muniId = filters.muniId;
        }

        if (!muniId) {
            mostrarMensaje('No se identificó la municipalidad para el reporte', 'error');
            return;
        }

        const { data: muniData } = await supabaseClient.from('municipalidades').select('nombre').eq('id', muniId).single();
        const muniNombre = muniData?.nombre || 'Municipalidad';

        const { data } = await ReportsService.getReportes({
            muniId,
            pageSize: 1000,
            estado: filters.status,
            startDate: filters.startDate,
            endDate: filters.endDate
        });

        const stats = {
            total: data.length,
            pendientes: data.filter(r => r.estado === 'pendiente').length,
            en_proceso: data.filter(r => r.estado === 'en_proceso').length,
            resueltos: data.filter(r => r.estado === 'resuelto').length
        };

        const tableData = data.map(r => [
            r.numero_solicitud || r.id.substring(0, 8),
            r.autor_nombre || 'Anónimo',
            r.categoria || 'N/A',
            r.estado,
            new Date(r.creado_en).toLocaleDateString()
        ]);

        await ReportingService.exportToPDF({
            title: `Dashboard Ejecutivo - ${muniNombre}`,
            subtitle: `Resumen Operativo: Total (${stats.total}) | Resueltos (${stats.resueltos}) | Pendientes (${stats.pendientes + stats.en_proceso})`,
            columns: ['ID', 'Ciudadano', 'Categoría', 'Estado', 'Fecha'],
            data: tableData,
            filename: `gestion_municipal_${muniNombre}_${new Date().getTime()}.pdf`
        });

        mostrarMensaje('Reporte ejecutivo generado', 'success');
    } catch (error) {
        Logger.error('Error exportando PDF municipal:', error);
    }
}

async function exportMunicipalExcel() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data: profile } = await supabaseClient.from('perfiles').select('municipalidad_id, rol').eq('id', user.id).single();

        let muniId = profile?.municipalidad_id;
        const filters = getReportFilters();

        if (profile?.rol === 'admin' && filters.muniId) {
            muniId = filters.muniId;
        }

        if (!muniId) return;

        const { data } = await ReportsService.getReportes({
            muniId,
            pageSize: 5000,
            estado: filters.status,
            startDate: filters.startDate,
            endDate: filters.endDate
        });

        const columns = [
            { header: 'Nro Solicitud', key: 'nro', width: 20 },
            { header: 'Fecha', key: 'fecha', width: 15 },
            { header: 'Ciudadano', key: 'ciudadano', width: 25 },
            { header: 'Descripción', key: 'desc', width: 50 },
            { header: 'Estado', key: 'status', width: 15 },
            { header: 'Prioridad', key: 'prio', width: 15 },
            { header: 'Ubicación', key: 'loc', width: 30 }
        ];

        const tableData = data.map(r => ({
            nro: r.numero_solicitud || r.id,
            fecha: new Date(r.creado_en).toLocaleDateString(),
            ciudadano: r.autor_nombre || 'Anónimo',
            desc: r.descripcion,
            status: r.estado,
            prio: r.prioridad,
            loc: r.ubicacion_texto || 'Ver en mapa'
        }));

        await ReportingService.exportToExcel({
            sheetName: 'Planilla de Incidentes',
            columns,
            data: tableData,
            filename: `planilla_municipio_${new Date().getTime()}.xlsx`
        });

        mostrarMensaje('Planilla de incidentes descargada', 'success');
    } catch (error) {
        Logger.error('Error exportando excel municipal:', error);
    }
}

/** --- ADMIN --- **/

async function exportAdminComparison() {
    try {
        // Obtenemos todas las municipalidades y sus contadores de reportes
        const { data: munis, error: mError } = await supabaseClient.from('municipalidades').select('id, nombre');
        if (mError) throw mError;

        const { data: reportCounts, error: rError } = await supabaseClient.rpc('get_muni_stats_v1');
        // Nota: Asumo que existe una RPC o vista, si no, lo calculamos manualmente

        let statsData = [];

        if (rError) {
            // Fallback: cálculo manual (menos eficiente pero seguro para la demo)
            const filters = getReportFilters();
            let query = supabaseClient.from('reportes').select('municipalidad_id, estado, creado_en');

            if (filters.startDate) query = query.gte('creado_en', filters.startDate);
            if (filters.endDate) query = query.lte('creado_en', filters.endDate + 'T23:59:59Z');

            const { data: allReports } = await query;

            statsData = munis.map(m => {
                const mReports = allReports?.filter(r => r.municipalidad_id === m.id) || [];
                return {
                    nombre: m.nombre,
                    total: mReports.length,
                    resueltos: mReports.filter(r => r.estado === 'resuelto').length,
                    tasa: mReports.length > 0 ? ((mReports.filter(r => r.estado === 'resuelto').length / mReports.length) * 100).toFixed(1) + '%' : '0%'
                };
            });
        } else {
            statsData = reportCounts;
        }

        const columns = [
            { header: 'Municipalidad', key: 'nombre', width: 30 },
            { header: 'Total Reportes', key: 'total', width: 15 },
            { header: 'Resueltos', key: 'resueltos', width: 15 },
            { header: 'Tasa de Resolución', key: 'tasa', width: 20 }
        ];

        await ReportingService.exportToExcel({
            sheetName: 'Comparativa Municipal',
            columns,
            data: statsData,
            filename: `comparativa_nacional_${new Date().getTime()}.xlsx`
        });

        mostrarMensaje('Comparativa nacional exportada', 'success');
    } catch (error) {
        Logger.error('Error exportando comparativa admin:', error);
        mostrarMensaje('Error al generar comparativa', 'error');
    }
}
