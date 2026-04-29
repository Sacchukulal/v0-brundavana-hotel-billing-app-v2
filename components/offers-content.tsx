"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { getMenuItems, saveMenuItem, type MenuItem } from "@/utils/dataService"
import { auth } from "@/utils/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function OffersContent() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    let isMounted = true

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!isMounted) return

      if (user) {
        try {
          setLoading(true)
          setError(null)
          const items = await getMenuItems(user.uid)
          if (!isMounted) return
          setMenuItems(items)
          setLoading(false)
        } catch (error) {
          console.error("Error loading menu items:", error)
          if (isMounted) {
            setError("Failed to load menu items. Please try again.")
            setLoading(false)
            toast({
              title: "Error",
              description: "Failed to load menu items. Please ensure you are logged in.",
              variant: "destructive",
            })
          }
        }
      } else {
        if (isMounted) {
          setError("Please log in to access menu items.")
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [toast])

  const loadMenuItems = async (userId?: string) => {
    try {
      setLoading(true)
      setError(null)
      const items = await getMenuItems(userId)
      setMenuItems(items)
      setLoading(false)
    } catch (error) {
      console.error("Error loading menu items:", error)
      setError("Failed to load menu items. Please try again.")
      setLoading(false)
      toast({
        title: "Error",
        description: "Failed to load menu items. Please ensure you are logged in.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateOffer = async (id: string, offerPrice: string) => {
    try {
      const updatedItems = menuItems.map((item) =>
        item.id === id ? { ...item, offerPrice: offerPrice ? Number(offerPrice) : undefined } : item,
      )
      setMenuItems(updatedItems)

      const itemToUpdate = updatedItems.find((item) => item.id === id)
      if (itemToUpdate) {
        await saveMenuItem(itemToUpdate)
        toast({
          title: "Success",
          description: "Offer price updated successfully.",
        })
      }
    } catch (error) {
      console.error("Error updating offer price:", error)
      toast({
        title: "Error",
        description: "Failed to update offer price",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={loadMenuItems}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-3xl font-bold">Manage Offers</h1>
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Current Offers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Regular Price</TableHead>
                <TableHead>Offer Price</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-green-600 dark:text-green-400">₹{item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-blue-600 dark:text-blue-400">
                    ₹{item.offerPrice?.toFixed(2) || ""}
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => handleUpdateOffer(item.id, "")} variant="destructive" size="sm">
                      Remove Offer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
