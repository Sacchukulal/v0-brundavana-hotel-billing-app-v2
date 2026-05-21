"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrdersReport } from "./reports/orders-report"
import { MobileCustomersReport } from "./reports/mobile-customers-report"
import { MonthlyCustomersReport } from "./reports/monthly-customers-report"
import { ItemSalesReport } from "./reports/item-sales-report"

// Splash Screen Component for Reports
const ReportsSplashScreen = () => (
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

      {/* Text Content */}
      <div className="space-y-4">
        <h2 className="text-4xl font-bold text-white">Brundavana</h2>
        <p className="text-gray-400 text-lg">Loading your reports...</p>
        <div className="h-1 w-32 bg-gradient-to-r from-green-500 to-blue-500 mx-auto rounded-full"></div>
      </div>

      {/* Developer Info */}
      <div className="mt-16 space-y-2">
        <p className="text-gray-400">Developed & Marketed by</p>
        <p className="text-green-500 text-xl font-semibold">Sachin Kulal</p>
        <div className="inline-block border-2 border-green-500 rounded-full px-6 py-2 mt-4">
          <p className="text-green-500 font-semibold">₹15 per day</p>
        </div>
      </div>
    </div>
  </div>
)

export default function ReportsContent() {
  const [showSplash, setShowSplash] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState("orders")

  useEffect(() => {
    // Set minimum splash screen duration to 2 seconds
    const splashTimer = setTimeout(() => {
      if (dataLoaded) {
        setShowSplash(false)
      }
    }, 2000)

    return () => clearTimeout(splashTimer)
  }, [dataLoaded])

  // Once data is loaded, check if we should hide splash
  useEffect(() => {
    if (dataLoaded && !showSplash) return
    
    if (dataLoaded) {
      setTimeout(() => setShowSplash(false), 2000)
    }
  }, [dataLoaded, showSplash])

  // Simulate report data loading on tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setDataLoaded(true)
  }

  // Mark data as loaded after component mounts
  useEffect(() => {
    const loadTimer = setTimeout(() => {
      setDataLoaded(true)
    }, 1500)

    return () => clearTimeout(loadTimer)
  }, [])

  if (showSplash && !dataLoaded) {
    return <ReportsSplashScreen />
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>

      <Tabs defaultValue="orders" className="space-y-4" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="items">Item Sales</TabsTrigger>
          <TabsTrigger value="mobile">Mobile Customers</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <OrdersReport />
        </TabsContent>

        <TabsContent value="items">
          <ItemSalesReport />
        </TabsContent>

        <TabsContent value="mobile">
          <MobileCustomersReport />
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyCustomersReport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
