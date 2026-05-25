import type { DefaultSession } from 'next-auth'
import type {} from 'next-auth/jwt'

export interface AdminSessionUser {
  id: string
  name?: string | null
  username: string
}

export interface HospitalOption {
  id: string
  name: string
  address: string | null
  phone: string | null
  departmentCount: number
}

export interface DepartmentOption {
  id: string
  hospitalId: string
  hospitalName: string
  name: string
  icon: string
  doctorCount: number
}

export interface DoctorSearchOption {
  id: string
  departmentId: string
  departmentName: string
  hospitalId: string
  hospitalName: string
  title: string
  name: string
}

declare module 'next-auth' {
  interface Session {
    user?: AdminSessionUser & DefaultSession['user']
  }

  interface User {
    username: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string
  }
}
