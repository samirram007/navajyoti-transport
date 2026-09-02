import { useMemo, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Stamp, Printer } from 'lucide-react'

const STAMP_KEY = 'print-preview-show-stamp'

interface PrintPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  html: string
  title?: string
}

export function PrintPreviewDialog({ open, onOpenChange, html, title = 'Print Preview' }: PrintPreviewDialogProps) {
  const [showStamp, setShowStamp] = useState(() => {
    try {
      const saved = localStorage.getItem(STAMP_KEY)
      return saved !== null ? saved !== 'false' : true
    } catch {
      return true
    }
  })

  // Persist stamp toggle to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STAMP_KEY, String(showStamp))
    } catch { /* ignore */ }
  }, [showStamp])

  const srcDoc = useMemo(() => {
    if (!html) return ''
    if (showStamp) return html
    // Inject CSS to hide the stamp area
    return html.replace(
      '<style>',
      '<style>.stamp-area{display:none!important}</style><style>'
    )
  }, [html, showStamp])

  const handlePrint = () => {
    const iframe = document.querySelector('iframe[title="Print Preview"]') as HTMLIFrameElement
    if (!iframe?.contentWindow) return
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showStamp ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowStamp(s => !s)}
            >
              <Stamp className="h-4 w-4" /> Stamp
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-white">
          {open && (
            <iframe
              title="Print Preview"
              srcDoc={srcDoc}
              className="w-full h-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
