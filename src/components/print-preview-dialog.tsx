import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface PrintPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  html: string
  title?: string
}

export function PrintPreviewDialog({ open, onOpenChange, html, title = 'Print Preview' }: PrintPreviewDialogProps) {
  const srcDoc = useMemo(() => html || '', [html])

  const handlePrint = () => {
    // Find the iframe by title and print its content
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
          <Button size="sm" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print
          </Button>
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
