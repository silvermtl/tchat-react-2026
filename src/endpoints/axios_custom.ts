import axios, { type InternalAxiosRequestConfig } from "axios";
import config from "../config/env";

// Export des variables d'environnement pour rétrocompatibilité
export const ENV = config.mode;
export const BASE_URL = config.apiUrl;

// Instance Axios configurée
const instanceAxios = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  timeout: 10000, // 10 secondes
  headers: {
    'Content-Type': 'application/json',
  },
});

type AxiosConfigWithAbort = InternalAxiosRequestConfig & {
  abortController?: AbortController;
};

// Intercepteur de requête
instanceAxios.interceptors.request.use(
  (axiosConfig) => {
    const cfg = axiosConfig as AxiosConfigWithAbort;

    if (!cfg.signal) {
      const controller = new AbortController();
      cfg.signal = controller.signal;
      cfg.abortController = controller;
    }

    // Ajouter le token JWT si présent
    const token = localStorage.getItem('token');
    
    if (token && cfg.headers) {
      
      cfg.headers.Authorization = `Bearer ${token}`;
    }

    return cfg;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse
instanceAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.code === "ERR_CANCELED") {
      console.warn("Requête annulée :", error.message);
    } else if (error?.response?.status === 401) {
      console.warn("Non autorisé - Token expiré ou invalide");
      // Optionnel: rediriger vers login
      // localStorage.removeItem('auth_token');
      // window.location.href = '/';
    } else {
      console.error("Erreur Axios :", error);
    }
    return Promise.reject(error);
  }
);

export { instanceAxios as axios };
