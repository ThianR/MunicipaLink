/**
 * Módulo de Logging para MunicipaLink
 * Permite capturar logs con diferentes niveles de severidad,
 * persistirlos en localStorage y mostrarlos en una consola visual.
 */

const LOG_MAX_ENTRIES = 100;
const STORAGE_KEY = 'municipalink_logs';

export const LogLevel = {
    DEBUG: { name: 'DEBUG', color: '#6b7280' },
    INFO: { name: 'INFO', color: '#3b82f6' },
    WARN: { name: 'WARN', color: '#f59e0b' },
    ERROR: { name: 'ERROR', color: '#ef4444' }
};

class LoggerService {
    constructor() {
        this.logs = this._loadFromStorage();
    }

    debug(message, data = null) { this._log(LogLevel.DEBUG, message, data); }
    info(message, data = null) { this._log(LogLevel.INFO, message, data); }
    warn(message, data = null) { this._log(LogLevel.WARN, message, data); }
    error(message, data = null) { this._log(LogLevel.ERROR, message, data); }

    _log(level, message, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: level.name,
            message: message,
            data: data ? this._sanitizeData(data) : null
        };

        // Consola del navegador con colores
        const consoleMethod = level.name.toLowerCase() === 'debug' ? 'log' : level.name.toLowerCase();
        console[consoleMethod](
            `%c[${entry.level}] %c${entry.timestamp} %c${entry.message}`,
            `color: ${level.color}; font-weight: bold;`,
            'color: #9ca3af;',
            'color: inherit;',
            data || ''
        );

        // Persistencia
        this.logs.unshift(entry);
        if (this.logs.length > LOG_MAX_ENTRIES) {
            this.logs.pop();
        }
        this._saveToStorage();

        // Notificar a la UI si el panel está abierto (vía evento)
        document.dispatchEvent(new CustomEvent('logger:new-entry', { detail: entry }));
    }

    getLogs() {
        return this.logs;
    }

    clear() {
        this.logs = [];
        this._saveToStorage();
        document.dispatchEvent(new CustomEvent('logger:cleared'));
    }

    _sanitizeData(data) {
        try {
            if (data instanceof Error) {
                return {
                    message: data.message,
                    stack: data.stack,
                    name: data.name
                };
            }
            // Evitar datos circulares o pesados
            return JSON.parse(JSON.stringify(data));
        } catch (e) {
            return '[Datos no serializables]';
        }
    }

    _saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
        } catch (e) {
            console.warn('No se pudo guardar el log en localStorage:', e);
        }
    }

    _loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    exportLogs() {
        return this.logs
            .map(l => `[${l.level}] ${l.timestamp}: ${l.message} ${l.data ? JSON.stringify(l.data) : ''}`)
            .join('\n');
    }
}

export const Logger = new LoggerService();
window.Logger = Logger; // Acceso global para debug rápido
