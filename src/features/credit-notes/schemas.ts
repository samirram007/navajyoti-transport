export interface CreditNoteRider {
  id: number
  name: string
  code: string | null
}

export interface CreditNoteSourceFee {
  id: number
  fee_no: string | null
  fee_date: string | null
}

export interface CreditNote {
  id: number
  creditNoteNo: string | null
  riderId: number | null
  rider: CreditNoteRider | null
  sourceFeeId: number | null
  sourceFee: CreditNoteSourceFee | null
  amount: number
  usedAmount: number
  balance: number
  status: 'open' | 'partial' | 'used' | 'void'
  note: string | null
  createdAt: string | null
}
