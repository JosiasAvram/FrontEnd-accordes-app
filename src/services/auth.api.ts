import { api } from './api';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const authApi = {
  login: async (input: LoginInput): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', input);
    return data;
  },

  me: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};
