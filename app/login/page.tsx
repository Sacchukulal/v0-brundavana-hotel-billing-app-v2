"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn, auth } from "@/utils/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { onAuthStateChanged } from "firebase/auth"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/")
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signIn(email, password)
      router.push("/")
    } catch (error) {
      setError("Failed to log in")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="submit">Login</Button>
            <Link href="/signup">
              <Button variant="outline">Sign Up</Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
