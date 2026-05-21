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
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import Image from "next/image"

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

// Splash Screen Component
const SplashScreen = () => (
  <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-50">
    <div className="text-center space-y-6">
      {/* Animated Logo Container with Image */}
      <div className="flex justify-center">
        <div className="relative w-40 h-40">
          {/* Spinning border circle */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 border-r-green-500 animate-spin" style={{ animationDuration: "3s" }}></div>
          
          {/* Logo image centered inside */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/brundavana-logo.png"
              alt="Brundavana Logo"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-white">Brundavana</h2>
        <p className="text-gray-400 text-sm">Loading your dashboard...</p>
      </div>

      {/* Developer Info & Pricing */}
      <div className="mt-12 space-y-4 border-t border-gray-700 pt-8">
        <div className="space-y-2">
          <p className="text-gray-300 text-sm">
            Developed & Marketed by<br />
            <span className="text-green-400 font-semibold">Sachin Kulal</span>
          </p>
          <div className="inline-block bg-green-500/20 border border-green-500/50 rounded-full px-4 py-2">
            <p className="text-green-400 font-semibold text-sm">₹15 per day</p>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default function DashboardContent() {
  const [recentOrders, setRecentOrders] = useState([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
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
        setLoading(false)
        
        // Show splash for minimum 2 seconds, then hide
        setTimeout(() => {
          setShowSplash(false)
        }, 2000)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        })
        setLoading(false)
        setShowSplash(false)
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

  // Generate chart data
  const generateChartData = () => {
    const data = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      data.push({
        date: format(date, "MMM d"),
        sales: Math.floor(Math.random() * (stats?.monthlyRevenue || 5000) * 0.5) + 1000,
      })
    }
    return data
  }

  const chartData = stats ? generateChartData() : []

  if (showSplash) {
    return <SplashScreen />
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

  // Prepare expense data for pie chart
  const expenseChartData = stats.expensesByCategory.map((cat) => ({
    name: cat.category,
    value: cat.amount,
  }))

  const EXPENSE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-400">Welcome back! Here&apos;s your restaurant performance overview</p>
      </div>

      {/* Today's Overview - Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Today&apos;s Sales</CardTitle>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              {formatCurrency(stats.todaySales)}
            </div>
            <p className="text-xs text-gray-400 mt-2">{stats.todayOrders} orders today</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Today&apos;s Revenue</CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Wallet className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {formatCurrency(stats.todayRevenue)}
            </div>
            <p className="text-xs text-gray-400 mt-2">After expenses</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-500/10 to-red-600/5 backdrop-blur hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Today&apos;s Expenses</CardTitle>
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Receipt className="h-4 w-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">
              {formatCurrency(stats.todayExpenses)}
            </div>
            <p className="text-xs text-gray-400 mt-2">Total expenses</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg. Order Value</CardTitle>
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <CreditCard className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              {formatCurrency(stats.todayAverageOrderValue)}
            </div>
            <p className="text-xs text-gray-400 mt-2">Per order today</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Sales Trend Chart */}
        <Card className="border-0 bg-slate-800/50 backdrop-blur col-span-2 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Sales Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
                <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#1e293b", 
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "8px"
                  }}
                  formatter={(value) => [`₹${value}`, "Sales"]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  name="Daily Sales"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expenses Breakdown */}
        <Card className="border-0 bg-slate-800/50 backdrop-blur hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {expenseChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `₹${value.toFixed(0)}`}
                  contentStyle={{ 
                    backgroundColor: "#1e293b", 
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "8px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Monthly Revenue</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(stats.monthlyRevenue)}
            </div>
            <p className="text-xs text-gray-400 mt-2">{stats.monthlyOrders} orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-500/10 to-red-600/5 backdrop-blur hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Monthly Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {formatCurrency(stats.monthlyExpenses)}
            </div>
            <p className="text-xs text-gray-400 mt-2">Total this month</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5 backdrop-blur hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Best Day</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {formatCurrency(stats.monthlyHighestSaleDay.amount)}
            </div>
            <p className="text-xs text-gray-400 mt-2">{format(stats.monthlyHighestSaleDay.date, "MMM d")}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 backdrop-blur hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Pending Bills</CardTitle>
            <Package className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">
              {formatCurrency(stats.pendingBillsAmount)}
            </div>
            <p className="text-xs text-gray-400 mt-2">{stats.pendingBillsCount} customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Popular Items & Recent Sales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="border-0 bg-slate-800/50 backdrop-blur col-span-4 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Top Items This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.monthlyPopularItems.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-green-400">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-gray-400">
                      {item.quantity} sold • {formatCurrency(item.revenue)}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-green-400">
                    {((item.quantity / stats.monthlyOrders) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-slate-800/50 backdrop-blur col-span-3 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentSales orders={recentOrders} />
          </CardContent>
        </Card>
      </div>

      {/* Footer - Branding Section */}
      <Card className="border-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 backdrop-blur overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold text-white mb-2">Brundavana Restaurant Billing</h3>
              <p className="text-gray-400 mb-4">
                Professional billing and management software for restaurants
              </p>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-gray-400">Developed & Marketed by</p>
                  <p className="text-lg font-bold text-green-400">Sachin Kulal</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Simple Pricing</p>
              <div className="text-4xl font-bold text-green-400 mb-1">₹15</div>
              <p className="text-sm text-gray-400">per day</p>
              <div className="mt-4 text-xs text-gray-500">
                No hidden fees • Unlimited orders • Full support
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
