/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { FeesPosPage } from '@/features/fees/pages/fees-pos-page'
import axiosClient from '@/lib/axios-client'

export const Route = createFileRoute('/_protected/fees/$feeId/edit')({
  component: EditFeePage,
})

function EditFeePage() {
  const { feeId } = Route.useParams()
  const [editFee, setEditFee] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    axiosClient.get(`/fees/${feeId}`)
      .then(res => {
        setEditFee(res.data?.data || null)
        setLoading(false)
      })
      .catch(err => {
        setError(err?.response?.data?.message || 'Failed to load fee')
        setLoading(false)
      })
  }, [feeId])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          Loading fee...
        </div>
      </div>
    )
  }

  if (error || !editFee) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive font-medium">{error || 'Fee not found'}</p>
        </div>
      </div>
    )
  }

  return <FeesPosPage editFee={editFee} />
}
