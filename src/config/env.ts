// ============================================
// CONFIGURATION D'ENVIRONNEMENT - FRONTEND
// ============================================

const MODE = import.meta.env.VITE_MODE_ENV || 'development';
const isProd = MODE === 'production';

// Configuration basée sur l'environnement
const config = {
  // Mode actuel
  mode: MODE,
  isProd,
  isDev: !isProd,

  // URLs API
  apiUrl: isProd
    ? (import.meta.env.VITE_API_URL_PROD || 'https://vps-702866ec.vps.ovh.ca:3000')
    : (import.meta.env.VITE_API_URL_DEV || 'http://localhost:3000'),

  // URLs Socket.IO
  socketUrl: isProd
    ? (import.meta.env.VITE_SOCKET_URL_PROD || 'https://vps-702866ec.vps.ovh.ca:3000')
    : (import.meta.env.VITE_SOCKET_URL_DEV || 'http://localhost:3000'),

  // Rétrocompatibilité avec les anciennes variables
  serverUrl: isProd
    ? (import.meta.env.VITE_URL_SERVER_PROD || 'https://vps-702866ec.vps.ovh.ca:3000')
    : (import.meta.env.VITE_URL_SERVER_DEV || 'http://localhost:3000'),
};

// Log de la configuration (uniquement en développement)
if (!isProd) {
  console.log('🔧 Environment Config:', {
    mode: config.mode,
    apiUrl: config.apiUrl,
    socketUrl: config.socketUrl,
  });
}

export default config;

// Exports individuels pour faciliter l'import
export const { apiUrl, socketUrl, serverUrl, isProd: isProduction, isDev: isDevelopment } = config;
