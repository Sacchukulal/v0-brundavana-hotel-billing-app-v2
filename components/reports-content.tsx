"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrdersReport } from "./reports/orders-report"
import { MobileCustomersReport } from "./reports/mobile-customers-report"
import { MonthlyCustomersReport } from "./reports/monthly-customers-report"
import { ItemSalesReport } from "./reports/item-sales-report"

export default function ReportsContent() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>

      <Tabs defaultValue="orders" className="space-y-4">
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
