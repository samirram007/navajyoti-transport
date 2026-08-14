/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ExpensesPosPage } from '@/features/expenses/pages/expenses-pos-page'
import { Loader2 } from 'lucide-react'
import axiosClient from '@/lib/axios-client'

export const Route = createFileRoute('/_protected/expenses/$expenseId/edit')({
  component: EditExpensePage,
})

function EditExpensePage() {
  const { expenseId } = Route.useParams()
  const [editExpense, setEditExpense] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    axiosClient.get(`/expenses/${expenseId}`)
      .then(res => {
        setEditExpense(res.data?.data || null)
        setLoading(false)
      })
      .catch(err => {
        setError(err?.response?.data?.message || 'Failed to load expense')
        setLoading(false)
      })
  }, [expenseId])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading expense...
        </div>
      </div>
    )
  }

  if (error || !editExpense) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive font-medium">{error || 'Expense not found'}</p>
        </div>
      </div>
    )
  }

  return <ExpensesPosPage editExpense={editExpense} />
}
