import api from "./api";

export const registerBusiness = async (businessData) => {
  const response = await api.post("/auth/register", businessData);

  return response.data;
};

export const login = async (credentials) => {
  const response = await api.post("/auth/login", credentials);

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");

  return response.data;
};

export const logout = () => {
  return true;
};
