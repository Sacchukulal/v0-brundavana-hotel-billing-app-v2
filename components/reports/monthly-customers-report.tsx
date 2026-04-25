"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  getMonthlyBillCustomers,
  getMonthlyBillItems,
  getMonthlyBillSummary,
  saveMonthlyBillPayment,
  getMonthlyBillPayments,
  clearMonthlyBillData,
  type MonthlyBillItem,
  type MonthlyBillSummary,
  type MonthlyBillPayment,
} from "@/utils/dataService"
import { format, isValid } from "date-fns"
import { generateMonthlyBillContent, printThermal } from "@/utils/thermalPrinter"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function MonthlyCustomersReport() {
  const [monthlyCustomers, setMonthlyCustomers] = useState<string[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [monthlyBillItems, setMonthlyBillItems] = useState<MonthlyBillItem[]>([])
  const [monthlyBillSummary, setMonthlyBillSummary] = useState<MonthlyBillSummary | null>(null)
  const [monthlyBillPayments, setMonthlyBillPayments] = useState<MonthlyBillPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const { toast } = useToast()
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false)

  useEffect(() => {
    loadMonthlyCustomers()
  }, [])

  const loadMonthlyCustomers = async () => {
    try {
      setLoading(true)
      const customers = await getMonthlyBillCustomers({ withoutSorting: true })
      setMonthlyCustomers(customers)
    } catch (error) {
      console.error("Error loading monthly customers:", error)
      toast({
        title: "Error",
        description: "Failed to load monthly customers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCustomer = async (customerName: string) => {
    try {
      setSelectedCustomer(customerName)

      // Get all historical data instead of just current month
      // Set start date to a very early date to capture all historical data
      const startDate = new Date(2020, 0, 1) // January 1, 2020
      startDate.setHours(0, 0, 0, 0)

      // Set end date to far future to ensure we get all data
      const endDate = new Date()
      endDate.setFullYear(endDate.getFullYear() + 1) // One year from now
      endDate.setHours(23, 59, 59, 999)

      const [items, summary, payments] = await Promise.all([
        getMonthlyBillItems(customerName, startDate, endDate),
        getMonthlyBillSummary(customerName),
        getMonthlyBillPayments(customerName),
      ])

      // Sort items by date in ascending order (oldest first)
      const sortedItems = [...items].sort((a, b) => {
        const dateA = a.timestamp?.toDate() || new Date(a.date)
        const dateB = b.timestamp?.toDate() || new Date(b.date)
        return dateA.getTime() - dateB.getTime()
      })

      setMonthlyBillItems(sortedItems)
      setMonthlyBillSummary(summary)
      setMonthlyBillPayments(payments)
    } catch (error) {
      console.error("Error fetching monthly customer data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch monthly customer data",
        variant: "destructive",
      })
    }
  }

  const handlePayment = async () => {
    if (!selectedCustomer || !paymentAmount) return

    try {
      await saveMonthlyBillPayment({
        customerId: selectedCustomer,
        amount: Number.parseFloat(paymentAmount),
        date: new Date(),
      })

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      })

      // Refresh data
      await handleSelectCustomer(selectedCustomer)
      setShowPaymentDialog(false)
      setPaymentAmount("")
    } catch (error) {
      console.error("Error recording payment:", error)
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      })
    }
  }

  const formatDate = (date: Date | any) => {
    if (date instanceof Date && isValid(date)) {
      return format(date, "dd MMM yyyy")
    }
    if (date && typeof date.toDate === "function") {
      const jsDate = date.toDate()
      if (isValid(jsDate)) {
        return format(jsDate, "dd MMM yyyy")
      }
    }
    return "Invalid Date"
  }

  const handlePrintMonthlyBill = useCallback(
    (customerName: string) => {
      if (!monthlyBillItems || !monthlyBillSummary || !monthlyBillPayments) {
        toast({
          title: "Error",
          description: "Bill data not available",
          variant: "destructive",
        })
        return
      }

      // Sort items by date before printing
      const sortedItems = [...monthlyBillItems].sort((a, b) => {
        const dateA = a.timestamp?.toDate() || new Date(a.date)
        const dateB = b.timestamp?.toDate() || new Date(b.date)
        return dateA.getTime() - dateB.getTime()
      })

      const formattedBillItems = sortedItems.map((item) => ({
        date: item.date,
        itemName: item.itemName,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price,
      }))

      const formattedPayments = monthlyBillPayments.map((payment) => ({
        date: payment.date,
        amount: payment.amount,
      }))

      const { content } = generateMonthlyBillContent(
        customerName,
        formattedBillItems,
        monthlyBillSummary,
        formattedPayments,
      )

      printThermal(content, "Bill")

      toast({
        title: "Success",
        description: "Monthly bill printed successfully",
      })
    },
    [monthlyBillItems, monthlyBillSummary, monthlyBillPayments, toast],
  )

  const handleClearBillData = async () => {
    if (!selectedCustomer) return

    try {
      // Close the dialog first to prevent multiple clicks
      setShowClearConfirmDialog(false)

      // Show loading toast
      toast({
        title: "Processing",
        description: "Clearing bill data...",
      })

      // Call the clearMonthlyBillData function with the customer name
      await clearMonthlyBillData(selectedCustomer)

      // Reset the data
      setMonthlyBillItems([])
      setMonthlyBillSummary(null)
      setMonthlyBillPayments([])
      setSelectedCustomer(null)

      // Refresh the customer list
      await loadMonthlyCustomers()

      toast({
        title: "Success",
        description: "All bill data cleared successfully",
      })
    } catch (error) {
      console.error("Error clearing bill data:", error)
      toast({
        title: "Error",
        description: "Failed to clear bill data: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Loading monthly customers...</div>
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Monthly Customers Report</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyCustomers.map((customer) => (
              <TableRow key={customer}>
                <TableCell>{customer}</TableCell>
                <TableCell>
                  <Button variant="outline" onClick={() => handleSelectCustomer(customer)}>
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Monthly Bill Details: {selectedCustomer}</DialogTitle>
            </DialogHeader>
            {selectedCustomer && (
              <div className="mt-4 space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Bill Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyBillItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(item.date)}</TableCell>
                          <TableCell>{item.itemName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{item.price.toFixed(2)}</TableCell>
                          <TableCell>₹{(item.quantity * item.price).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {monthlyBillSummary && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Bill Summary</h4>
                    <p>Total Billed: ₹{monthlyBillSummary.totalBilled.toFixed(2)}</p>
                    <p>Total Paid: ₹{monthlyBillSummary.totalPaid.toFixed(2)}</p>
                    <p className="font-bold">Pending Amount: ₹{monthlyBillSummary.pendingAmount.toFixed(2)}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold mb-2">Payment History</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyBillPayments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(payment.date)}</TableCell>
                          <TableCell>₹{payment.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-between">
                  <Button variant="destructive" onClick={() => setShowClearConfirmDialog(true)}>
                    Clear Bill Data
                  </Button>
                  <Button onClick={() => handlePrintMonthlyBill(selectedCustomer)}>Print Bill Details</Button>
                </div>
                <Button onClick={() => setShowPaymentDialog(true)}>Record Payment</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Clear Confirmation Dialog */}
        <AlertDialog open={showClearConfirmDialog} onOpenChange={setShowClearConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Bill Data</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to clear all bill data for {selectedCustomer}? This action cannot be undone. All
                bill items and payment history will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearBillData}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="payment-amount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handlePayment}>Save Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
