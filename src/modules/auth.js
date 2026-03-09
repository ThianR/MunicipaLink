import { supabaseClient } from '../services/supabase.js';
import { mostrarMensaje, cambiarPantalla, aplicarRol, actualizarVisualizacionUsuario } from '../utils/ui.js';
import { Logger } from '../utils/logger.js';

let usuarioActual = null;

export const AuthModule = {
    init: async () => {
        Logger.info('Inicializando Auth Module...');
        setupListeners();

        // Verificar sesión inicial
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            await manejarAuthUsuario(session.user);
        }

        // Escuchar cambios de autenticación
        supabaseClient.auth.onAuthStateChange(async (evento, sesion) => {
            Logger.info(`Evento Auth: ${evento}`);
            if (evento === 'SIGNED_IN') {
                manejarAuthUsuario(sesion.user);
            } else if (evento === 'SIGNED_OUT') {
                manejarCierreSesion();
            } else if (evento === 'PASSWORD_RECOVERY') {
                document.getElementById('modal-update-password').classList.add('modal--active');
                // Limpiar el hash de la URL para evitar recargas molestas
                window.history.replaceState(null, null, window.location.pathname);
            }
        });

        // Comprobación manual de hash (por si el evento no dispara a tiempo)
        if (window.location.hash.includes('type=recovery')) {
            // Limpiar el hash de la URL inmediatamente
            window.history.replaceState(null, null, window.location.pathname);

            setTimeout(() => {
                const modal = document.getElementById('modal-update-password');
                if (modal && !modal.classList.contains('modal--active')) {
                    modal.classList.add('modal--active');
                }
            }, 500);
        }
    },

    getUsuarioActual: () => usuarioActual,
    isGuest: () => usuarioActual === null
};

function setupListeners() {
    const btnLogin = document.getElementById('btn-login');
    const formAuth = document.getElementById('form-auth');
    const emailAuth = document.getElementById('auth-email');
    const passwordAuth = document.getElementById('auth-password');
    const btnRegistro = document.getElementById('btn-signup');
    const btnGoogle = document.getElementById('btn-login-google');
    const btnGuest = document.getElementById('btn-login-guest');
    const btnLogout = document.getElementById('btn-logout');

    // Restablecimiento de contraseña
    const btnForgot = document.getElementById('btn-forgot-password');
    const formReset = document.getElementById('form-reset-request');
    const formUpdate = document.getElementById('form-update-password');

    if (formAuth) {
        formAuth.addEventListener('submit', async (e) => {
            e.preventDefault();
            const groupConfirm = document.getElementById('group-confirm-password');
            const inputConfirm = document.getElementById('auth-confirm-password');

            if (groupConfirm.style.display === 'none') {
                // Modo LOGIN
                if (btnLogin) btnLogin.disabled = true;
                const { error } = await supabaseClient.auth.signInWithPassword({
                    email: emailAuth.value, password: passwordAuth.value
                });
                if (error) mostrarMensaje(error.message, 'error');
                if (btnLogin) btnLogin.disabled = false;
            } else {
                // Modo REGISTRO (reutilizamos el click de btnRegistro si es submit por Enter)
                btnRegistro.click();
            }
        });
    }

    if (btnRegistro) {
        btnRegistro.addEventListener('click', async () => {
            const groupConfirm = document.getElementById('group-confirm-password');
            const btnLogin = document.getElementById('btn-login');
            const inputConfirm = document.getElementById('auth-confirm-password');
            const title = document.querySelector('.form-title');
            const subtitle = document.querySelector('.form-subtitle');

            // Si el campo de confirmación no es visible, estamos cambiando a modo REGISTRO
            if (groupConfirm.style.display === 'none') {
                groupConfirm.style.display = 'block';
                inputConfirm.required = true;
                btnLogin.textContent = 'Crear Cuenta';
                btnRegistro.textContent = '¿Ya tienes cuenta? Inicia Sesión';
                title.textContent = 'Crea tu cuenta';
                subtitle.textContent = 'Únete a la gestión ciudadana de tu municipio';

                // Poner foco en el input de correo
                emailAuth.focus();
            } else {
                // Si ya es visible, procedemos con el registro con validación
                if (!emailAuth.value || !passwordAuth.value || !inputConfirm.value) {
                    return mostrarMensaje('Todos los campos son requeridos', 'error');
                }

                if (passwordAuth.value !== inputConfirm.value) {
                    return mostrarMensaje('Las contraseñas no coinciden', 'error');
                }

                btnRegistro.disabled = true;
                const { error } = await supabaseClient.auth.signUp({
                    email: emailAuth.value,
                    password: passwordAuth.value
                });

                if (error) {
                    mostrarMensaje(error.message, 'error');
                } else {
                    mostrarMensaje('¡Registro exitoso! Verifica tu email', 'success');
                    // Volver a modo login
                    groupConfirm.style.display = 'none';
                    inputConfirm.required = false;
                    btnLogin.textContent = 'Iniciar Sesión';
                    btnRegistro.textContent = '¿No tienes cuenta? Regístrate';
                    title.textContent = 'Bienvenido';
                    subtitle.textContent = 'Inicia sesión para continuar con tus gestiones';
                }
                btnRegistro.disabled = false;
            }
        });
    }

    if (btnGoogle) {
        btnGoogle.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'google' }));
    }

    if (btnGuest) {
        btnGuest.addEventListener('click', manejarLoginInvitado);
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => supabaseClient.auth.signOut());
    }

    // Listeners para restablecer contraseña
    if (btnForgot) {
        btnForgot.addEventListener('click', () => {
            document.getElementById('modal-reset-request').classList.add('modal--active');
        });
    }

    if (formReset) {
        formReset.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value;
            await solicitarResetPassword(email);
        });
    }

    if (formUpdate) {
        formUpdate.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nueva = document.getElementById('new-password').value;
            const confirm = document.getElementById('confirm-password').value;
            if (nueva !== confirm) return mostrarMensaje('No coinciden', 'error');
            await actualizarPassword(nueva);
        });
    }

    // Lógica para cerrar modales
    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('modal--active');
            });
        }
    });

    // Cerrar con tecla Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal--active').forEach(modal => {
                modal.classList.remove('modal--active');
            });
        }
    });
}

async function solicitarResetPassword(email) {
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // Redirects back here
        });
        if (error) throw error;
        mostrarMensaje('Enlace de recuperación enviado', 'success');
        document.getElementById('modal-reset-request').classList.remove('modal--active');
    } catch (err) {
        mostrarMensaje(err.message, 'error');
    }
}

async function actualizarPassword(password) {
    try {
        const { error } = await supabaseClient.auth.updateUser({ password });
        if (error) throw error;
        mostrarMensaje('Contraseña actualizada', 'success');
        document.getElementById('modal-update-password').classList.remove('modal--active');
    } catch (err) {
        mostrarMensaje(err.message, 'error');
    }
}

async function manejarAuthUsuario(usuario) {
    usuarioActual = usuario;
    let perfil = null;
    try {
        const { data } = await supabaseClient.from('perfiles').select('rol').eq('id', usuario.id).single();
        perfil = data;
        Logger.info(`Rol recuperado de BD: ${perfil?.rol}`);
        aplicarRol(perfil ? perfil.rol : 'ciudadano');
    } catch (err) {
        Logger.error('Error al recuperar perfil:', err);
        aplicarRol('ciudadano');
    }

    actualizarVisualizacionUsuario(usuario.email || usuario.id);
    cambiarPantalla('app');
    mostrarMensaje(`Bienvenido, ${usuario.email}`, 'success');

    document.dispatchEvent(new CustomEvent('auth:login', { detail: { user: usuario, rol: perfil?.rol || 'ciudadano' } }));

}


async function manejarLoginInvitado() {
    Logger.info('Entrando como invitado...');

    try {
        // Cerrar sesión previa en Supabase para evitar conflictos de identidad
        await supabaseClient.auth.signOut();
        // Limpiar cualquier residuo de sesión en el storage
        localStorage.clear();
        sessionStorage.clear();
    } catch (error) {
        Logger.warn('Error al limpiar sesión previa:', error);
    }

    usuarioActual = null;
    aplicarRol('guest');
    actualizarVisualizacionUsuario('Invitado / Anónimo');
    cambiarPantalla('app');
    mostrarMensaje('Modo invitado activo', 'info');

    document.dispatchEvent(new CustomEvent('auth:guest'));
}

function manejarCierreSesion() {
    usuarioActual = null;
    cambiarPantalla('login');
    document.dispatchEvent(new CustomEvent('auth:logout'));
}

window.AuthModule = AuthModule;
