import { ApiError, request } from './client'

export interface User {
  id: number
  email: string
  created_at: string
}

export interface CredentialsInput {
  email: string
  password: string
}

export const authApi = {
  /** The signed-in user, or null when there is no valid session. */
  me: async (): Promise<User | null> => {
    try {
      return await request<User>('/auth/me')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null
      throw err
    }
  },
  signup: (input: CredentialsInput) =>
    request<User>('/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: CredentialsInput) =>
    request<User>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
}
