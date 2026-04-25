import { collection, addDoc, getDocs, query, orderBy, Timestamp, where, doc, deleteDoc } from "firebase/firestore"
import { db, auth } from "./firebase"

export interface MenuItem {
  id: string
  name: string
  price: number
  section: string
  userId: string
}

export interface Order {
  items: {
    [key: string]: number
  }
  subtotal: number
  discount: number
  total: number
  timestamp: Date
  kotPrinted: boolean
  billPrinted: boolean
  userId: string
  isCustomBill?: boolean
  customItems?: Array<{ name: string; price: number; quantity: number }>
}

export interface Expense {
  id: string
  type: string
  amount: number
  reason: string
  date: Date
  paidBy: string
  paymentMode: string
  userId: string
  timestamp: any
}

// Update menuSections constant to be empty by default, allowing for dynamic categories
export const menuSections = ["Dose", "Juice", "Tea & Coffee", "Others"] as const

export type MenuSection = (typeof menuSections)[number]

const saveOrder = async (order: Omit<Order, "timestamp" | "userId">) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const orderData = {
      ...order,
      timestamp: Timestamp.now(),
      userId: user.uid,
    }

    const docRef = await addDoc(collection(db, "orders"), orderData)
    return docRef.id
  } catch (error) {
    console.error("Error saving order:", error)
    throw error
  }
}

const getOrders = async () => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    let q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("timestamp", "desc"))

    try {
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error: any) {
      if (error.code === "failed-precondition") {
        // If the error is due to a missing index, try without the orderBy clause
        console.warn("Composite index not found, fetching orders without sorting")
        q = query(collection(db, "orders"), where("userId", "==", user.uid))
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error("Error getting orders:", error)
    throw error
  }
}

const saveMenuItem = async (item: Omit<MenuItem, "id" | "userId">) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const menuItemData = {
      ...item,
      userId: user.uid,
    }

    const docRef = await addDoc(collection(db, "menuItems"), menuItemData)
    return docRef.id
  } catch (error) {
    console.error("Error saving menu item:", error)
    throw error
  }
}

const getMenuItems = async () => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const q = query(collection(db, "menuItems"), where("userId", "==", user.uid))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MenuItem[]
  } catch (error) {
    console.error("Error getting menu items:", error)
    throw new Error("Failed to load menu items. Please ensure you are logged in.")
  }
}

const saveExpense = async (expense: Omit<Expense, "id" | "userId" | "timestamp">) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const expenseData = {
      ...expense,
      userId: user.uid,
      timestamp: Timestamp.now(),
    }

    const docRef = await addDoc(collection(db, "expenses"), expenseData)
    return docRef.id
  } catch (error) {
    console.error("Error saving expense:", error)
    throw error
  }
}

const getExpenses = async () => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    let q = query(collection(db, "expenses"), where("userId", "==", user.uid), orderBy("timestamp", "desc"))

    try {
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error: any) {
      if (error.code === "failed-precondition") {
        // If the error is due to a missing index, try without the orderBy clause
        console.warn("Composite index not found, fetching expenses without sorting")
        q = query(collection(db, "expenses"), where("userId", "==", user.uid))
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error("Error getting expenses:", error)
    throw error
  }
}

export interface MonthlyBillItem {
  customerId: string
  itemId: string
  itemName: string
  quantity: number
  price: number
  date: Date
  userId: string
  timestamp: any
}

const saveMonthlyBillItem = async (item: Omit<MonthlyBillItem, "userId" | "timestamp">) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const monthlyBillItemData = {
      ...item,
      userId: user.uid,
      timestamp: Timestamp.now(),
      // Ensure we store both timestamp and date for proper querying
      date: Timestamp.fromDate(item.date),
    }

    await addDoc(collection(db, "monthlyBillItems"), monthlyBillItemData)
  } catch (error) {
    console.error("Error saving monthly bill item:", error)
    throw error
  }
}

export interface MonthlyBillCustomer {
  userId: string
  customerName: string
  phoneNumber?: string
  timestamp: any
}

export const getMonthlyBillCustomers = async ({ withoutSorting = false } = {}): Promise<string[]> => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const q = withoutSorting
      ? query(collection(db, "monthlyBillCustomers"), where("userId", "==", user.uid))
      : query(collection(db, "monthlyBillCustomers"), where("userId", "==", user.uid), orderBy("customerName"))

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data().customerName)
  } catch (error: any) {
    if (error.code === "failed-precondition") {
      console.warn("Composite index not found, fetching customers without sorting")
      return getMonthlyBillCustomersWithoutIndex()
    }
    console.error("Error getting monthly bill customers:", error)
    throw error
  }
}

const getMonthlyBillCustomersWithoutIndex = async (): Promise<string[]> => {
  const user = auth.currentUser
  if (!user) throw new Error("No authenticated user")

  const querySnapshot = await getDocs(collection(db, "monthlyBillCustomers"))
  return querySnapshot.docs.filter((doc) => doc.data().userId === user.uid).map((doc) => doc.data().customerName)
}

const saveMonthlyBillCustomer = async (customerName: string, phoneNumber?: string) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const customerData: MonthlyBillCustomer = {
      userId: user.uid,
      customerName,
      phoneNumber,
      timestamp: Timestamp.now(),
    }

    await addDoc(collection(db, "monthlyBillCustomers"), customerData)
  } catch (error) {
    console.error("Error saving monthly bill customer:", error)
    throw error
  }
}

const getMonthlyBillItems = async (customerId: string, startDate: Date, endDate: Date) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const q = query(
      collection(db, "monthlyBillItems"),
      where("userId", "==", user.uid),
      where("customerId", "==", customerId),
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", Timestamp.fromDate(endDate)),
      orderBy("date", "desc"),
    )

    try {
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          timestamp: data.timestamp,
        }
      }) as MonthlyBillItem[]
    } catch (error: any) {
      if (error.code === "failed-precondition") {
        console.warn("Composite index not found, fetching all items and filtering manually")
        return getMonthlyBillItemsWithoutIndex(customerId, startDate, endDate)
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error("Error getting monthly bill items:", error)
    throw error
  }
}

const getMonthlyBillItemsWithoutIndex = async (customerId: string, startDate: Date, endDate: Date) => {
  const user = auth.currentUser
  if (!user) throw new Error("No authenticated user")

  const querySnapshot = await getDocs(collection(db, "monthlyBillItems"))
  return querySnapshot.docs
    .map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        date: data.timestamp.toDate(),
      }
    })
    .filter(
      (item: MonthlyBillItem) =>
        item.userId === user.uid && item.customerId === customerId && item.date >= startDate && item.date <= endDate,
    ) as MonthlyBillItem[]
}

const deleteMenuItem = async (itemId: string) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    await deleteDoc(doc(db, "menuItems", itemId))
  } catch (error) {
    console.error("Error deleting menu item:", error)
    throw error
  }
}

export interface MonthlyBillSummary {
  totalBilled: number
  totalPaid: number
  pendingAmount: number
}

export interface MonthlyBillPayment {
  customerId: string
  amount: number
  date: Date
  userId: string
  timestamp: any
}

const getMonthlyBillSummary = async (customerId: string): Promise<MonthlyBillSummary> => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const billItemsQuery = query(
      collection(db, "monthlyBillItems"),
      where("userId", "==", user.uid),
      where("customerId", "==", customerId),
    )

    const paymentsQuery = query(
      collection(db, "monthlyBillPayments"),
      where("userId", "==", user.uid),
      where("customerId", "==", customerId),
    )

    const [billItemsSnapshot, paymentsSnapshot] = await Promise.all([getDocs(billItemsQuery), getDocs(paymentsQuery)])

    const totalBilled = billItemsSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data()
      return sum + data.price * data.quantity
    }, 0)

    const totalPaid = paymentsSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data()
      return sum + (data.amount || 0)
    }, 0)

    return {
      totalBilled,
      totalPaid,
      pendingAmount: totalBilled - totalPaid,
    }
  } catch (error) {
    console.error("Error getting monthly bill summary:", error)
    throw error
  }
}

const getMonthlyBillSummaryWithoutIndex = async (customerId: string): Promise<MonthlyBillSummary> => {
  const user = auth.currentUser
  if (!user) throw new Error("No authenticated user")

  const billItemsSnapshot = await getDocs(collection(db, "monthlyBillItems"))
  const paymentsSnapshot = await getDocs(collection(db, "monthlyBillPayments"))

  const totalBilled = billItemsSnapshot.docs
    .filter((doc) => doc.data().userId === user.uid && doc.data().customerId === customerId)
    .reduce((sum, doc) => sum + doc.data().price * doc.data().quantity, 0)

  const totalPaid = paymentsSnapshot.docs
    .filter((doc) => doc.data().userId === user.uid && doc.data().customerId === customerId)
    .reduce((sum, doc) => sum + doc.data().amount, 0)

  return {
    totalBilled,
    totalPaid,
    pendingAmount: totalBilled - totalPaid,
  }
}

export interface Payment {
  id: string
  customerId: string
  amount: number
  date: Date
  userId: string
}

const savePayment = async (payment: Omit<Payment, "id" | "userId">) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const paymentData = {
      ...payment,
      userId: user.uid,
      timestamp: Timestamp.now(),
    }

    const docRef = await addDoc(collection(db, "monthlyBillPayments"), paymentData)
    return docRef.id
  } catch (error) {
    console.error("Error saving payment:", error)
    throw error
  }
}

const getPayments = async (customerId: string): Promise<Payment[]> => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const q = query(
      collection(db, "monthlyBillPayments"),
      where("userId", "==", user.uid),
      where("customerId", "==", customerId),
      orderBy("timestamp", "desc"),
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Payment[]
  } catch (error: any) {
    if (error.code === "failed-precondition") {
      console.warn("Composite index not found, fetching all payments and filtering manually")
      return getPaymentsWithoutIndex(customerId)
    }
    console.error("Error getting payments:", error)
    throw error
  }
}

const getPaymentsWithoutIndex = async (customerId: string): Promise<Payment[]> => {
  const user = auth.currentUser
  if (!user) throw new Error("No authenticated user")

  const querySnapshot = await getDocs(collection(db, "monthlyBillPayments"))
  return querySnapshot.docs
    .filter((doc) => doc.data().userId === user.uid && doc.data().customerId === customerId)
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Payment[]
}

export interface DashboardStats {
  // Daily stats
  todaySales: number
  todayOrders: number
  todayExpenses: number
  todayRevenue: number
  todayAverageOrderValue: number
  todayPopularItems: Array<{ name: string; quantity: number; revenue: number }>

  // Monthly stats
  monthlyRevenue: number
  monthlyExpenses: number
  monthlyOrders: number
  monthlyAverageOrderValue: number
  monthlyPopularItems: Array<{ name: string; quantity: number; revenue: number }>
  monthlyHighestSaleDay: {
    date: Date
    amount: number
  }

  // Billing stats
  pendingBillsAmount: number
  pendingBillsCount: number
  totalCustomers: number

  // Expense stats
  expensesByCategory: Array<{
    category: string
    amount: number
  }>
}

const getStatsWithoutIndex = async (): Promise<DashboardStats> => {
  const user = auth.currentUser
  if (!user) throw new Error("No authenticated user")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

  // Fetch all data without indexes
  const [ordersSnapshot, expensesSnapshot, customersSnapshot, menuItemsSnapshot] = await Promise.all([
    getDocs(collection(db, "orders")),
    getDocs(collection(db, "expenses")),
    getDocs(collection(db, "monthlyBillCustomers")),
    getDocs(collection(db, "menuItems")),
  ])

  // Filter data manually and handle timestamp conversion
  const orders = ordersSnapshot.docs
    .filter((doc) => doc.data().userId === user.uid)
    .map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
      }
    })

  const expenses = expensesSnapshot.docs
    .filter((doc) => doc.data().userId === user.uid)
    .map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
      }
    })

  const menuItems = menuItemsSnapshot.docs
    .filter((doc) => doc.data().userId === user.uid)
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

  const monthlyBillCustomers = customersSnapshot.docs
    .filter((doc) => doc.data().userId === user.uid)
    .map((doc) => doc.data().customerName)

  // Process orders with proper date handling
  const todayOrders = orders.filter((order) => {
    const orderDate = order.timestamp instanceof Date ? order.timestamp : new Date(order.timestamp)
    return orderDate >= today
  })

  const monthlyOrders = orders.filter((order) => {
    const orderDate = order.timestamp instanceof Date ? order.timestamp : new Date(order.timestamp)
    return orderDate >= monthStart && orderDate <= monthEnd
  })

  // Calculate item popularity
  const calculatePopularItems = (ordersList: any[]) => {
    const itemStats = new Map()

    ordersList.forEach((order) => {
      Object.entries(order.items).forEach(([itemId, quantity]: [string, any]) => {
        if (!itemStats.has(itemId)) {
          itemStats.set(itemId, { quantity: 0, revenue: 0 })
        }
        const stats = itemStats.get(itemId)
        stats.quantity += quantity
        stats.revenue +=
          order.total * (quantity / Object.values(order.items).reduce((a: number, b: number) => a + b, 0))
      })
    })

    const popularItems = Array.from(itemStats.entries())
      .map(([itemId, stats]) => ({
        ...stats,
        name: menuItems.find((item) => item.id === itemId)?.name || "Unknown Item",
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    return popularItems
  }

  // Calculate highest sale day
  const dailySales = new Map()
  monthlyOrders.forEach((order) => {
    const date =
      order.timestamp instanceof Date ? order.timestamp.toDateString() : new Date(order.timestamp).toDateString()
    dailySales.set(date, (dailySales.get(date) || 0) + order.total)
  })

  const highestSaleDay = Array.from(dailySales.entries()).reduce(
    (highest, [date, amount]) => (amount > (highest.amount || 0) ? { date: new Date(date), amount } : highest),
    { date: new Date(), amount: 0 },
  )

  // Calculate expenses
  const todayExpenses = expenses
    .filter((expense) => expense.timestamp >= today)
    .reduce((sum, expense) => sum + expense.amount, 0)

  const monthlyExpenses = expenses.filter((expense) => {
    const expenseDate = expense.timestamp instanceof Date ? expense.timestamp : new Date(expense.timestamp)
    return expenseDate >= monthStart && expenseDate <= monthEnd
  })

  const expensesByCategory = Object.entries(
    monthlyExpenses.reduce((acc: { [key: string]: number }, expense) => {
      acc[expense.type] = (acc[expense.type] || 0) + expense.amount
      return acc
    }, {}),
  )
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  // Calculate pending bills
  const pendingBills = await Promise.all(
    monthlyBillCustomers.map(async (customer) => {
      const summary = await getMonthlyBillSummaryWithoutIndex(customer)
      return {
        customer,
        pendingAmount: summary.pendingAmount,
      }
    }),
  )

  const pendingBillsAmount = pendingBills.reduce((sum, bill) => sum + bill.pendingAmount, 0)
  const pendingBillsCount = pendingBills.filter((bill) => bill.pendingAmount > 0).length

  // Calculate final stats
  const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0)
  const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.total, 0)

  return {
    // Daily stats
    todaySales,
    todayOrders: todayOrders.length,
    todayExpenses,
    todayRevenue: todaySales - todayExpenses,
    todayAverageOrderValue: todayOrders.length ? todaySales / todayOrders.length : 0,
    todayPopularItems: calculatePopularItems(todayOrders),

    // Monthly stats
    monthlyRevenue,
    monthlyExpenses: monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    monthlyOrders: monthlyOrders.length,
    monthlyAverageOrderValue: monthlyOrders.length ? monthlyRevenue / monthlyOrders.length : 0,
    monthlyPopularItems: calculatePopularItems(monthlyOrders),
    monthlyHighestSaleDay: highestSaleDay,

    // Billing stats
    pendingBillsAmount,
    pendingBillsCount,
    totalCustomers: monthlyBillCustomers.length,

    // Expense stats
    expensesByCategory,
  }
}

const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    // Try with indexes first
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

    // Try to fetch with indexes
    const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("timestamp", "desc"))

    await getDocs(ordersQuery) // This will throw if index is missing

    // If we get here, indexes exist, continue with original implementation
    const [orders, expenses, monthlyBillCustomers, menuItems] = await Promise.all([
      getOrders(),
      getExpenses(),
      getMonthlyBillCustomers(),
      getMenuItems(),
    ])

    // Process orders
    const todayOrders = orders.filter((order) => {
      const orderDate = order.timestamp.toDate()
      return orderDate >= today
    })

    const monthlyOrders = orders.filter((order) => {
      const orderDate = order.timestamp.toDate()
      return orderDate >= monthStart && orderDate <= monthEnd
    })

    // Calculate item popularity
    const calculatePopularItems = (ordersList: any[]) => {
      const itemStats = new Map()

      ordersList.forEach((order) => {
        Object.entries(order.items).forEach(([itemId, quantity]: [string, any]) => {
          if (!itemStats.has(itemId)) {
            itemStats.set(itemId, { quantity: 0, revenue: 0 })
          }
          const stats = itemStats.get(itemId)
          stats.quantity += quantity
          stats.revenue +=
            order.total * (quantity / Object.values(order.items).reduce((a: number, b: number) => a + b, 0))
        })
      })

      // Convert to array and sort by quantity
      const popularItems = Array.from(itemStats.entries())
        .map(([itemId, stats]) => ({
          ...stats,
          name: menuItems.find((item) => item.id === itemId)?.name || "Unknown Item",
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      return popularItems
    }

    // Calculate highest sale day
    const dailySales = new Map()
    monthlyOrders.forEach((order) => {
      const date = order.timestamp.toDate().toDateString()
      dailySales.set(date, (dailySales.get(date) || 0) + order.total)
    })

    const highestSaleDay = Array.from(dailySales.entries()).reduce(
      (highest, [date, amount]) => (amount > (highest.amount || 0) ? { date: new Date(date), amount } : highest),
      { date: new Date(), amount: 0 },
    )

    // Calculate expenses
    const todayExpenses = expenses
      .filter((expense) => expense.timestamp.toDate() >= today)
      .reduce((sum, expense) => sum + expense.amount, 0)

    const monthlyExpenses = expenses.filter((expense) => {
      const expenseDate = expense.timestamp.toDate()
      return expenseDate >= monthStart && expenseDate <= monthEnd
    })

    const expensesByCategory = Object.entries(
      monthlyExpenses.reduce((acc: { [key: string]: number }, expense) => {
        acc[expense.type] = (acc[expense.type] || 0) + expense.amount
        return acc
      }, {}),
    )
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)

    // Calculate pending bills
    const pendingBills = await Promise.all(
      monthlyBillCustomers.map(async (customer) => {
        const summary = await getMonthlyBillSummary(customer)
        return {
          customer,
          pendingAmount: summary.pendingAmount,
        }
      }),
    )

    const pendingBillsAmount = pendingBills.reduce((sum, bill) => sum + bill.pendingAmount, 0)
    const pendingBillsCount = pendingBills.filter((bill) => bill.pendingAmount > 0).length

    // Calculate final stats
    const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0)
    const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.total, 0)

    return {
      // Daily stats
      todaySales,
      todayOrders: todayOrders.length,
      todayExpenses,
      todayRevenue: todaySales - todayExpenses,
      todayAverageOrderValue: todayOrders.length ? todaySales / todayOrders.length : 0,
      todayPopularItems: calculatePopularItems(todayOrders),

      // Monthly stats
      monthlyRevenue,
      monthlyExpenses: monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      monthlyOrders: monthlyOrders.length,
      monthlyAverageOrderValue: monthlyOrders.length ? monthlyRevenue / monthlyOrders.length : 0,
      monthlyPopularItems: calculatePopularItems(monthlyOrders),
      monthlyHighestSaleDay: highestSaleDay,

      // Billing stats
      pendingBillsAmount,
      pendingBillsCount,
      totalCustomers: monthlyBillCustomers.length,

      // Expense stats
      expensesByCategory,
    }
  } catch (error: any) {
    if (error.code === "failed-precondition") {
      console.warn("Composite index not found, fetching data without indexes")
      return getStatsWithoutIndex()
    }
    throw error
  }
}

export const saveMobileCustomer = async (mobileNumber: string) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const customerData = {
      mobileNumber,
      userId: user.uid,
      timestamp: Timestamp.now(),
    }

    await addDoc(collection(db, "mobileCustomers"), customerData)
  } catch (error) {
    console.error("Error saving mobile customer:", error)
    throw error
  }
}

export const getMobileCustomers = async () => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const q = query(collection(db, "mobileCustomers"), where("userId", "==", user.uid))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting mobile customers:", error)
    throw error
  }
}

export interface FavoriteItem {
  userId: string
  itemId: string
  timestamp: any
}

export const saveFavoriteItem = async (itemId: string) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const favoriteData = {
      userId: user.uid,
      itemId,
      timestamp: Timestamp.now(),
    }

    await addDoc(collection(db, "favoriteItems"), favoriteData)
  } catch (error) {
    console.error("Error saving favorite item:", error)
    throw error
  }
}

export const removeFavoriteItem = async (itemId: string) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const q = query(collection(db, "favoriteItems"), where("userId", "==", user.uid), where("itemId", "==", itemId))

    const querySnapshot = await getDocs(q)
    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
  } catch (error) {
    console.error("Error removing favorite item:", error)
    throw error
  }
}

export const getFavoriteItems = async (): Promise<string[]> => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const q = query(collection(db, "favoriteItems"), where("userId", "==", user.uid))

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data().itemId)
  } catch (error) {
    console.error("Error getting favorite items:", error)
    throw error
  }
}

const saveMonthlyBillPayment = async (payment: Omit<MonthlyBillPayment, "userId" | "timestamp">) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const paymentData = {
      ...payment,
      userId: user.uid,
      timestamp: Timestamp.now(),
    }

    await addDoc(collection(db, "monthlyBillPayments"), paymentData)
  } catch (error) {
    console.error("Error saving monthly bill payment:", error)
    throw error
  }
}

const getMonthlyBillPayments = async (customerId: string) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const q = query(
      collection(db, "monthlyBillPayments"),
      where("userId", "==", user.uid),
      where("customerId", "==", customerId),
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        date: data.timestamp.toDate(),
      }
    }) as MonthlyBillPayment[]
  } catch (error) {
    console.error("Error getting monthly bill payments:", error)
    throw error
  }
}

// Add new function to delete all bill data for a customer
export const clearMonthlyBillData = async (customerId: string) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    console.log(`Clearing bill data for customer: ${customerId}`)

    // Get all bill items for the customer
    const billItemsQuery = query(
      collection(db, "monthlyBillItems"),
      where("userId", "==", user.uid),
      where("customerId", "==", customerId),
    )

    // Get all payments for the customer
    const paymentsQuery = query(
      collection(db, "monthlyBillPayments"),
      where("userId", "==", user.uid),
      where("customerId", "==", customerId),
    )

    // Get the documents
    const [billItemsSnapshot, paymentsSnapshot] = await Promise.all([getDocs(billItemsQuery), getDocs(paymentsQuery)])

    console.log(
      `Found ${billItemsSnapshot.docs.length} bill items and ${paymentsSnapshot.docs.length} payments to delete`,
    )

    // Delete all bill items
    const billItemDeletions = billItemsSnapshot.docs.map((doc) => deleteDoc(doc.ref))

    // Delete all payments
    const paymentDeletions = paymentsSnapshot.docs.map((doc) => deleteDoc(doc.ref))

    // Execute all deletions
    await Promise.all([...billItemDeletions, ...paymentDeletions])

    console.log("All bill data deleted successfully")
    return true
  } catch (error) {
    console.error("Error clearing monthly bill data:", error)
    throw error
  }
}

// Add these new functions for category management
export interface Category {
  id: string
  name: string
  userId: string
}

export const saveCategory = async (categoryName: string) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const categoryData = {
      name: categoryName,
      userId: user.uid,
      timestamp: Timestamp.now(),
    }

    const docRef = await addDoc(collection(db, "categories"), categoryData)
    return docRef.id
  } catch (error) {
    console.error("Error saving category:", error)
    throw error
  }
}

export const getCategories = async () => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    const q = query(collection(db, "categories"), where("userId", "==", user.uid))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[]
  } catch (error) {
    console.error("Error getting categories:", error)
    throw new Error("Failed to load categories. Please ensure you are logged in.")
  }
}

export const deleteCategory = async (categoryId: string) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("No authenticated user")

    await deleteDoc(doc(db, "categories", categoryId))
  } catch (error) {
    console.error("Error deleting category:", error)
    throw error
  }
}

export {
  saveOrder,
  getOrders,
  saveMenuItem,
  getMenuItems,
  saveExpense,
  getExpenses,
  saveMonthlyBillItem,
  saveMonthlyBillCustomer,
  getMonthlyBillItems,
  deleteMenuItem,
  getMonthlyBillSummary,
  savePayment,
  getPayments,
  getDashboardStats,
  saveMonthlyBillPayment,
  getMonthlyBillPayments,
}
