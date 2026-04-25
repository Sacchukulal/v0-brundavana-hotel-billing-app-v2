"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { logOut, auth } from "@/utils/firebase"
import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"

const navItems = [
  { name: "Dashboard", href: "/" },
  { name: "Billing", href: "/billing" },
  { name: "WhatsApp", href: "/whatsapp" },
  { name: "Reports", href: "/reports" },
  { name: "Expenses", href: "/expenses" },
  { name: "Offers", href: "/offers" },
  { name: "Settings", href: "/settings" },
]

export default function Navbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await logOut()
      router.push("/login")
    } catch (error) {
      console.error("Failed to log out", error)
    }
  }

  return (
    <nav className="bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center gap-2">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design-aQLLymwT81JCZPbI5P28qvJeWBboKz.png"
                alt="BDM Logo"
                className="h-8 w-auto"
              />
              <span className="text-2xl font-bold">Brundavan</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === item.href
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
            {user && (
              <Button variant="ghost" onClick={handleLogout}>
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
