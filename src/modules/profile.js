import { supabaseClient } from '../services/supabase.js';
import { AuthModule } from './auth.js';
import { UIModule } from './ui.js';
import { mostrarMensaje } from '../utils/ui.js';
import { Logger } from '../utils/logger.js';

export const ProfileModule = {
    init: () => {
        setupListeners();
        document.addEventListener('auth:login', () => {
            // Recargar perfil al loguear
            if (UIModule.getCurrentView() === 'profile') cargarPerfil();
        });
        document.addEventListener('auth:logout', () => {
            limpiarUI();
        });
        document.addEventListener('auth:guest', () => {
            limpiarUI();
        });
        document.addEventListener('ui:view-changed', (e) => {
            if (e.detail.view === 'profile') {
                // Si no se especificó un usuario, cargamos el propio
                if (!ProfileModule.currentUserViewing) cargarPerfil();
            } else {
                // Al salir de perfil, reseteamos el usuario visto
                ProfileModule.currentUserViewing = null;
            }
        });
        document.addEventListener('profile:load-user', (e) => {
            const userId = e.detail.userId;
            if (userId) {
                ProfileModule.currentUserViewing = userId;
                cargarPerfil(userId);
            }
        });
    },
    openPublicProfile: abrirPerfilPublico,
    currentUserViewing: null
};

function setupListeners() {
    const formProfile = document.getElementById('form-profile');
    if (formProfile) formProfile.addEventListener('submit', guardarPerfil);

    // Previsualización de Avatar
    const inputAvatar = document.getElementById('input-avatar');
    if (inputAvatar) inputAvatar.addEventListener('change', manejarCambioAvatar);

    // Formulario de Solicitud Municipal
    const formRequest = document.getElementById('form-municipal-request');
    if (formRequest) formRequest.addEventListener('submit', enviarSolicitudMunicipal);

    // Pestañeo de Perfil
    const tabBtns = document.querySelectorAll('.profile-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.profileTab;
            cambiarPestanaPerfil(tabId);
        });
    });

    // Interacciones de perfil público
    document.addEventListener('click', (e) => {
        if (e.target.matches('.user-link') || e.target.closest('.user-link')) {
            const el = e.target.matches('.user-link') ? e.target : e.target.closest('.user-link');
            const userId = el.dataset.userId;
            if (userId) abrirPerfilPublico(userId);
        }
    });

    const btnClosePublic = document.getElementById('btn-close-public-profile');
    if (btnClosePublic) btnClosePublic.addEventListener('click', () => {
        document.getElementById('modal-public-profile').classList.remove('modal--active');
    });

    // Guía de XP
    const btnOpenXP = document.getElementById('btn-open-xp-guide');
    if (btnOpenXP) btnOpenXP.addEventListener('click', () => {
        document.getElementById('modal-xp-guide').classList.add('modal--active');
        lucide.createIcons();
    });

    document.getElementById('btn-close-xp-guide')?.addEventListener('click', () => {
        document.getElementById('modal-xp-guide').classList.remove('modal--active');
    });

    // Volver del perfil
    document.getElementById('btn-back-profile')?.addEventListener('click', () => {
        UIModule.changeView('map');
    });

    // Historial de reportes
    document.getElementById('btn-my-history')?.addEventListener('click', () => {
        UIModule.changeView('reports');
        UIModule.changeTab('my-requests');
    });

    // Limpiar estado al navegar a 'Mi Perfil' desde el sidebar
    document.querySelectorAll('.nav__item[data-view="profile"]').forEach(item => {
        item.addEventListener('click', () => {
            ProfileModule.currentUserViewing = null;
        });
    });
}

function cambiarPestanaPerfil(tabId) {
    // Botones
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.profileTab === tabId);
    });

    // Paneles
    document.querySelectorAll('.profile-tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `profile-pane-${tabId}`);
    });
}

async function cargarPerfil(explicitUserId) {
    const me = AuthModule.getUsuarioActual();
    const targetUserId = explicitUserId || me?.id;

    if (!targetUserId) {
        limpiarUI();
        mostrarMensajeInvitado();
        return;
    }

    // Ocultar mensaje invitado si hay usuario
    const guestMsg = document.getElementById('guest-welcome-message');
    if (guestMsg) guestMsg.style.display = 'none';
    const profileForm = document.getElementById('form-profile');
    if (profileForm) profileForm.style.display = 'block';
    const profileMain = document.querySelector('.profile-main');
    if (profileMain) profileMain.style.display = 'block';

    const tabsNav = document.querySelector('.profile-tabs-nav');
    if (tabsNav) tabsNav.style.display = 'flex';

    const isMe = me && targetUserId === me.id;

    // Adaptar UI según si es mi perfil o un perfil ajeno
    const titleEl = document.querySelector('#view-profile .view-header h2');
    const saveBtn = document.getElementById('btn-save-profile');
    const avatarBtn = document.querySelector('.profile-avatar-section .btn-guest');
    const trustCard = document.querySelector('.trust-meter-card');
    const backBtnText = document.querySelector('#btn-back-profile span') || { textContent: '' };

    if (titleEl) titleEl.innerHTML = isMe ? '<i data-lucide="award"></i> Mi Perfil y Rango' : '<i data-lucide="user"></i> Perfil del Ciudadano';
    if (saveBtn) saveBtn.parentElement.style.display = isMe ? 'flex' : 'none';
    if (avatarBtn) avatarBtn.style.display = isMe ? 'block' : 'none';
    if (trustCard) trustCard.style.display = isMe ? 'block' : 'none';

    // Manejo de visibilidad de la pestaña municipal
    const muniTabBtn = document.querySelector('.profile-tab-btn[data-profile-tab="municipal"]');
    if (muniTabBtn) muniTabBtn.style.display = isMe ? 'flex' : 'none';

    // Asegurar que empezamos en la pestaña personal al cambiar de usuario o entrar
    cambiarPestanaPerfil('personal');

    // Control de visibilidad de campos privados
    document.querySelectorAll('.private-field').forEach(el => {
        if (isMe) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    // Botón naranja "Ver sus reportes" en la vista de perfil cuando es perfil ajeno
    let btnHistory = document.getElementById('btn-my-history');
    if (btnHistory) {
        if (isMe) {
            btnHistory.className = 'btn-guest';
            btnHistory.innerHTML = '<i data-lucide="history"></i> Mi Historial de Reportes';
            btnHistory.onclick = null; // Usar el listener de setupListeners
        } else {
            btnHistory.className = 'btn-orange';
            btnHistory.innerHTML = '<i data-lucide="external-link"></i> Ver sus reportes';
            btnHistory.onclick = () => {
                const searchVal = document.querySelector('input[name="alias"]')?.value || '';
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = searchVal;
                UIModule.changeView('reports');
                UIModule.changeTab('all-requests');
                // Disparar recarga si es necesario o el modulo lo captura
                document.dispatchEvent(new CustomEvent('ui:request-reload-reports', { detail: { search: searchVal } }));
            };
        }
        if (window.lucide) lucide.createIcons();
    }

    try {
        // Intentar cargar perfil completo (para dueño o admin)
        let { data: perfil, error } = await supabaseClient
            .from('perfiles')
            .select('*')
            .eq('id', targetUserId)
            .maybeSingle();

        // Si no se encuentra (por RLS o no existe), y no somos nosotros, intentar vista pública
        if ((!perfil || error) && !isMe) {
             const { data: publicPerfil, error: publicError } = await supabaseClient
                .from('perfiles_publicos')
                .select('*')
                .eq('id', targetUserId)
                .maybeSingle();

             if (publicPerfil && !publicError) {
                 perfil = publicPerfil;
                 error = null;
             } else if (publicError) {
                 // Si falla también la vista pública, mantenemos el error original o el nuevo
                 error = error || publicError;
             }
        }

        if (error) throw error;

        // Cargar estadísticas gamificadas (votos, reportes, etc)
        cargarEstadisticasGamificacion(targetUserId, true);

        const form = document.getElementById('form-profile');
        if (form) {
            form.alias.value = perfil?.alias || '';
            form.nombre_completo.value = perfil?.nombre_completo || '';
            form.fecha_nacimiento.value = perfil?.fecha_nacimiento || '';
            form.genero.value = perfil?.genero || '';
            form.contacto.value = perfil?.contacto || '';
            form.direccion.value = perfil?.direccion || '';

            // Hacer campos readonly si no soy yo
            Array.from(form.elements).forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                    el.readOnly = !isMe;
                    if (el.tagName === 'SELECT') el.disabled = !isMe;
                }
            });
        }

        actualizarPreviewAvatar(perfil?.avatar_url);
        if (isMe) {
            actualizarTrustMeter(perfil || {});
            cargarEstadoSolicitudMunicipal(targetUserId);
        }

    } catch (err) {
        console.error(err);
        mostrarMensaje('Error cargando perfil', 'error');
    }
}

async function guardarPerfil(e) {
    e.preventDefault();
    const user = AuthModule.getUsuarioActual();
    if (!user) return;

    const btn = document.getElementById('btn-save-profile');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const formData = new FormData(e.target);
    const updates = {
        id: user.id,
        alias: formData.get('alias'),
        nombre_completo: formData.get('nombre_completo'),
        // No overwrite alias with empty if multiple fields exist
        fecha_nacimiento: formData.get('fecha_nacimiento') || null,
        genero: formData.get('genero'),
        contacto: formData.get('contacto'),
        direccion: formData.get('direccion'),
        actualizado_en: new Date().toISOString()
    };

    try {
        const inputAvatar = document.getElementById('input-avatar');
        if (inputAvatar.files.length > 0) {
            const file = inputAvatar.files[0];
            const path = `avatars/${user.id}_${Date.now()}`;
            await supabaseClient.storage.from('evidencias').upload(path, file);
            const { data } = supabaseClient.storage.from('evidencias').getPublicUrl(path);
            updates.avatar_url = data.publicUrl;
        }

        const { error } = await supabaseClient.from('perfiles').upsert(updates);
        if (error) throw error;

        mostrarMensaje('Perfil actualizado', 'success');
        cargarPerfil();
    } catch (err) {
        mostrarMensaje(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar Cambios';
    }
}

async function cargarEstadisticasGamificacion(userId, isMe) {
    const observer = AuthModule.getUsuarioActual();
    try {
        const { data, error } = await supabaseClient.rpc('obtener_datos_gamificacion', {
            target_user_id: userId,
            observer_id: observer ? observer.id : null
        });

        if (error) throw error;
        const stats = data[0];

        if (isMe && stats) {
            document.getElementById('user-badge').textContent = stats.insignia || '-';
            document.getElementById('user-rank').textContent = stats.rango || 'Novato';
            document.getElementById('user-level-num').textContent = stats.nivel || 1;
            document.getElementById('level-progress-fill').style.width = `${stats.progreso_porcentaje}%`;
            document.getElementById('level-xp-text').textContent = `${stats.total_xp} / ${stats.proximo_nivel_xp} XP`;

            // Contadores
            updateStat('stat-reports', stats.total_reportes);
            updateStat('stat-comments', stats.total_comentarios);
            updateStat('stat-votes', stats.total_interacciones);
            updateStat('stat-followers', stats.seguidores_count);
            updateStat('stat-following', stats.siguiendo_count);
        }
        return stats;
    } catch (e) {
        console.error(e);
        return {};
    }
}

function updateStat(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val !== undefined && val !== null ? val : 0;
}

function limpiarUI() {
    const form = document.getElementById('form-profile');
    if (form) form.reset();

    // Limpiar stats
    ['stat-reports', 'stat-comments', 'stat-votes', 'stat-followers', 'stat-following'].forEach(id => updateStat(id, 0));

    // Limpiar badge y rango
    const badge = document.getElementById('user-badge');
    if (badge) badge.textContent = '🧊';
    const rank = document.getElementById('user-rank');
    if (rank) rank.textContent = 'Visitante';
    const level = document.getElementById('user-level-num');
    if (level) level.textContent = '0';

    // Limpiar barras
    const levelFill = document.getElementById('level-progress-fill');
    if (levelFill) levelFill.style.width = '0%';
    const xpText = document.getElementById('level-xp-text');
    if (xpText) xpText.textContent = '0 / 500 XP';

    const trustFill = document.getElementById('trust-progress-fill');
    if (trustFill) trustFill.style.width = '0%';
    const multiplier = document.getElementById('trust-multiplier');
    if (multiplier) multiplier.textContent = '1.0x';

    actualizarPreviewAvatar(null);
}

function mostrarMensajeInvitado() {
    const guestMsg = document.getElementById('guest-welcome-message');
    const profileForm = document.getElementById('form-profile');
    const tabsNav = document.querySelector('.profile-tabs-nav');

    if (guestMsg) guestMsg.style.display = 'block';
    if (profileForm) profileForm.style.display = 'none';
    if (tabsNav) tabsNav.style.display = 'none';
}

function actualizarPreviewAvatar(url) {
    const preview = document.getElementById('profile-avatar-preview');
    if (preview) {
        preview.innerHTML = url
            ? `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`
            : `<i data-lucide="user"></i>`;
        lucide.createIcons();
    }
}

function manejarCambioAvatar(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('profile-avatar-preview');
            if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; opacity:0.5;">`;
        };
        reader.readAsDataURL(file);
    }
}

function actualizarTrustMeter(perfil) {
    if (!perfil) return;

    let score = 0;
    const fields = ['nombre_completo', 'avatar_url', 'contacto', 'direccion', 'fecha_nacimiento', 'genero', 'alias'];

    fields.forEach(f => {
        const val = perfil[f];
        if (val !== null && val !== undefined && val !== '') {
            score++;
        }
    });

    const pct = (score / fields.length) * 100;
    Logger.debug('Actualizando Trust Meter', { score, total: fields.length, pct, perfil });

    const fill = document.getElementById('trust-progress-fill');
    if (fill) {
        fill.style.width = `${pct}%`;
        // Asegurar que sea visible si tiene progreso
        fill.style.backgroundColor = pct > 0 ? '#10b981' : 'transparent';
    }

    const multiplierEl = document.getElementById('trust-multiplier');
    if (multiplierEl) {
        const multiplier = 1 + (score / fields.length); // 1.0x a 2.0x
        multiplierEl.textContent = `${multiplier.toFixed(1)}x`;
    }
}

async function abrirPerfilPublico(userId) {
    // ... logic to open modal and load public stats ...
    // Using simple implementation similar to app.js
    const modal = document.getElementById('modal-public-profile');
    modal.classList.add('modal--active');

    const content = document.getElementById('public-profile-content');
    content.innerHTML = 'Cargando...';

    try {
        const { data: perfil } = await supabaseClient.from('perfiles_publicos').select('*').eq('id', userId).single();
        const stats = await cargarEstadisticasGamificacion(userId, false);

        // Render content (HTML generation as in app.js)
        content.innerHTML = `
            <div class="public-profile-header">
                 <h3>@${perfil.alias || 'Usuario'}</h3>
                 <p>${stats.rango || 'Novato'} - Nivel ${stats.nivel || 1}</p>
                 <button id="btn-follow-public" class="btn-action">${stats.lo_sigo ? 'Dejar de Seguir' : 'Seguir'}</button>
            </div>
            <!-- Stats Grid -->
        `;

        const btnFollow = document.getElementById('btn-follow-public');
        if (btnFollow) {
            btnFollow.onclick = () => toggleSeguir(userId, stats.lo_sigo);
        }

    } catch (e) {
        content.innerHTML = 'Error al cargar.';
    }
}

async function toggleSeguir(targetId, following) {
    const user = AuthModule.getUsuarioActual();
    if (!user) return mostrarMensaje('Login requerido', 'info');

    if (following) {
        await supabaseClient.from('seguidores').delete().eq('seguidor_id', user.id).eq('siguiendo_id', targetId);
    } else {
        await supabaseClient.from('seguidores').insert({ seguidor_id: user.id, siguiendo_id: targetId });
    }
    abrirPerfilPublico(targetId); // Refresh
}

async function cargarEstadoSolicitudMunicipal(userId) {
    const statusContainer = document.getElementById('municipal-status-container');
    const formContainer = document.getElementById('municipal-request-form-container');
    if (!statusContainer || !formContainer) return;

    // Reset inicial
    statusContainer.innerHTML = '';
    statusContainer.style.display = 'none';
    formContainer.style.display = 'block';

    try {
        // 1. Cargar municipalidades para el selector
        const { data: munis } = await supabaseClient.from('municipalidades').select('id, nombre').order('nombre');
        const selector = document.getElementById('request-muni-selector');
        if (selector && selector.children.length <= 1) {
            munis.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.nombre;
                selector.appendChild(opt);
            });
        }

        // 2. Verificar rol actual
        const { data: profile } = await supabaseClient.from('perfiles').select('rol').eq('id', userId).single();

        // 3. Verificar solicitudes previas
        const { data: req } = await supabaseClient
            .from('solicitudes_municipales')
            .select('*')
            .eq('usuario_id', userId)
            .in('estado', ['pendiente', 'en_revision', 'aprobado', 'rechazado'])
            .order('creado_en', { ascending: false })
            .limit(1)
            .maybeSingle();

        // Si ya es Admin o Municipal, mostrar Verificado y ocultar formulario
        if (profile.rol === 'admin' || profile.rol === 'municipal') {
            formContainer.style.display = 'none';
            statusContainer.style.display = 'block';

            // Obtener nombre de la municipalidad si aplica
            let muniNombre = null;
            if (profile.rol === 'municipal') {
                // Intentar desde solicitud aprobada
                const muniId = req?.municipalidad_id;
                if (muniId) {
                    const { data: muniData } = await supabaseClient
                        .from('municipalidades')
                        .select('nombre')
                        .eq('id', muniId)
                        .maybeSingle();
                    muniNombre = muniData?.nombre || null;
                }
                // Fallback: desde perfiles.municipalidad_id
                if (!muniNombre) {
                    const { data: perfilMuni } = await supabaseClient
                        .from('perfiles')
                        .select('municipalidad_id, municipalidades(nombre)')
                        .eq('id', userId)
                        .maybeSingle();
                    muniNombre = perfilMuni?.municipalidades?.nombre || null;
                }
            }

            statusContainer.innerHTML = `
                <div class="status-card-verified" style="text-align: center; padding: 3rem 1rem;">
                    <div class="verified-badge-large">
                        <i data-lucide="shield-check"></i>
                    </div>
                    <h3 style="margin-top: 1.5rem; color: var(--text-main);">Perfil Verificado</h3>
                    <p style="color: var(--text-muted); max-width: 400px; margin: 0.5rem auto 1.5rem;">
                        Tu cuenta tiene rango de <strong>${profile.rol.toUpperCase()}</strong>. 
                        Ya puedes gestionar reportes y departamentos desde tu panel correspondiente.
                    </p>
                    ${muniNombre ? `
                        <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1.25rem;
                            background: var(--primary-ultra-light, #ecfdf5); color: var(--primary, #10b981);
                            border-radius: 999px; font-size: 0.875rem; font-weight: 600; margin-bottom: 1.5rem;
                            border: 1px solid var(--primary-light, #a7f3d0);">
                            <i data-lucide="building-2" style="width:16px;height:16px;"></i>
                            Municipalidad de ${muniNombre}
                        </div>
                    ` : ''}
                    ${profile.rol === 'admin' ?
                    '<button id="btn-goto-admin-from-profile" class="button button--action">Ir al Panel Admin</button>' :
                    '<p class="text-success"><i data-lucide="check"></i> Verificación Activa</p>'
                }
                </div>
            `;

            const btnGoAdmin = document.getElementById('btn-goto-admin-from-profile');
            if (btnGoAdmin) {
                btnGoAdmin.onclick = () => UIModule.changeView('admin');
            }

            if (window.lucide) lucide.createIcons();
            return;
        }


        // Si hay una solicitud en curso (Pendiente o en Revisión)
        if (req && (req.estado === 'pendiente' || req.estado === 'en_revision')) {
            formContainer.style.display = 'none';
            statusContainer.style.display = 'block';
            statusContainer.innerHTML = `
                <div class="status-card-info" style="padding: 2.5rem; border-radius: 16px; background: #eff6ff; border: 1px solid #dbeafe;">
                    <div style="display: flex; gap: 1.5rem; align-items: flex-start;">
                        <div style="background: white; padding: 1rem; border-radius: 12px; box-shadow: var(--shadow-sm);">
                            <i data-lucide="clock" style="color: #2563eb; width: 32px; height: 32px;"></i>
                        </div>
                        <div>
                            <h4 style="color: #1e40af; font-size: 1.125rem; margin-bottom: 0.5rem;">Solicitud en Revisión</h4>
                            <p style="color: #1e3a8a; opacity: 0.8; margin-bottom: 1rem;">
                                Tu petición para ser colaborador municipal está siendo evaluada por nuestro equipo administrativo.
                            </p>
                            <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: rgba(37, 99, 235, 0.1); color: #2563eb; border-radius: 20px; font-size: 0.8125rem; font-weight: 700;">
                                <span class="pulse-indicator"></span>
                                ESTADO: ${req.estado.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Si la solicitud fue rechazada, mostrar mensaje PERO dejar el formulario visible abajo para reintentar
        if (req && req.estado === 'rechazado') {
            statusContainer.style.display = 'block';
            statusContainer.innerHTML = `
                <div class="status-card-danger" style="padding: 2rem; border-radius: 12px; background: #FEF2F2; border: 1px solid #FCA5A5; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.1);">
                    <div style="display: flex; gap: 1rem; align-items: flex-start;">
                        <div style="background: white; padding: 0.75rem; border-radius: 50%; color: #DC2626;">
                            <i data-lucide="alert-circle" width="24" height="24"></i>
                        </div>
                        <div>
                            <h4 style="color: #991B1B; font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 700;">Solicitud Rechazada</h4>
                            <p style="color: #7F1D1D; margin-bottom: 1rem; line-height: 1.5;">
                                Tu solicitud anterior no fue aprobada. Por favor revisa el motivo y envía una nueva solicitud corrigiendo los puntos mencionados.
                            </p>
                            ${req.comentarios_admin ? `
                                <div style="background: rgba(255,255,255,0.6); padding: 1rem; border-left: 4px solid #DC2626; border-radius: 4px;">
                                    <span style="display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #7F1D1D; margin-bottom: 0.25rem; font-weight: 600;">Motivo del Rechazo:</span>
                                    <span style="color: #450A0A; font-weight: 500;">${req.comentarios_admin}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }

    } catch (err) {
        Logger.error('Error al cargar estado de solicitud municipal', err);
    }
}

async function enviarSolicitudMunicipal(e) {
    e.preventDefault();
    const user = AuthModule.getUsuarioActual();
    if (!user) return;

    const btn = document.getElementById('btn-submit-request');
    btn.disabled = true;
    btn.innerHTML = '<i class="spinner"></i> Enviando...';

    const formData = new FormData(e.target);
    const file = document.getElementById('request-document').files[0];

    try {
        if (!file) throw new Error('Debes adjuntar un documento de verificación.');

        // Subir documento
        const fileName = `verificaciones/${user.id}_${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabaseClient.storage.from('evidencias').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabaseClient.storage.from('evidencias').getPublicUrl(fileName);

        // Crear registro
        const { error: insertError } = await supabaseClient.from('solicitudes_municipales').insert({
            usuario_id: user.id,
            municipalidad_id: formData.get('municipalidad_id'),
            documento_url: publicUrl.publicUrl,
            comentarios_ciudadano: formData.get('comentarios'),
            estado: 'pendiente'
        });

        if (insertError) throw insertError;

        mostrarMensaje('¡Solicitud enviada con éxito! Será revisada pronto.', 'success');
        cargarEstadoSolicitudMunicipal(user.id);

    } catch (err) {
        Logger.error('Error al enviar solicitud municipal', err);
        mostrarMensaje(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send"></i> Enviar Solicitud de Rol';
        if (window.lucide) lucide.createIcons();
    }
}
