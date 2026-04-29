"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { getOrders, getMenuItems, getCategories, type Order, type MenuItem, type Category } from "@/utils/dataService"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ChevronLeft, ChevronRight, Download, Printer } from "lucide-react"
import { generateCategorySalesReport, printThermal } from "@/utils/thermalPrinter"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ItemSale = {
  itemId: string
  itemName: string
  quantity: number
  revenue: number
  date: Date
  orderId: string
  category?: string
}

export function ItemSalesReport() {
  const [orders, setOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [itemSales, setItemSales] = useState<ItemSale[]>([])
  const [filteredSales, setFilteredSales] = useState<ItemSale[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [startDate, setStartDate] = useState<Date | undefined>(new Date())
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [selectedItem, setSelectedItem] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const itemsPerPage = 10
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [fetchedOrders, fetchedMenuItems, fetchedCategories] = await Promise.all([
        getOrders(),
        getMenuItems(),
        getCategories(),
      ])

      // Filter to only include orders with billPrinted=true
      const printedBills = fetchedOrders.filter((order) => order.billPrinted === true)

      // Sort orders by timestamp in descending order (newest first)
      const sortedOrders = printedBills.sort((a, b) => {
        const dateA = a.timestamp.toDate()
        const dateB = b.timestamp.toDate()
        return dateB.getTime() - dateA.getTime()
      })

      setOrders(sortedOrders)
      setMenuItems(fetchedMenuItems)
      setCategories(fetchedCategories)

      // Process orders to get item-wise sales
      const sales: ItemSale[] = []

      sortedOrders.forEach((order) => {
        const orderDate = order.timestamp.toDate()

        // Process regular menu items
        Object.entries(order.items).forEach(([itemId, quantity]) => {
          // Skip custom items (they start with "custom-")
          if (itemId.startsWith("custom-")) return

          const menuItem = fetchedMenuItems.find((item) => item.id === itemId)
          if (menuItem) {
            // Find category for this item
            let categoryName = "Uncategorized"
            const categoryId = menuItem.section

            // Try to find by category ID first
            const category = fetchedCategories.find((cat) => cat.id === categoryId)
            if (category) {
              categoryName = category.name
            } else {
              // For backward compatibility, check if section is a category name
              const categoryByName = fetchedCategories.find((cat) => cat.name === categoryId)
              if (categoryByName) {
                categoryName = categoryByName.name
              }
            }

            sales.push({
              itemId,
              itemName: menuItem.name,
              quantity,
              revenue: menuItem.price * quantity,
              date: orderDate,
              orderId: order.id,
              category: categoryName,
            })
          }
        })

        // Process custom items if any
        if (order.customItems && order.customItems.length > 0) {
          order.customItems.forEach((item, index) => {
            sales.push({
              itemId: `custom-${index}-${order.id}`,
              itemName: item.name,
              quantity: item.quantity,
              revenue: item.price * item.quantity,
              date: orderDate,
              orderId: order.id,
              category: "Custom Items",
            })
          })
        }
      })

      // Sort by date (newest first)
      const sortedSales = sales.sort((a, b) => b.date.getTime() - a.date.getTime())

      setItemSales(sortedSales)
      setFilteredSales(sortedSales)
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    applyFilters()
  }, [startDate, endDate, selectedItem, selectedCategory, searchQuery, itemSales])

  const applyFilters = () => {
    let filtered = [...itemSales]

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      filtered = filtered.filter((sale) => sale.date >= start)
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter((sale) => sale.date <= end)
    }

    // Filter by item
    if (selectedItem !== "all") {
      filtered = filtered.filter((sale) => sale.itemId === selectedItem)
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((sale) => sale.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((sale) => sale.itemName.toLowerCase().includes(query))
    }

    // Sort by date (newest first)
    filtered = filtered.sort((a, b) => b.date.getTime() - a.date.getTime())

    setFilteredSales(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const resetFilters = () => {
    setStartDate(new Date())
    setEndDate(new Date())
    setSelectedItem("all")
    setSelectedCategory("all")
    setSearchQuery("")
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage)

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

  const exportToCSV = () => {
    // Create CSV content
    const headers = ["Date", "Item Name", "Category", "Quantity", "Revenue", "Order ID"]
    const csvRows = [headers]

    filteredSales.forEach((sale) => {
      csvRows.push([
        format(sale.date, "yyyy-MM-dd HH:mm:ss"),
        sale.itemName,
        sale.category || "Uncategorized",
        sale.quantity.toString(),
        sale.revenue.toFixed(2),
        sale.orderId,
      ])
    })

    // Convert to CSV string
    const csvContent = csvRows.map((row) => row.join(",")).join("\n")

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `item-sales-report-${format(new Date(), "yyyy-MM-dd")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculate summary statistics
  const totalQuantity = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0)
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.revenue, 0)

  const printCategorySalesReport = () => {
    if (filteredSales.length === 0) {
      toast({
        title: "No Data",
        description: "No sales data to print for the selected filters",
        variant: "destructive",
      })
      return
    }

    // Prepare sales data for printing
    const salesData = filteredSales.map((sale) => ({
      itemName: sale.itemName,
      quantity: sale.quantity,
      revenue: sale.revenue,
    }))

    const dateRange = {
      startDate: startDate ? format(startDate, "dd MMM yyyy") : "All time",
      endDate: endDate ? format(endDate, "dd MMM yyyy") : "All time",
    }

    const { content } = generateCategorySalesReport(
      selectedCategory,
      salesData,
      dateRange
    )

    printThermal(content, "Bill")

    toast({
      title: "Success",
      description: "Category sales report sent to printer",
    })
  }

  if (loading) {
    return <div>Loading item sales data...</div>
  }

  // Get unique categories for the filter
  const uniqueCategories = Array.from(new Set(itemSales.map((sale) => sale.category || "Uncategorized")))

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Item Sales Report</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={printCategorySalesReport}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="start-date"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="end-date"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="item-filter">Item</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger id="item-filter">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {menuItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category-filter">Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="search">Search</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalQuantity}</div>
              <p className="text-sm text-muted-foreground">Total Items Sold</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalRevenue.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Order ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.length > 0 ? (
              paginatedSales.map((sale, index) => (
                <TableRow key={`${sale.itemId}-${sale.orderId}-${index}`}>
                  <TableCell>{format(sale.date, "dd MMM yyyy HH:mm")}</TableCell>
                  <TableCell>{sale.itemName}</TableCell>
                  <TableCell>{sale.category || "Uncategorized"}</TableCell>
                  <TableCell>{sale.quantity}</TableCell>
                  <TableCell>₹{sale.revenue.toFixed(2)}</TableCell>
                  <TableCell>{sale.orderId}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No sales data found for the selected filters
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
      </CardContent>
    </Card>
  )
}
