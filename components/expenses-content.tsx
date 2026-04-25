"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { format, isValid, parseISO, compareDesc } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { saveExpense, getExpenses, type Expense } from "@/utils/dataService"

type ExpenseFormData = {
  type: string
  amount: number
  reason: string
  date: Date
  paidBy: string
  paymentMode: string
}

const expenseTypes = ["Rent", "Utilities", "Ingredients", "Equipment", "Salaries", "Marketing", "Maintenance", "Other"]

const paymentModes = ["Cash", "Bank Transfer", "Credit Card", "Debit Card", "UPI", "Other"]

export default function ExpensesContent() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ExpenseFormData>()
  const { toast } = useToast()
  const [date, setDate] = useState<Date>()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const expensesPerPage = 10

  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedExpenses = await getExpenses()
      setExpenses(fetchedExpenses as Expense[])
    } catch (error: any) {
      console.error("Error loading expenses:", error)
      setError(`Failed to load expenses: ${error.message}`)
      toast({
        title: "Error",
        description: "Failed to load expenses. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      await saveExpense({
        ...data,
        date: date || new Date(),
      })
      toast({
        title: "Expense Recorded",
        description: `₹${data.amount} expense for ${data.type} has been recorded.`,
      })
      reset()
      setDate(undefined)
      loadExpenses() // Reload expenses after adding new one
    } catch (error: any) {
      console.error("Error saving expense:", error)
      toast({
        title: "Error",
        description: `Failed to record expense: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const formatDate = (date: any) => {
    if (!date) return "Invalid Date"

    // Handle Firestore Timestamp
    if (date && typeof date === "object" && "toDate" in date) {
      return format(date.toDate(), "PPP")
    }

    // Handle regular Date objects
    if (date instanceof Date) {
      return format(date, "PPP")
    }

    // Handle ISO string dates
    try {
      const parsedDate = parseISO(date)
      return isValid(parsedDate) ? format(parsedDate, "PPP") : "Invalid Date"
    } catch {
      return "Invalid Date"
    }
  }

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return "₹0.00"
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Sort expenses by date (most recent first)
  const sortedExpenses = [...expenses].sort((a, b) => {
    const dateA = a.timestamp?.toDate() || new Date(a.date)
    const dateB = b.timestamp?.toDate() || new Date(b.date)
    return compareDesc(dateA, dateB)
  })

  // Calculate pagination
  const totalPages = Math.ceil(sortedExpenses.length / expensesPerPage)
  const startIndex = (currentPage - 1) * expensesPerPage
  const paginatedExpenses = sortedExpenses.slice(startIndex, startIndex + expensesPerPage)

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

  // Calculate today's total expenses
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayExpenses = expenses.reduce((total, expense) => {
    if (!expense.amount) return total
    const expenseDate = expense.timestamp?.toDate() || new Date(expense.date)
    expenseDate.setHours(0, 0, 0, 0)
    return expenseDate.getTime() === today.getTime() ? total + Number(expense.amount) : total
  }, 0)

  // Calculate current month's total expenses
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  const monthlyExpenses = expenses.reduce((total, expense) => {
    if (!expense.amount) return total
    const expenseDate = expense.timestamp?.toDate() || new Date(expense.date)
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
      ? total + Number(expense.amount)
      : total
  }, 0)

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={loadExpenses}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        {/* New Expense Form */}
        <Card className="md:col-span-1 border-2">
          <CardHeader>
            <CardTitle>Record New Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Expense Type</Label>
                <Select onValueChange={(value) => setValue("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense type" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register("amount", { required: "Amount is required", min: 0 })}
                  className="w-full"
                />
                {errors.amount && <p className="text-red-500 text-sm">{errors.amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  {...register("reason", { required: "Reason is required" })}
                  className="min-h-[100px]"
                />
                {errors.reason && <p className="text-red-500 text-sm">{errors.reason.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => {
                        setDate(newDate)
                        setValue("date", newDate as Date)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidBy">Paid By</Label>
                <Input id="paidBy" {...register("paidBy", { required: "Paid By is required" })} className="w-full" />
                {errors.paidBy && <p className="text-red-500 text-sm">{errors.paidBy.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select onValueChange={(value) => setValue("paymentMode", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">
                Record Expense
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Expense Summary */}
        <Card className="md:col-span-1 border-2">
          <CardHeader>
            <CardTitle>Expense Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-2">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Today's Expenses</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(todayExpenses)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">This Month's Expenses</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(monthlyExpenses)}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">Category-wise Expenses (This Month)</h3>
                <ul className="space-y-2">
                  {expenseTypes.map((type) => {
                    const totalForType = expenses
                      .filter((exp) => {
                        const expDate = exp.timestamp?.toDate() || new Date(exp.date)
                        return (
                          expDate.getMonth() === currentMonth &&
                          expDate.getFullYear() === currentYear &&
                          exp.type === type
                        )
                      })
                      .reduce((sum, exp) => sum + (exp.amount ? Number(exp.amount) : 0), 0)

                    if (totalForType > 0) {
                      return (
                        <li key={type} className="flex justify-between border-b py-2">
                          <span className="font-medium">{type}</span>
                          <span className="font-semibold">{formatCurrency(totalForType)}</span>
                        </li>
                      )
                    }
                    return null
                  })}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense History */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid By</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.timestamp?.toDate() || expense.date)}</TableCell>
                    <TableCell>{expense.type}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{expense.paidBy}</TableCell>
                    <TableCell>{expense.paymentMode}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={expense.reason}>
                      {expense.reason}
                    </TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No expenses recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

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
    </div>
  )
}
