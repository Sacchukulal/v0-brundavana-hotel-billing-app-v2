"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { getOrders, type Order } from "@/utils/dataService"
import { generateBillContent, printThermal } from "@/utils/thermalPrinter"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"

export function OrdersReport() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const ordersPerPage = 10
  const { toast } = useToast()

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const fetchedOrders = await getOrders()

      // Filter to only include orders with billPrinted=true
      const printedBills = fetchedOrders.filter((order) => order.billPrinted === true)

      // Sort orders by timestamp in descending order (newest first)
      const sortedOrders = printedBills.sort((a, b) => {
        const dateA = a.timestamp.toDate()
        const dateB = b.timestamp.toDate()
        return dateB.getTime() - dateA.getTime()
      })

      // Remove duplicate token numbers (keep only the most recent)
      const uniqueTokenOrders: Order[] = []
      const tokenSet = new Set<string>()

      sortedOrders.forEach((order) => {
        if (order.tokenNumber && !tokenSet.has(order.tokenNumber)) {
          tokenSet.add(order.tokenNumber)
          uniqueTokenOrders.push(order)
        }
      })

      setOrders(uniqueTokenOrders)
    } catch (error) {
      console.error("Error loading orders:", error)
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReprintBill = (order: Order) => {
    try {
      const { content } = generateBillContent(order.items, order.total, order.menuItems || [], order.tokenNumber)
      printThermal(content, "Bill")
      toast({
        title: "Success",
        description: "Bill reprinted successfully",
      })
    } catch (error) {
      console.error("Error reprinting bill:", error)
      toast({
        title: "Error",
        description: "Failed to reprint bill",
        variant: "destructive",
      })
    }
  }

  // Filter orders by date range
  const filteredOrders = orders.filter((order) => {
    const orderDate = order.timestamp.toDate()

    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      if (orderDate < start) return false
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (orderDate > end) return false
    }

    return true
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage)
  const startIndex = (currentPage - 1) * ordersPerPage
  const endIndex = startIndex + ordersPerPage
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const resetFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    setCurrentPage(1)
  }

  if (loading) {
    return <div>Loading orders...</div>
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Orders Report</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Date filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Start Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>End Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <Button variant="outline" onClick={resetFilters}>
            Reset Filters
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Token #</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentOrders.length > 0 ? (
              currentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{format(order.timestamp.toDate(), "dd MMM yyyy HH:mm")}</TableCell>
                  <TableCell>
                    <Button variant="link" onClick={() => setSelectedOrder(order)}>
                      {order.tokenNumber || "N/A"}
                    </Button>
                  </TableCell>
                  <TableCell>₹{order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="outline" onClick={() => handleReprintBill(order)}>
                      Reprint Bill
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  No orders found for the selected date range
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-4">
            <Button variant="outline" size="icon" onClick={prevPage} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" size="icon" onClick={nextPage} disabled={currentPage === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Order Details - Token #{selectedOrder?.tokenNumber}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="mt-4">
                <div className="grid gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">
                      Date/Time: {format(selectedOrder.timestamp.toDate(), "dd MMM yyyy HH:mm")}
                    </h4>
                    <h4 className="font-semibold mb-2">Order Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(selectedOrder.items).map(([id, quantity]) => {
                          // Handle custom items
                          if (id.startsWith("custom-") && selectedOrder.customItems) {
                            const index = Number.parseInt(id.split("-")[1])
                            const customItem = selectedOrder.customItems[index]
                            if (customItem) {
                              return (
                                <TableRow key={id}>
                                  <TableCell>{customItem.name}</TableCell>
                                  <TableCell>{customItem.quantity}</TableCell>
                                  <TableCell>₹{customItem.price.toFixed(2)}</TableCell>
                                </TableRow>
                              )
                            }
                          }

                          // Handle regular menu items
                          const menuItem = selectedOrder.menuItems?.find((item) => item.id === id)
                          return (
                            <TableRow key={id}>
                              <TableCell>{menuItem?.name || id}</TableCell>
                              <TableCell>{quantity}</TableCell>
                              <TableCell>₹{menuItem ? (menuItem.price * quantity).toFixed(2) : "N/A"}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="text-right font-bold">Total: ₹{selectedOrder.total.toFixed(2)}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
