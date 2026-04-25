"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { getMobileCustomers } from "@/utils/dataService"
import { format } from "date-fns"

export function MobileCustomersReport() {
  const [mobileCustomers, setMobileCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadMobileCustomers()
  }, [])

  const loadMobileCustomers = async () => {
    try {
      setLoading(true)
      const customers = await getMobileCustomers()
      setMobileCustomers(customers)
    } catch (error) {
      console.error("Error loading mobile customers:", error)
      toast({
        title: "Error",
        description: "Failed to load mobile customers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading mobile customers...</div>
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Mobile Customers Report</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mobile Number</TableHead>
              <TableHead>Registration Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mobileCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.mobileNumber}</TableCell>
                <TableCell>{format(customer.timestamp.toDate(), "dd MMM yyyy HH:mm")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
