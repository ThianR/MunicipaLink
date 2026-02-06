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
            manejarAuthUsuario(session.user);
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
            }
        });
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
            if (btnLogin) btnLogin.disabled = true;
            const { error } = await supabaseClient.auth.signInWithPassword({
                email: emailAuth.value, password: passwordAuth.value
            });
            if (error) mostrarMensaje(error.message, 'error');
            if (btnLogin) btnLogin.disabled = false;
        });
    }

    if (btnRegistro) {
        btnRegistro.addEventListener('click', async () => {
            if (!emailAuth.value || !passwordAuth.value) return mostrarMensaje('Email/Contraseña requeridos', 'error');
            btnRegistro.disabled = true;
            const { error } = await supabaseClient.auth.signUp({ email: emailAuth.value, password: passwordAuth.value });
            if (error) mostrarMensaje(error.message, 'error');
            else mostrarMensaje('¡Verifica tu email!', 'success');
            btnRegistro.disabled = false;
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

    // Lógica para cerrar modales (podría ser genérica en UI)
    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.classList.remove('modal--active'));
        }
    });
}

async function solicitarResetPassword(email) {
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href, // Redirects back here
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
    try {
        const { data: perfil } = await supabaseClient.from('perfiles').select('rol').eq('id', usuario.id).single();
        aplicarRol(perfil ? perfil.rol : 'ciudadano');
    } catch (err) {
        aplicarRol('ciudadano');
    }

    actualizarVisualizacionUsuario(usuario.email || usuario.id);
    cambiarPantalla('app');
    mostrarMensaje(`Bienvenido, ${usuario.email}`, 'success');

    document.dispatchEvent(new CustomEvent('auth:login', { detail: { user: usuario } }));
}

function manejarLoginInvitado() {
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
