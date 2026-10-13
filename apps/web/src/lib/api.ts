export type Role = 'STARTUP' | 'MENTOR' | 'INVESTOR' | 'ADMIN';
export type Stage = 'IDEACAO' | 'VALIDACAO' | 'MVP' | 'TRACAO' | 'ESCALA';

export interface User { id: string; name: string; email: string; role: Role; }
export interface Session { accessToken: string; user: User; }
export interface Recommendation {
  userId: string; name: string; kind: 'STARTUP' | 'MENTOR' | 'INVESTOR'; title: string | null;
  sectors: string[]; city: string; state: string; score: number; highlights: string[]; interestSent: boolean;
  description?: string | null; stage?: Stage; ticketNeeded?: number | null; needs?: string[]; impactAreas?: string[];
  headline?: string | null; expertise?: string[]; thesis?: string | null; stages?: Stage[]; ticketMin?: number | null; ticketMax?: number | null;
}
export interface Profile {
  id?: string; userId?: string; companyName?: string; description?: string; sectors: string[];
  stage?: Stage; ticketNeeded?: number | null; city: string; state: string; impactAreas: string[];
  needs?: string[]; headline?: string; stages?: Stage[]; expertise?: string[]; thesis?: string;
  ticketMin?: number; ticketMax?: number;
}
export interface Connection { id: string; name: string; email?: string; role: Role; receivedAt?: string; connectedAt?: string; }
export interface RecommendationFilters { kind?: 'MENTOR' | 'INVESTOR'; sector?: string; search?: string; stage?: Stage; minScore?: number; limit?: number; }

const TOKEN_KEY = 'nexo.token';
export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* sessão temporária */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignorado */ } },
};
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch('/api' + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(body.message) ? body.message.join(' · ') : body.message;
    throw new ApiError(res.status, msg ?? 'Não foi possível concluir a ação');
  }
  return body as T;
}
export const api = {
  login: (email: string, password: string) => request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: { name: string; email: string; password: string; role: Role; consent: boolean }) =>
    request<Session>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<User>('/auth/me'),
  profile: () => request<Profile>('/profiles/me'),
  saveProfile: (data: Record<string, unknown>) => request<Profile>('/profiles/me', { method: 'PUT', body: JSON.stringify(data) }),
  recommendations: (filters: RecommendationFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.kind) params.set('kind', filters.kind);
    if (filters.sector?.trim()) params.set('sector', filters.sector.trim());
    if (filters.search?.trim()) params.set('search', filters.search.trim());
    if (filters.stage) params.set('stage', filters.stage);
    if (filters.minScore !== undefined) params.set('minScore', String(filters.minScore));
    params.set('limit', String(filters.limit ?? 10));
    return request<Recommendation[]>('/matchmaking/recommendations?' + params.toString());
  },
  interest: (userId: string) => request<{ mutual: boolean; contact?: { name: string; email: string } }>('/connections/' + userId + '/interest', { method: 'POST' }),
  pendingConnections: () => request<Connection[]>('/connections/pending'),
  mutualConnections: () => request<Connection[]>('/connections'),
};
