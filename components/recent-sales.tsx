import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDateTime } from "@/utils/thermalPrinter"

export function RecentSales({ orders }) {
  const formatOrderDate = (timestamp) => {
    if (!timestamp) return "Unknown date"

    // Handle Firestore Timestamp
    if (timestamp && typeof timestamp === "object" && timestamp.toDate) {
      return formatDateTime(timestamp.toDate())
    }

    // Handle Date object
    if (timestamp instanceof Date) {
      return formatDateTime(timestamp)
    }

    // Handle string or number timestamp
    try {
      return formatDateTime(new Date(timestamp))
    } catch {
      return "Invalid date"
    }
  }

  return (
    <div className="space-y-8">
      {orders.map((order, index) => (
        <div key={index} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`/avatars/0${index + 1}.png`} alt="Avatar" />
            <AvatarFallback>O{index + 1}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">Order #{order.id}</p>
            <p className="text-sm text-muted-foreground">{formatOrderDate(order.timestamp)}</p>
          </div>
          <div className="ml-auto font-medium">+₹{order.total.toFixed(2)}</div>
        </div>
      ))}
    </div>
  )
}
