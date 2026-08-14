import axiosClient from '@/lib/axios-client'

export interface AuthResponse {
  status: string
  message: string
  user: any
  data: { token: string; refreshToken: string; type: string }
}

export async function loginApi(email: string, password: string) {
  return axiosClient.post<AuthResponse>('/auth/login', { email, password })
}

export async function registerApi(data: { name: string; email: string; password: string }) {
  return axiosClient.post<AuthResponse>('/auth/register', data)
}

export async function logoutApi() {
  return axiosClient.post('/auth/logout')
}

export async function getProfileApi() {
  return axiosClient.get('/user')
}
