"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RecentSales } from "@/components/recent-sales"
import { useToast } from "@/components/ui/use-toast"
import { getDashboardStats, getOrders, type DashboardStats } from "@/utils/dataService"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { ArrowUp, CreditCard, DollarSign, Package, Receipt, ShoppingCart, Users, Wallet } from "lucide-react"
import { Progress } from "@/components/ui/progress"

const LoadingCard = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-[120px]" />
      <Skeleton className="h-4 w-[80px] mt-2" />
    </CardContent>
  </Card>
)

export default function DashboardContent() {
  const [recentOrders, setRecentOrders] = useState([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [orders, dashboardStats] = await Promise.all([getOrders(), getDashboardStats()])

        // Process orders to handle different timestamp formats
        const processedOrders = orders.map((order) => ({
          ...order,
          timestamp: order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp),
        }))

        setRecentOrders(processedOrders.slice(0, 5))
        setStats(dashboardStats)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [toast])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-[150px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Today's Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.todaySales)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.todayOrders} orders today</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.todayRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">After expenses</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(stats.todayExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">Total expenses today</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.todayAverageOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">Per order today</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.monthlyRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.monthlyOrders} orders this month</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(stats.monthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">Total expenses this month</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Sale Day</CardTitle>
            <ArrowUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.monthlyHighestSaleDay.amount)}
            </div>
            <p className="text-xs text-muted-foreground">{format(stats.monthlyHighestSaleDay.date, "MMM d, yyyy")}</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Avg. Order</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.monthlyAverageOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">Per order this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(stats.pendingBillsAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.pendingBillsCount} customers with pending bills</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Total monthly billing customers</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(((stats.monthlyRevenue - stats.pendingBillsAmount) / stats.monthlyRevenue) * 100).toFixed(1)}%
            </div>
            <Progress
              value={((stats.monthlyRevenue - stats.pendingBillsAmount) / stats.monthlyRevenue) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Popular Items & Recent Sales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="border-2 col-span-4">
          <CardHeader>
            <CardTitle>Popular Items (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.monthlyPopularItems.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.quantity} orders - {formatCurrency(item.revenue)}
                    </div>
                  </div>
                  <div className="ml-4 text-sm font-medium">
                    {((item.quantity / stats.monthlyOrders) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 col-span-3">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentSales orders={recentOrders} />
          </CardContent>
        </Card>
      </div>

      {/* Expense Categories */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Monthly Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.expensesByCategory.map((category, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{category.category}</div>
                  <div className="text-sm text-muted-foreground">{formatCurrency(category.amount)}</div>
                </div>
                <Progress value={(category.amount / stats.monthlyExpenses) * 100} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
