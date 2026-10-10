import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, type User } from '../api/auth'
import { sessionKey } from './keys'

export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: authApi.me, staleTime: 5 * 60_000, retry: false })
}

function useSignIn(fn: typeof authApi.login) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (user: User) => {
      // Fresh account or new session: drop anything cached from a previous user.
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' })
      qc.setQueryData(sessionKey, user)
    },
  })
}

export const useLogin = () => useSignIn(authApi.login)
export const useSignup = () => useSignIn(authApi.signup)

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      qc.setQueryData(sessionKey, null)
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' })
    },
  })
}
