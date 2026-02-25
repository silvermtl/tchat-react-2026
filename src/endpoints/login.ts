import { axios } from "./axios_custom";


type AuthPayload = {
  username: string;
  password: string;
   fingerPrint: string; // ✅ ajouté
};

export const auth = (data: AuthPayload) => {
  return axios
    .post("/api/auth", data, {
      withCredentials: true, // ✅ IMPORTANT pour cookie httpOnly
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
    .then((res) => res.data)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };

      if (err?.response?.status === 429) {
        // tu peux mettre ton message rate limit ici
      } else {
        const msg =
          err?.response?.data?.msg ||
          err?.response?.data?.error ||
          err?.response?.data?.message;

        console.error(
          "Une erreur s'est produite lors de la requête d'authentification :",
          msg || error
        );
      }

      throw error;
    });
};
