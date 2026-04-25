import ProtectedRoute from "@/components/protected-route"
import ExpensesContent from "@/components/expenses-content"

export default function ExpensesPage() {
  return (
    <ProtectedRoute>
      <ExpensesContent />
    </ProtectedRoute>
  )
}
