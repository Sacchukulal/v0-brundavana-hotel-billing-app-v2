"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { auth } from "@/utils/firebase"
import { onAuthStateChanged } from "firebase/auth"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticated(true)
      } else if (!["/login", "/signup"].includes(pathname)) {
        router.push("/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router, pathname])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!authenticated && !["/login", "/signup"].includes(pathname)) {
    return null
  }

  return <>{children}</>
}
