import axios, { type InternalAxiosRequestConfig } from "axios";

export const ENV = import.meta.env.MODE;

export const BASE_URL =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_URL_SERVER_DEV
    : import.meta.env.VITE_URL_SERVER_PROD;

const instanceAxios = axios.create({
  baseURL: BASE_URL,          // ✅ plus en dur
  withCredentials: true,
});

// ✅ Type local
type AxiosConfigWithAbort = InternalAxiosRequestConfig & {
  abortController?: AbortController;
};

instanceAxios.interceptors.request.use(
  function (config) {
    const cfg = config as AxiosConfigWithAbort;

    if (!cfg.signal) {
      const controller = new AbortController();
      cfg.signal = controller.signal;
      cfg.abortController = controller;
    }

    return cfg;
  },
  function (error) {
    return Promise.reject(error);
  }
);

instanceAxios.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error?.code === "ERR_CANCELED") {
      console.warn("Requête annulée :", error.message);
    } else {
      console.error("Erreur Axios :", error);
    }
    return Promise.reject(error);
  }
);

export { instanceAxios as axios };