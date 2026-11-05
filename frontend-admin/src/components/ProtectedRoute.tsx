import { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { isAuthenticated } from "@/lib/pocketbase"

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

