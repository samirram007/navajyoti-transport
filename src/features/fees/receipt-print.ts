// Money-receipt print builder for rider fee collections.
// Reproduces the legacy receipt style exactly (bordered box, logo + centered
// org header, month chips, thick total rule, "(in words)" line, print time at
// the bottom right) and is sized for A4/2: one receipt occupies the top half
// of an A4 portrait sheet (210 x 148.5 mm), so the sheet can be cut in two
// after printing. The receipt fills the half-sheet: header gets generous
// spacing, the Total row is pushed to the bottom of the content area and the
// remaining blank space is reserved for the (toggleable) stamp.
import logoDataUrl from '@/features/fees/assets/logo.png'

const MONTHS_MED = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Formats a fee date as "15 Jul 2026" for the receipt header. */
export function formatReceiptDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  return `${dd} ${MONTHS_MED[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Chip label for a month within a fiscal year, e.g. "APR 26" — and "JAN 27"
 * for months that fall into the next calendar year of the fiscal year.
 */
export function monthChipLabel(
  month?: { number?: number; shortName?: string; name?: string } | null,
  fyStartDate?: string,
): string {
  const name = month?.shortName || month?.name || ''
  if (!name) return ''
  const fyStart = fyStartDate ? new Date(fyStartDate) : null
  if (!fyStart || isNaN(fyStart.getTime()) || !month?.number) return name
  const startYear = fyStart.getFullYear()
  const startMonth = fyStart.getMonth() + 1
  const year = startYear + (month.number < startMonth ? 1 : 0)
  return `${name} ${String(year).slice(-2)}`
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const convert = (n: number): string => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }
  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 100)
  let result = convert(intPart) + ' Rupees'
  if (decPart > 0) result += ' and ' + convert(decPart) + ' Paise'
  return result + ' Only'
}

export interface ReceiptItem {
  name?: string
  months?: string
  qty: number
  amount: number
  total: number
}

export interface ReceiptData {
  feeNo?: string
  date: string
  riderName?: string
  riderStd?: string
  riderSection?: string
  riderRollNo?: string
  riderCode?: string
  riderSchoolName?: string
  riderSchoolTime?: string
  items: ReceiptItem[]
  totalAmount: number
  // Accepted for call-site compatibility; the receipt style shows
  // particulars + total only.
  paidAmount?: number
  balanceAmount?: number
  creditAmount?: number
  paymentMode?: string
  note?: string
  paymentDetails?: Record<string, string>
  orgName?: string
  orgAddress?: string
  logoUrl?: string
}

function formatPrintTime(): string {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mmm = MONTHS_MED[now.getMonth()]
  const hh = now.getHours() % 12 || 12
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ampm = now.getHours() >= 12 ? 'pm' : 'am'
  return `${dd} ${mmm} ${now.getFullYear()} ${hh}:${mm} ${ampm}`
}

export function buildReceiptHtml(data: ReceiptData): string {
  // A relative/stripped document path cannot be loaded from the srcDoc iframe
  // (no auth, wrong origin), so only absolute http(s) URLs are used; anything
  // else falls back to the bundled school logo.
  const logoSrc = data.logoUrl && /^https?:\/\//.test(data.logoUrl) ? data.logoUrl : logoDataUrl

  const monthChips = (months?: string) =>
    (months || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(m => `<span class="chip">${m}</span>`)
      .join('')

  const itemRows = data.items
    .map(i => `<tr><td class="p">${i.name || 'Fee'}${monthChips(i.months)}</td><td class="a">${Number(i.total).toFixed(2)}</td></tr>`)
    .join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Money Receipt</title>
<style>
@page{size:A4 portrait;margin:5mm}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff}
body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.sheet{width:200mm;height:141mm;page-break-inside:avoid}
.receipt{width:100%;height:100%;border:2px solid #0f172a;background:#fff;display:flex;flex-direction:column;padding:4mm 5mm}
.toprow{display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px}
.head{display:flex;align-items:flex-start;padding:4px 0 6px}
.logo{flex:0 0 92px;width:92px;display:flex;justify-content:center}
.logo img{width:82px;height:82px;object-fit:contain}
.head-center{flex:1;text-align:center}
.logo-spacer{flex:0 0 92px;width:92px}
.org{font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;line-height:1.3}
.addr{font-size:11.5px;color:#1f2937;margin-top:3px}
.title{font-size:14.5px;font-weight:700;text-decoration:underline;margin:10px 0 7px}
.info{font-size:12.5px;line-height:1.95;text-align:left;padding-left:16px}
.info b{font-weight:700}
.info .crow{display:flex;flex-wrap:wrap;gap:0 24px}
.table-section{flex:1;display:flex;flex-direction:column;margin-top:8px;min-height:0}
table{width:100%;border-collapse:collapse}
thead th{border-top:2px solid #0f172a;border-bottom:2px solid #0f172a;font-weight:700;font-size:13px;text-align:left;padding:6px 16px}
thead th.p,td.p{width:83.33%}
thead th.p{border-right:2px solid #0f172a}
thead th.a{text-align:right}
tbody td{font-size:12.5px;padding:8px 16px;vertical-align:middle}
td.p{border-right:2px solid #0f172a}
td.a{text-align:right;font-size:13px}
.total-row{margin-top:auto;display:flex;border-top:3.5px solid #0f172a;font-weight:800;font-size:15px}
.total-row .tl{width:83.33%;border-right:2px solid #0f172a;text-align:right;padding:6px 16px}
.total-row .ta{flex:1;text-align:right;padding:6px 16px}
.chip{display:inline-block;font-size:10px;font-weight:700;color:#1e293b;border:1.5px solid #94a3b8;border-radius:5px;padding:0 6px;margin-left:5px;background:#f1f5f9;line-height:15px;vertical-align:middle;text-transform:uppercase}
.words{font-size:10.5px;padding-left:16px;margin-top:6px}
.stamp-area{min-height:28mm;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;margin-top:4px}
.stamp-circle{width:26mm;height:26mm;border:2px dashed #94a3b8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;text-align:center}
.printtime{margin-top:auto;text-align:right;font-size:9px;color:#6b7280;padding-top:2px}
</style></head><body>
<div class="sheet">
  <div class="receipt">
    <div class="toprow"><span>${data.feeNo ? `No. ${data.feeNo}` : ''}</span><span>Date: ${data.date}</span></div>
    <div class="head">
      <div class="logo"><img src="${logoSrc}" alt=""/></div>
      <div class="head-center">
        <div class="org">${data.orgName || 'JAY MAA KALI SCHOOL BUS SERVICE'}</div>
        ${data.orgAddress ? `<div class="addr">${data.orgAddress}</div>` : ''}
        <div class="title">Money Receipt</div>
        <div class="info">
          <div>Name: <b>${data.riderName || '---'}</b></div>
          <div>School: <b>${data.riderSchoolName || '---'}</b></div>
          <div class="crow">
            ${data.riderCode ? `<span>Code: <b>${data.riderCode}</b></span>` : ''}
            ${data.riderStd ? `<span>Class: <b>${data.riderStd}</b></span>` : ''}
            ${data.riderSection ? `<span>Sec: <b>${data.riderSection}</b></span>` : ''}
            ${data.riderRollNo ? `<span>RollNo: <b>${data.riderRollNo}</b></span>` : ''}
            ${data.riderSchoolTime ? `<span>Time: <b>${data.riderSchoolTime}</b></span>` : ''}
          </div>
        </div>
      </div>
      <div class="logo-spacer"></div>
    </div>
    <div class="table-section">
      <table>
        <thead><tr><th class="p">Particulars</th><th class="a">Amount</th></tr></thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      <div class="total-row"><div class="tl">Total:</div><div class="ta">${Number(data.totalAmount).toFixed(2)}</div></div>
    </div>
    <div class="words">(in words) : ${numberToWords(Number(data.totalAmount))}</div>
    <div class="stamp-area"><div class="stamp-circle">Authorized<br/>Stamp</div></div>
    <div class="printtime">Print Time: ${formatPrintTime()}</div>
  </div>
</div>
</body></html>`
}
