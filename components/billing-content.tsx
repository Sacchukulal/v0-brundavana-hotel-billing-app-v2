"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { printThermal, generateKOTContent, generateBillContent, getNextTokenNumber } from "@/utils/thermalPrinter"
import {
  saveOrder,
  getMenuItems,
  type MenuItem,
  menuSections,
  saveMonthlyBillItem,
  getMonthlyBillCustomers,
  saveMonthlyBillCustomer,
  saveFavoriteItem,
  removeFavoriteItem,
  getFavoriteItems,
  getCategories,
  type Category,
  saveTableOrder,
  getTableOrders,
  deleteTableOrder,
  checkInternetConnection,
  type TableOrder,
} from "@/utils/dataService"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction } from "@/components/ui/alert-dialog"
import { WifiOff } from "lucide-react"
import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { auth } from "@/utils/firebase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Add new billingMode type and update the state
type BillingMode = "regular" | "monthly" | "custom"
type MenuSection = (typeof menuSections)[number] | "Favorites"

// Use TableOrder type from dataService for queued orders
type QueuedOrder = TableOrder

export default function BillingContent() {
  const [order, setOrder] = useState<{ [key: string]: number }>({})
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [currentToken, setCurrentToken] = useState<string>("")
  const [currentSerial, setCurrentSerial] = useState<string>("")
  const [currentSection, setCurrentSection] = useState<MenuSection>(menuSections[0])
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [billingMode, setBillingMode] = useState<BillingMode>("regular")
  const [monthlyBillCustomers, setMonthlyBillCustomers] = useState<string[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)
  const [keyboardEnabled, setKeyboardEnabled] = useState(true)
  const [customItems, setCustomItems] = useState<Array<{ name: string; price: number; quantity: number }>>([])
  const [newCustomItem, setNewCustomItem] = useState({ name: "", price: "", quantity: "" })
  const [favoriteItems, setFavoriteItems] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [enterKeyPressCount, setEnterKeyPressCount] = useState(0)

  const [showQuantityDialog, setShowQuantityDialog] = useState(false)
  const [selectedItemForQuantity, setSelectedItemForQuantity] = useState<MenuItem | null>(null)
  const [quantityInput, setQuantityInput] = useState(1)

  // Add state for queued orders (tables)
  const [queuedOrders, setQueuedOrders] = useState<QueuedOrder[]>([])
  const [showQueueDialog, setShowQueueDialog] = useState(false)
  const [tableNumber, setTableNumber] = useState("")
  const [selectedQueuedOrder, setSelectedQueuedOrder] = useState<QueuedOrder | null>(null)

  const [parcelItems, setParcelItems] = useState<Set<string>>(new Set())
  const [printedCategories, setPrintedCategories] = useState<Set<string>>(new Set())
  const [isOnline, setIsOnline] = useState(true)
  const [showOfflineDialog, setShowOfflineDialog] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])

  const addItem = useCallback((id: string) => {
    setOrder((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }, [])

  const removeItem = useCallback((id: string) => {
    setOrder((prev) => {
      const newOrder = { ...prev }
      delete newOrder[id]
      return newOrder
    })
  }, [])

  const toggleParcelItem = useCallback((id: string) => {
    setParcelItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const calculateTotal = useCallback(() => {
    const menuItemsTotal = Object.entries(order).reduce((sum, [id, quantity]) => {
      const item = menuItems.find((item) => item.id === id)
      const price = item?.price || 0
      return sum + price * quantity
    }, 0)

    const customItemsTotal = customItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    return menuItemsTotal + customItemsTotal
  }, [order, menuItems, customItems])

  const resetOrder = useCallback(() => {
    setOrder({})
    setCustomItems([])
    setCurrentSerial("")
    setCurrentToken("")
    setKeyboardEnabled(true)
    setSelectedQueuedOrder(null)
    setParcelItems(new Set())
    setPrintedCategories(new Set()) // Reset printed categories
  }, [])

  // Update the handlePrintKOT function to print both table and parcel KOTs sequentially
  const handlePrintKOT = useCallback(async () => {
    try {
      // Check if there are any items in the order
      if (Object.keys(order).length === 0) {
        toast({
          title: "Error",
          description: "No items in the order",
          variant: "destructive",
        })
        return
      }

      // Group items by category
      const itemsByCategory = new Map<string, { [key: string]: number }>()

      Object.entries(order).forEach(([id, quantity]) => {
        const item = menuItems.find((item) => item.id === id)
        if (item) {
          // Find the category name for this item
          let categoryName = "Others"
          const category = categories.find((cat) => cat.id === item.section || cat.name === item.section)
          if (category) {
            categoryName = category.name
          }

          if (!itemsByCategory.has(categoryName)) {
            itemsByCategory.set(categoryName, {})
          }

          const categoryItems = itemsByCategory.get(categoryName)!
          categoryItems[id] = quantity
        }
      })

      // Get all category names
      const allCategories = Array.from(itemsByCategory.keys())

      // Find the next category to print (one that hasn't been printed yet)
      const nextCategoryToPrint = allCategories.find((cat) => !printedCategories.has(cat))

      if (!nextCategoryToPrint) {
        // All categories have been printed, reset and start over
        setPrintedCategories(new Set())
        toast({
          title: "All KOTs printed",
          description: "All categories have been printed. Click again to reprint.",
        })
        return
      }

      // Generate token number if not already set
      let tokenNumber = currentToken
      if (!tokenNumber) {
        tokenNumber = getNextTokenNumber()
        setCurrentToken(tokenNumber)
      }

      // Print KOT for the next category
      const categoryItems = itemsByCategory.get(nextCategoryToPrint)!
      const { content } = generateKOTContent(
        categoryItems,
        menuItems,
        "Table",
        tokenNumber,
        parcelItems,
        nextCategoryToPrint,
      )

      await printThermal(content, "KOT")

      // Mark this category as printed
      setPrintedCategories((prev) => new Set([...prev, nextCategoryToPrint]))

      // Refocus the search input after printing
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }, 100)

      const remainingCategories = allCategories.filter(
        (cat) => !printedCategories.has(cat) && cat !== nextCategoryToPrint,
      )
      const statusMessage =
        remainingCategories.length > 0
          ? `${nextCategoryToPrint} printed. ${remainingCategories.length} more categories remaining.`
          : `${nextCategoryToPrint} printed. All categories completed!`

      toast({
        title: "KOT printed",
        description: `Token #${tokenNumber} - ${statusMessage}`,
      })
    } catch (error) {
      console.error("Error printing KOT:", error)
      toast({
        title: "Error",
        description: "Failed to print KOT",
        variant: "destructive",
      })
    }
  }, [order, menuItems, parcelItems, categories, toast, printedCategories, currentToken])

  // Update the handlePrintBill function to include parcel information
  const handlePrintBill = useCallback(async () => {
    // Check internet connectivity before saving
    const online = await ensureOnline()
    if (!online) return

    try {
      const total = calculateTotal()

      // Create combined items array for printing
      const combinedItems = [
        ...menuItems,
        ...customItems.map((item, index) => ({
          id: `custom-${index}`,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      ]

      // Create combined order object
      const combinedOrder = {
        ...order,
        ...customItems.reduce(
          (acc, item, index) => ({
            ...acc,
            [`custom-${index}`]: item.quantity,
          }),
          {},
        ),
      }

      const { content } = generateBillContent(combinedOrder, total, combinedItems, currentToken, parcelItems)
      printThermal(content, "Bill")

      if (!auth.currentUser) {
        throw new Error("User not authenticated")
      }

      // Save menu items details for reprinting
      const orderMenuItems = menuItems
        .filter(item => Object.keys(combinedOrder).includes(item.id))
        .map(item => ({ id: item.id, name: item.name, price: item.price }))

      await saveOrder({
        items: combinedOrder,
        total,
        kotPrinted: true, // Keep this true for database consistency
        billPrinted: true,
        tokenNumber: currentToken,
        customItems, // Include custom items in the order
        timestamp: new Date(),
        userId: auth.currentUser.uid,
        parcelItems: Array.from(parcelItems), // Save parcel items information
        menuItems: orderMenuItems, // Save menu item details for reprinting
      })

      // Refocus the search input after printing
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }, 100)

      toast({
        title: "Bill printed",
        description: `Token #${currentToken} | Total: ₹${total}`,
      })

      // If this was a queued order, remove it from the queue and Firebase
      if (selectedQueuedOrder && selectedQueuedOrder.id) {
        try {
          await deleteTableOrder(selectedQueuedOrder.id)
          setQueuedOrders((prev) => prev.filter((item) => item.id !== selectedQueuedOrder.id))
        } catch (error) {
          console.error("Error deleting table order:", error)
        }
      }

      resetOrder()
    } catch (error) {
      console.error("Error saving order:", error)
      toast({
        title: "Error",
        description: "Failed to save order",
        variant: "destructive",
      })
    }
  }, [order, menuItems, customItems, currentToken, calculateTotal, resetOrder, toast, selectedQueuedOrder, parcelItems, ensureOnline])

  const handleSaveBill = useCallback(async () => {
    // Check internet connectivity before saving
    const online = await ensureOnline()
    if (!online) return

    try {
      const total = calculateTotal()

      if (!auth.currentUser) {
        throw new Error("User not authenticated")
      }

      // Save menu items details for reprinting
      const orderMenuItems = menuItems
        .filter(item => Object.keys(order).includes(item.id))
        .map(item => ({ id: item.id, name: item.name, price: item.price }))

      await saveOrder({
        items: order,
        total,
        kotPrinted: true,
        billPrinted: true,
        tokenNumber: currentToken,
        timestamp: new Date(),
        userId: auth.currentUser.uid,
        menuItems: orderMenuItems, // Save menu item details for reprinting
      })

      toast({
        title: "Bill saved",
        description: `Token #${currentToken} | Total: ₹${total}`,
      })

      // If this was a queued order, remove it from the queue and Firebase
      if (selectedQueuedOrder && selectedQueuedOrder.id) {
        try {
          await deleteTableOrder(selectedQueuedOrder.id)
          setQueuedOrders((prev) => prev.filter((item) => item.id !== selectedQueuedOrder.id))
        } catch (error) {
          console.error("Error deleting table order:", error)
        }
      }

      resetOrder()
    } catch (error) {
      console.error("Error saving bill:", error)
      toast({
        title: "Error",
        description: "Failed to save bill",
      })
    }
  }, [order, currentToken, calculateTotal, resetOrder, toast, selectedQueuedOrder, ensureOnline, menuItems])

  // Add function to save order to queue
  const handleSaveToQueue = useCallback(() => {
    if (Object.keys(order).length === 0 && customItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to the order before saving to queue",
        variant: "destructive",
      })
      return
    }

    setShowQueueDialog(true)
  }, [order, customItems, toast])

  // Add function to confirm saving to queue (now saves to Firebase)
  const confirmSaveToQueue = useCallback(async () => {
    // Check internet connectivity before saving
    const online = await ensureOnline()
    if (!online) {
      setShowQueueDialog(false)
      return
    }

    if (!tableNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a table number",
        variant: "destructive",
      })
      return
    }

    try {
      // Save to Firebase
      await saveTableOrder({
        tableName: tableNumber,
        order: { ...order },
        customItems: [...customItems],
        timestamp: new Date(),
      })

      // Reload table orders from Firebase to get updated list
      const updatedTableOrders = await getTableOrders()
      setQueuedOrders(updatedTableOrders)

      toast({
        title: "Success",
        description: `Order saved to Table ${tableNumber}`,
      })

      setShowQueueDialog(false)
      setTableNumber("")
      resetOrder()
    } catch (error) {
      console.error("Error saving to table:", error)
      toast({
        title: "Error",
        description: "Failed to save order to table. Please check your internet connection.",
        variant: "destructive",
      })
    }
  }, [tableNumber, order, customItems, resetOrder, toast, ensureOnline])

  // Add function to load order from queue
  const loadQueuedOrder = useCallback(
    (queuedOrder: QueuedOrder) => {
      // First check if there's an existing order that would be lost
      if (Object.keys(order).length > 0 || customItems.length > 0) {
        if (!confirm("Loading this order will replace your current order. Continue?")) {
          return
        }
      }

      setOrder(queuedOrder.order)
      setCustomItems(queuedOrder.customItems)
      setSelectedQueuedOrder(queuedOrder)

      toast({
        title: "Order Loaded",
        description: `Loaded order from Table ${queuedOrder.tableName}`,
      })
    },
    [order, customItems, toast],
  )

  const handleAddToMonthlyBill = useCallback(async () => {
    // Check internet connectivity before saving
    const online = await ensureOnline()
    if (!online) return

    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer for monthly billing",
        variant: "destructive",
      })
      return
    }

    try {
      const currentDate = new Date()

      // Add regular menu items
      for (const [itemId, quantity] of Object.entries(order)) {
        const item = menuItems.find((menuItem) => menuItem.id === itemId)
        if (item) {
          await saveMonthlyBillItem({
            customerId: selectedCustomer,
            itemId: item.id,
            itemName: item.name,
            quantity,
            price: item.price,
            date: currentDate,
          })
        }
      }

      // Add custom items if any
      for (const customItem of customItems) {
        await saveMonthlyBillItem({
          customerId: selectedCustomer,
          itemId: `custom-${Date.now()}`, // Generate a unique ID for custom items
          itemName: customItem.name,
          quantity: customItem.quantity,
          price: customItem.price,
          date: currentDate,
        })
      }

      toast({
        title: "Success",
        description: `Items added to ${selectedCustomer}'s monthly bill`,
      })

      resetOrder()
    } catch (error) {
      console.error("Error adding items to monthly bill:", error)
      toast({
        title: "Error",
        description: "Failed to add items to monthly bill",
        variant: "destructive",
      })
    }
  }, [order, customItems, menuItems, selectedCustomer, resetOrder, toast, ensureOnline])

  const handleAddNewCustomer = useCallback(async () => {
    if (!newCustomerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a customer name",
        variant: "destructive",
      })
      return
    }

    try {
      await saveMonthlyBillCustomer(newCustomerName, newCustomerPhone)
      setMonthlyBillCustomers([...monthlyBillCustomers, newCustomerName])
      setSelectedCustomer(newCustomerName)
      setNewCustomerName("")
      setNewCustomerPhone("")
      setIsAddingCustomer(false)
      toast({
        title: "Success",
        description: "New customer added successfully",
      })
    } catch (error) {
      console.error("Error adding new customer:", error)
      toast({
        title: "Error",
        description: "Failed to add new customer",
      })
    }
  }, [newCustomerName, newCustomerPhone, monthlyBillCustomers, toast])

  const loadMenuItems = useCallback(async () => {
    try {
      const items = await getMenuItems()
      setMenuItems(items)
      setLoading(false)
    } catch (error) {
      console.error("Error loading menu items:", error)
      setLoading(false)
      toast({
        title: "Error",
        description: "Failed to load menu items. Please check your connection and try again.",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await loadMenuItems()
        const [customers, favoriteItemIds, loadedCategories] = await Promise.all([
          getMonthlyBillCustomers({ withoutSorting: true }),
          getFavoriteItems(),
          getCategories(),
        ])
        setMonthlyBillCustomers(customers)
        setFavoriteItems(new Set(favoriteItemIds))
        setCategories(loadedCategories)
      } catch (error: any) {
        console.error("Error loading initial data:", error)
        toast({
          title: "Error",
          description: "Failed to load initial data. Please refresh the page or contact support.",
          variant: "destructive",
        })
      }
    }

    loadInitialData()
  }, [toast, loadMenuItems])

  // Monitor internet connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineDialog(false)
      toast({
        title: "Connected",
        description: "Internet connection restored",
      })
      // Reload table orders from Firebase when connection is restored
      loadTableOrdersFromFirebase()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineDialog(true)
    }

    const loadTableOrdersFromFirebase = async () => {
      try {
        const tableOrders = await getTableOrders()
        setQueuedOrders(tableOrders)
      } catch (error) {
        console.error("Error loading table orders:", error)
      }
    }

    // Load table orders on mount
    loadTableOrdersFromFirebase()

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Check initial status
    if (!navigator.onLine) {
      setIsOnline(false)
      setShowOfflineDialog(true)
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [toast])

  // Helper function to check connection before operations
  const ensureOnline = useCallback(async (): Promise<boolean> => {
    const online = await checkInternetConnection()
    if (!online) {
      setIsOnline(false)
      setShowOfflineDialog(true)
      return false
    }
    return true
  }, [])

  const toggleFavorite = useCallback(
    async (itemId: string) => {
      try {
        if (favoriteItems.has(itemId)) {
          await removeFavoriteItem(itemId)
          setFavoriteItems((prev) => {
            const newFavorites = new Set(prev)
            newFavorites.delete(itemId)
            return newFavorites
          })
        } else {
          await saveFavoriteItem(itemId)
          setFavoriteItems((prev) => {
            const newFavorites = new Set(prev)
            newFavorites.add(itemId)
            return newFavorites
          })
        }
      } catch (error) {
        console.error("Error toggling favorite:", error)
        toast({
          title: "Error",
          description: "Failed to update favorite status",
        })
      }
    },
    [favoriteItems, toast],
  )

  const handleSectionChange = useCallback(
    (direction: "next" | "prev") => {
      const allSections = ["Favorites", ...categories.map((cat) => cat.name)]
      const currentIndex = allSections.indexOf(currentSection)
      if (direction === "next") {
        setCurrentSection(allSections[(currentIndex + 1) % allSections.length])
      } else {
        setCurrentSection(allSections[(currentIndex - 1) % allSections.length])
      }
    },
    [currentSection, categories],
  )

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (!keyboardEnabled) return // Skip keyboard handling if disabled
      if (showQuantityDialog) return // Skip keyboard handling if quantity dialog is open

      const key = event.key?.toLowerCase()

      // Remove the Enter key shortcut for KOT printing
      // if (key === "enter") {
      //   event.preventDefault()
      //   if (billingMode === "regular") {
      //     if (Object.keys(order).length > 0) {
      //       handlePrintKOT()
      //     }
      //   } else if (Object.keys(order).length > 0) {
      //     handleAddToMonthlyBill()
      //   }
      //   return
      // }

      // New shortcut keys
      if (billingMode === "regular") {
        /*
        if (key === "a") {
          event.preventDefault()
          if (Object.keys(order).length > 0) {
            handlePrintKOT()
          }
          return
        }
        if (key === "s") {
          event.preventDefault()
          if (Object.keys(order).length > 0) {
            handlePrintBill()
          }
          return
        }
        */
      }

      // Section navigation
      if (key === "arrowright") {
        event.preventDefault()
        handleSectionChange("next")
        return
      }
      if (key === "arrowleft") {
        event.preventDefault()
        handleSectionChange("prev")
        return
      }

      // Number keys for items
      const num = Number.parseInt(event.key)
      if (!isNaN(num)) {
        const sectionItems =
          currentSection === "Favorites"
            ? menuItems.filter((item) => favoriteItems.has(item.id))
            : menuItems.filter((item) => item.section === currentSection)
        if (num > 0 && num <= sectionItems.length) {
          // Instead of directly adding item, show quantity dialog
          setSelectedItemForQuantity(sectionItems[num - 1])
          setQuantityInput(1)
          setShowQuantityDialog(true)
        }
      }
    },
    [
      keyboardEnabled,
      showQuantityDialog,
      handlePrintKOT,
      handlePrintBill,
      handleAddToMonthlyBill,
      handleSectionChange,
      menuItems,
      currentSection,
      billingMode,
      order,
      favoriteItems,
      setSelectedItemForQuantity,
      setQuantityInput,
      setShowQuantityDialog,
      categories,
    ],
  )

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault()
    switch (e.key) {
      case "ArrowUp":
        setQuantityInput((prev) => prev + 1)
        break
      case "ArrowDown":
        setQuantityInput((prev) => Math.max(1, prev - 1))
        break
      case "Enter":
        if (selectedItemForQuantity) {
          setOrder((prev) => ({
            ...prev,
            [selectedItemForQuantity.id]: (prev[selectedItemForQuantity.id] || 0) + quantityInput,
          }))
          setShowQuantityDialog(false)
          setSelectedItemForQuantity(null)
          // Refocus the search input after closing the dialog
          setTimeout(() => {
            const searchInput = document.querySelector('input[placeholder="Search menu items..."]') as HTMLInputElement
            if (searchInput) searchInput.focus()
          }, 0)
        }
        break
      case "Escape":
        setShowQuantityDialog(false)
        setSelectedItemForQuantity(null)
        break
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => {
      window.removeEventListener("keydown", handleKeyPress)
    }
  }, [handleKeyPress])

  // Add a new function to handle keyboard navigation in the search suggestions
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    // Only process if we have suggestions visible
    if (searchQuery.trim().length > 0) {
      const filteredItems = menuItems
        .filter((item) => item.name.toLowerCase().startsWith(searchQuery.toLowerCase()))
        .slice(0, 10)

      if (filteredItems.length === 0) return

      // Handle arrow down - move to next suggestion
      if (e.key === "ArrowDown") {
        e.preventDefault() // Prevent page scrolling
        setSelectedSuggestionIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0))
      }

      // Handle arrow up - move to previous suggestion
      else if (e.key === "ArrowUp") {
        e.preventDefault() // Prevent page scrolling
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1))
      }

      // Handle Enter - select the highlighted suggestion
      else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
        e.preventDefault()
        const selectedItem = filteredItems[selectedSuggestionIndex]
        setSelectedItemForQuantity(selectedItem)
        setQuantityInput(1)
        setShowQuantityDialog(true)
        setSearchQuery("")
        setSelectedSuggestionIndex(-1)
        setEnterKeyPressCount(0) // Reset counter when selecting an item
      }
    }
  }

  // Update the currentSectionItems calculation to include search filtering
  // Replace the existing currentSectionItems declaration with this:
  const currentSectionItems = useMemo(() => {
    const sectionItems =
      currentSection === "Favorites"
        ? menuItems.filter((item) => favoriteItems.has(item.id))
        : menuItems.filter((item) => {
            const category = categories.find((cat) => cat.name === currentSection)
            return category && (item.section === category.id || item.section === category.name)
          })

    if (!searchQuery.trim()) return sectionItems

    return sectionItems.filter((item) => item.name.toLowerCase().startsWith(searchQuery.toLowerCase()))
  }, [currentSection, menuItems, favoriteItems, searchQuery, categories])

  const handleAddCustomItem = useCallback(() => {
    if (!newCustomItem.name || !newCustomItem.price || !newCustomItem.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setCustomItems([
      ...customItems,
      {
        name: newCustomItem.name,
        price: Number(newCustomItem.price),
        quantity: Number(newCustomItem.quantity),
      },
    ])
    setNewCustomItem({ name: "", price: "", quantity: "" })
  }, [customItems, newCustomItem, toast])

  const handleCustomBillSave = useCallback(async () => {
    if (customItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      })
      return
    }

    try {
      const total = customItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

      // Create items map and menu items for custom bill
      const customItemsMap = customItems.reduce(
        (acc, item, index) => ({
          ...acc,
          [`custom-${index}`]: item.quantity,
        }),
        {},
      )
      
      const customMenuItems = customItems.map((item, index) => ({
        id: `custom-${index}`,
        name: item.name,
        price: item.price,
      }))

      // Create bill content with token number
      const { content, tokenNumber: billToken } = generateBillContent(
        customItemsMap,
        total,
        customMenuItems,
      )

      // Print the bill
      printThermal(content, "Bill")

      // Save to database
      if (!auth.currentUser) {
        throw new Error("User not authenticated")
      }

      await saveOrder({
        items: customItemsMap,
        total,
        kotPrinted: true,
        billPrinted: true,
        isCustomBill: true,
        customItems,
        tokenNumber: billToken,
        timestamp: new Date(),
        userId: auth.currentUser.uid,
        menuItems: customMenuItems, // Save for reprinting
      })

      toast({
        title: "Success",
        description: "Custom bill saved and printed",
      })

      // Reset custom items
      setCustomItems([])
      setNewCustomItem({ name: "", price: "", quantity: "" })
    } catch (error) {
      console.error("Error saving custom bill:", error)
      toast({
        title: "Error",
        description: "Failed to save and print custom bill",
      })
    }
  }, [customItems, toast])

  const handleRemoveCustomItem = useCallback(
    (index: number) => {
      setCustomItems(customItems.filter((_, i) => i !== index))
    },
    [customItems],
  )

  useEffect(() => {
    // Focus the search input when component loads
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  const resetEnterKeyPressCount = useCallback(() => {
    setEnterKeyPressCount(0)
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-3xl font-bold">Billing</h1>

      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                <Button
                  variant={billingMode === "regular" ? "default" : "outline"}
                  onClick={() => setBillingMode("regular")}
                >
                  Regular Billing
                </Button>
                <Button
                  variant={billingMode === "monthly" ? "default" : "outline"}
                  onClick={() => setBillingMode("monthly")}
                >
                  Monthly Billing
                </Button>
              </div>

              {billingMode === "monthly" && (
                <div className="flex items-center gap-2">
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthlyBillCustomers.map((customer) => (
                        <SelectItem key={customer} value={customer}>
                          {customer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={isAddingCustomer} onOpenChange={setIsAddingCustomer}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Customer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Customer Name</Label>
                          <Input
                            id="name"
                            value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            placeholder="Enter customer name"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Phone Number (Optional)</Label>
                          <Input
                            id="phone"
                            value={newCustomerPhone}
                            onChange={(e) => setNewCustomerPhone(e.target.value)}
                            placeholder="Enter phone number"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddNewCustomer}>Add Customer</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 mt-6">
            {/* Add a search input field with suggestions after the section buttons */}
            <div className="mt-4 mb-8 relative">
              <Input
                ref={searchInputRef}
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedSuggestionIndex(-1) // Reset selection when typing
                }}
                onKeyDown={(e) => {
                  // Handle search suggestions navigation
                  if (searchQuery.trim().length > 0) {
                    const filteredItems = menuItems
                      .filter((item) => item.name.toLowerCase().startsWith(searchQuery.toLowerCase()))
                      .slice(0, 10)

                    if (filteredItems.length === 0) return

                    // Handle arrow down - move to next suggestion
                    if (e.key === "ArrowDown") {
                      e.preventDefault() // Prevent page scrolling
                      setSelectedSuggestionIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0))
                    }

                    // Handle arrow up - move to previous suggestion
                    else if (e.key === "ArrowUp") {
                      e.preventDefault() // Prevent page scrolling
                      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1))
                    }

                    // Handle Enter - select the highlighted suggestion
                    else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
                      e.preventDefault()
                      const selectedItem = filteredItems[selectedSuggestionIndex]
                      setSelectedItemForQuantity(selectedItem)
                      setQuantityInput(1)
                      setShowQuantityDialog(true)
                      setSearchQuery("")
                      setSelectedSuggestionIndex(-1)
                      setEnterKeyPressCount(0) // Reset counter when selecting an item
                    }
                  } else if (e.key === "Enter" && Object.keys(order).length > 0) {
                    e.preventDefault()
                    // First Enter press - Print KOT
                    if (enterKeyPressCount === 0) {
                      handlePrintKOT()
                      setEnterKeyPressCount(1)
                      // Reset the                      setTimeout(() => resetEnterKeyPressCount(), 3000)
                    }
                    // Second Enter press - Print Bill
                    else if (enterKeyPressCount === 1) {
                      handlePrintBill()
                      setEnterKeyPressCount(0)
                    }
                  }
                }}
                className="w-1/3 ml-0"
                onFocus={() => setKeyboardEnabled(false)}
                onBlur={() => setKeyboardEnabled(true)}
              />
              {searchQuery.trim().length > 0 && (
                <div className="absolute z-10 w-1/3 left-0 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {menuItems
                    .filter((item) => item.name.toLowerCase().startsWith(searchQuery.toLowerCase()))
                    .slice(0, 10)
                    .map((item, index) => (
                      <div
                        key={item.id}
                        className={`p-2 hover:bg-muted cursor-pointer flex justify-between items-center ${
                          index === selectedSuggestionIndex ? "bg-muted" : ""
                        }`}
                        onClick={() => {
                          setSelectedItemForQuantity(item)
                          setQuantityInput(1)
                          setShowQuantityDialog(true)
                          setSearchQuery("")
                          setSelectedSuggestionIndex(-1)
                          // Create a reference to the search input to refocus after state updates
                          setTimeout(() => {
                            const searchInput = document.querySelector(
                              'input[placeholder="Search menu items..."]',
                            ) as HTMLInputElement
                            if (searchInput) searchInput.focus()
                          }, 0)
                        }}
                      >
                        <span>{item.name}</span>
                        <span className="text-green-600 dark:text-green-400">₹{item.price}</span>
                      </div>
                    ))}
                  {menuItems.filter((item) => item.name.toLowerCase().startsWith(searchQuery.toLowerCase())).length ===
                    0 && <div className="p-2 text-muted-foreground">No items found</div>}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
            {/* Menu items hidden - empty space */}
            <div className="h-32"></div>
            <div className="h-32"></div>
            <div className="h-32"></div>
            <div className="h-32"></div>
            <div className="h-32"></div>
          </div>

          {/* Add spacer between menu items and custom item section */}
          <div className="h-12"></div>

          {/* Custom Item Input in Regular Mode */}
          <Card className="mt-8 border-2">
            <CardHeader>
              <CardTitle>Add Custom Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="itemName">Item Name</Label>
                  <Input
                    id="itemName"
                    value={newCustomItem.name}
                    onChange={(e) => setNewCustomItem({ ...newCustomItem, name: e.target.value })}
                    placeholder="Enter item name"
                    onFocus={() => setKeyboardEnabled(false)}
                    onBlur={() => setKeyboardEnabled(true)}
                  />
                </div>
                <div>
                  <Label htmlFor="itemPrice">Price</Label>
                  <Input
                    id="itemPrice"
                    type="number"
                    value={newCustomItem.price}
                    onChange={(e) => setNewCustomItem({ ...newCustomItem, price: e.target.value })}
                    placeholder="Enter price"
                    onFocus={() => setKeyboardEnabled(false)}
                    onBlur={() => setKeyboardEnabled(true)}
                  />
                </div>
                <div>
                  <Label htmlFor="itemQuantity">Quantity</Label>
                  <Input
                    id="itemQuantity"
                    type="number"
                    value={newCustomItem.quantity}
                    onChange={(e) => setNewCustomItem({ ...newCustomItem, quantity: e.target.value })}
                    placeholder="Enter quantity"
                    onFocus={() => setKeyboardEnabled(false)}
                    onBlur={() => setKeyboardEnabled(true)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddCustomItem} className="w-full">
                    Add Item
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="w-[400px] border-2">
          <CardHeader>
            <CardTitle>New Order - {currentSection}</CardTitle>
            {selectedQueuedOrder && (
              <div className="text-sm text-muted-foreground">Table: {selectedQueuedOrder.tableName}</div>
            )}
          </CardHeader>
          <CardContent>
            <div className="mt-4 space-y-2">
              {/* Regular menu items */}
              {Object.entries(order).map(([id, quantity]) => {
                const item = menuItems.find((item) => item.id === id)
                const price = item?.price || 0
                const isParcel = parcelItems.has(id)

                return (
                  <div key={id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`parcel-${id}`}
                        checked={isParcel}
                        onChange={() => toggleParcelItem(id)}
                        className="h-4 w-4 mt-1"
                      />
                      <span>{item?.name}</span>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const newQuantity = Number.parseInt(e.target.value)
                          if (newQuantity > 0) {
                            setOrder((prev) => ({
                              ...prev,
                              [id]: newQuantity,
                            }))
                          }
                        }}
                        min="1"
                        className="w-16 h-8 text-center"
                        onKeyDown={(e) => {
                          if (e.key === "-" || (e.key === "0" && !e.currentTarget.value)) {
                            e.preventDefault()
                          }
                        }}
                      />
                    </div>
                    <div>
                      <span className="mr-4 text-green-600 dark:text-green-400">₹{(price * quantity).toFixed(2)}</span>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => removeItem(id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )
              })}

              {/* Custom items */}
              {customItems.map((item, index) => (
                <div key={`custom-${index}`} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>{item.name}</span>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const newQuantity = Number.parseInt(e.target.value)
                        if (newQuantity > 0) {
                          setCustomItems((prev) =>
                            prev.map((customItem, i) =>
                              i === index ? { ...customItem, quantity: newQuantity } : customItem,
                            ),
                          )
                        }
                      }}
                      min="1"
                      className="w-16 h-8 text-center"
                      onKeyDown={(e) => {
                        if (e.key === "-" || (e.key === "0" && !e.currentTarget.value)) {
                          e.preventDefault()
                        }
                      }}
                    />
                  </div>
                  <div>
                    <span className="mr-4 text-green-600 dark:text-green-400">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleRemoveCustomItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              Total: ₹
              {billingMode === "custom"
                ? customItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
                : calculateTotal().toFixed(2)}
            </div>
            <div className="flex gap-2 w-full">
              {billingMode === "regular" ? (
                <>
                  <Button onClick={handlePrintKOT} className="flex-1">
                    Print KOT
                  </Button>
                  <Button onClick={handlePrintBill} className="flex-1">
                    Print Bill
                  </Button>
                  <Button onClick={handleSaveBill} className="flex-1">
                    Save Bill
                  </Button>
                </>
              ) : billingMode === "monthly" ? (
                <Button onClick={handleAddToMonthlyBill} className="flex-1">
                  Add to Monthly Bill
                </Button>
              ) : (
                <Button onClick={handleCustomBillSave} className="flex-1">
                  Save & Print Bill
                </Button>
              )}
            </div>
            <div className="flex gap-2 w-full">
              <Button onClick={resetOrder} className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0">
                Clear
              </Button>
              <Button onClick={handleSaveToQueue} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-0">
                Save to Table
              </Button>
            </div>

            {/* Queued Orders Section */}
            {queuedOrders.length > 0 && (
              <div className="mt-4 w-full">
                <h3 className="font-medium mb-2">Queued Tables:</h3>
                <div className="flex flex-wrap gap-2">
                  {queuedOrders.map((queuedOrder) => (
                    <Button
                      key={queuedOrder.id}
                      variant="outline"
                      size="sm"
                      className={selectedQueuedOrder?.id === queuedOrder.id ? "bg-primary text-primary-foreground" : ""}
                      onClick={() => loadQueuedOrder(queuedOrder)}
                    >
                      Table {queuedOrder.tableName}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>

      {billingMode === "custom" && (
        <Card className="mt-4 border-2">
          <CardHeader>
            <CardTitle>Custom Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="itemName">Item Name</Label>
                <Input
                  id="itemName"
                  value={newCustomItem.name}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, name: e.target.value })}
                  placeholder="Enter item name"
                  onFocus={() => setKeyboardEnabled(false)}
                  onBlur={() => setKeyboardEnabled(true)}
                />
              </div>
              <div>
                <Label htmlFor="itemPrice">Price</Label>
                <Input
                  id="itemPrice"
                  type="number"
                  value={newCustomItem.price}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, price: e.target.value })}
                  placeholder="Enter price"
                  onFocus={() => setKeyboardEnabled(false)}
                  onBlur={() => setKeyboardEnabled(true)}
                />
              </div>
              <div>
                <Label htmlFor="itemQuantity">Quantity</Label>
                <Input
                  id="itemQuantity"
                  type="number"
                  value={newCustomItem.quantity}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, quantity: e.target.value })}
                  placeholder="Enter quantity"
                  onFocus={() => setKeyboardEnabled(false)}
                  onBlur={() => setKeyboardEnabled(true)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddCustomItem} className="w-full">
                  Add Item
                </Button>
              </div>
            </div>

            {customItems.length > 0 && (
              <>
                <div className="border rounded-lg p-4 mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>₹{item.price.toFixed(2)}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="destructive" size="sm" onClick={() => handleRemoveCustomItem(index)}>
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-xl font-bold">
                    Total: ₹{customItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                  </div>
                  <Button onClick={handleCustomBillSave}>Save & Print Bill</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog for entering table number */}
      <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Order to Table</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tableNumber">Table Number</Label>
              <Input
                id="tableNumber"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Enter table number"
                onFocus={() => setKeyboardEnabled(false)}
                onBlur={() => setKeyboardEnabled(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    confirmSaveToQueue()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQueueDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSaveToQueue}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quantity Dialog */}
      <Dialog
        open={showQuantityDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowQuantityDialog(false)
            setSelectedItemForQuantity(null)
          }
        }}
      >
        <DialogContent onKeyDown={handleQuantityKeyDown}>
          <DialogHeader>
            <DialogTitle>Enter Quantity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>
                {selectedItemForQuantity?.name} - ₹{selectedItemForQuantity?.price}
              </Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setQuantityInput((prev) => Math.max(1, prev - 1))}>
                  -
                </Button>
                <Input
                  type="number"
                  value={quantityInput}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value)
                    if (value >= 1) setQuantityInput(value)
                  }}
                  className="w-20 text-center"
                  min="1"
                />
                <Button variant="outline" size="icon" onClick={() => setQuantityInput((prev) => prev + 1)}>
                  +
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (selectedItemForQuantity) {
                  setOrder((prev) => ({
                    ...prev,
                    [selectedItemForQuantity.id]: (prev[selectedItemForQuantity.id] || 0) + quantityInput,
                  }))
                  setShowQuantityDialog(false)
                  setSelectedItemForQuantity(null)
                  // Refocus the search input after closing the dialog
                  setTimeout(() => {
                    const searchInput = document.querySelector(
                      'input[placeholder="Search menu items..."]',
                    ) as HTMLInputElement
                    if (searchInput) searchInput.focus()
                  }, 0)
                }
              }}
            >
              Add to Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offline Alert Dialog */}
      <AlertDialog open={showOfflineDialog} onOpenChange={setShowOfflineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-destructive" />
              No Internet Connection
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are currently offline. Billing operations require an internet connection to save data to the server.
              <br /><br />
              Please check your internet connection and try again. Your current order will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowOfflineDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
