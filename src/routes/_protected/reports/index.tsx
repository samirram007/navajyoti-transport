import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, CalendarDays, Users, Truck, Building2, LineChart, Hourglass, BadgePercent, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/_protected/reports/')({
  component: ReportsIndexPage,
})

function ReportsIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate financial reports and summaries
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/reports/income-expense" className="block group">
          <Card className="h-full hover:shadow-elevation-3 transition-all duration-200 group-hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Income vs Expense</CardTitle>
                  <CardDescription>
                    Monthly revenue and expense comparison
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>Monthly income & expense comparison charts</li>
                <li>Income & expense breakdown by group</li>
                <li>Payment mode analysis</li>
                <li>CSV & PDF export</li>
              </ul>
              <div className="mt-4">
                <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Open Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/reports/daily-collection" className="block group">
          <Card className="h-full hover:shadow-elevation-3 transition-all duration-200 group-hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <CalendarDays className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Daily Collection</CardTitle>
                  <CardDescription>
                    Day-by-day fee and expense details
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>Daily summary of collections & expenses</li>
                <li>Detailed transaction listing</li>
                <li>Filterable by date range</li>
                <li>CSV & PDF export</li>
              </ul>
              <div className="mt-4">
                <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Open Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/reports/pending-collection" className="block group">
          <Card className="h-full hover:shadow-elevation-3 transition-all duration-200 group-hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Hourglass className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Pending Collection</CardTitle>
                  <CardDescription>
                    Month-wise pending fees with status tracking
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>Summary of billed, collected & pending totals</li>
                <li>Month-wise breakdown of pending fees</li>
                <li>Detailed per-month fee listing by rider</li>
                <li>CSV & PDF export</li>
              </ul>
              <div className="mt-4">
                <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Open Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/reports/credit-notes" className="block group">
          <Card className="h-full hover:shadow-elevation-3 transition-all duration-200 group-hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <BadgePercent className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Credit Notes</CardTitle>
                  <CardDescription>
                    Credit issued vs applied over time
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>Month-wise credit issued from cancelled vouchers</li>
                <li>Credit applied against fees and outstanding balance</li>
                <li>Chart + table with cumulative balance tracking</li>
                <li>CSV & PDF export</li>
              </ul>
              <div className="mt-4">
                <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Open Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/reports/rider-fee-collection" className="block group">
          <Card className="h-full hover:shadow-elevation-3 transition-all duration-200 group-hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Rider Fee Collection</CardTitle>
                  <CardDescription>
                    Fees collected per rider with status tracking
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>Per-rider fee collection and balance tracking</li>
                <li>Status breakdown: paid, partial, unpaid</li>
                <li>Filter by school, fiscal year, date range, and search</li>
                <li>CSV & PDF export</li>
              </ul>
              <div className="mt-4">
                <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Open Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/reports/vehicle-fee-collection" className="block group">
          <Card className="h-full hover:shadow-elevation-3 transition-all duration-200 group-hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Truck className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Vehicle Fee Collection</CardTitle>
                  <CardDescription>
                    Fees collected per vehicle with statistics
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>Per-vehicle fee collection and balance tracking</li>
                <li>Vehicle capacity and rider count overview</li>
                <li>Filter by fiscal year, date range, and search</li>
                <li>CSV & PDF export</li>
              </ul>
              <div className="mt-4">
                <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Open Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/reports/school-fee-collection" className="block group">
          <Card className="h-full hover:shadow-elevation-3 transition-all duration-200 group-hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                  <Building2 className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">School Fee Collection</CardTitle>
                  <CardDescription>
                    Fees aggregated by school
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>School-wise fee collection and balance tracking</li>
                <li>Rider count and collection progress per school</li>
                <li>Filter by fiscal year and date range</li>
                <li>CSV & PDF export</li>
              </ul>
              <div className="mt-4">
                <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Open Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/reports/monthly-trend" className="block group">
          <Card className="h-full hover:shadow-elevation-3 transition-all duration-200 group-hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                  <LineChart className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Monthly Trend</CardTitle>
                  <CardDescription>
                    Collection trends across multiple fiscal years
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>Multi-year income and expense comparison</li>
                <li>Year-over-year monthly trend charts</li>
                <li>Toggle expense visibility</li>
                <li>CSV & PDF export</li>
              </ul>
              <div className="mt-4">
                <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Open Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
