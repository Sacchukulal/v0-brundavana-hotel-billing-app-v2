import type React from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import Navbar from "@/components/navbar"
import ProtectedRoute from "@/components/protected-route"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Veg Hotel App",
  description: "Easy billing app for vegetarian hotel",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ProtectedRoute>
            <Navbar />
            {children}
          </ProtectedRoute>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

import "./globals.css"
