export type Role = 'STARTUP' | 'MENTOR' | 'INVESTOR' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Session {
  accessToken: string;
  user: User;
}

export interface Recommendation {
  userId: string;
  name: string;
  kind: 'STARTUP' | 'MENTOR' | 'INVESTOR';
  title: string | null;
  city: string;
  state: string;
  score: number;
  highlights: string[];
  interestSent: boolean;
}

const TOKEN_KEY = 'nexo.token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* navegador sem storage: a sessão dura só esta aba */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignorado */
    }
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(body.message) ? body.message.join(' · ') : body.message;
    throw new ApiError(res.status, msg ?? 'Não foi possível concluir a ação');
  }
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: { name: string; email: string; password: string; role: Role; consent: boolean }) =>
    request<Session>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<User>('/auth/me'),
  recommendations: () => request<Recommendation[]>('/matchmaking/recommendations?limit=10'),
  interest: (userId: string) =>
    request<{ mutual: boolean; contact?: { name: string; email: string } }>(`/connections/${userId}/interest`, {
      method: 'POST',
    }),
};
