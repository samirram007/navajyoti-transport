/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ExpensesPosPage } from '@/features/expenses/pages/expenses-pos-page'

export const Route = createFileRoute('/_protected/expenses/new')({ component: ExpensesPosPage })
