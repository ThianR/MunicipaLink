import { supabaseClient } from '../services/supabase.js';
import { AuthModule } from './auth.js';
import { UIModule } from './ui.js';
import { mostrarMensaje } from '../utils/ui.js';

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
        document.getElementById('modal-public-profile').classList.remove('active');
    });

    // Guía de XP
    const btnOpenXP = document.getElementById('btn-open-xp-guide');
    if (btnOpenXP) btnOpenXP.addEventListener('click', () => {
        document.getElementById('modal-xp-guide').classList.add('active');
        lucide.createIcons();
    });

    document.getElementById('btn-close-xp-guide')?.addEventListener('click', () => {
        document.getElementById('modal-xp-guide').classList.remove('active');
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
        const { data: perfil, error } = await supabaseClient
            .from('perfiles')
            .select('*')
            .eq('id', targetUserId)
            .maybeSingle();

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
        if (isMe) actualizarTrustMeter(perfil || {});

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

    if (guestMsg) {
        guestMsg.style.display = 'block';
    }

    if (profileForm) {
        profileForm.style.display = 'none'; // Ocultar formulario para invitados
    }
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
    modal.classList.add('active');

    const content = document.getElementById('public-profile-content');
    content.innerHTML = 'Cargando...';

    try {
        const { data: perfil } = await supabaseClient.from('perfiles').select('*').eq('id', userId).single();
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
