import ProtectedRoute from "@/components/protected-route"
import OffersContent from "@/components/offers-content"

export default function OffersPage() {
  return (
    <ProtectedRoute>
      <OffersContent />
    </ProtectedRoute>
  )
}
