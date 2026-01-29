import { Metadata } from "next"
 import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SendIcon } from "lucide-react"
import {
  Tabs,
  TabsContent,
} from "@/components/ui/tabs"
import { Overview } from "@/features/dashboard/components/overview"
import { RecentSales } from "@/features/dashboard/components/recent-sales"
 import { DashboardOverviewClient } from "@/features/dashboard/components/dashboard-overview-client"

export const metadata: Metadata = {
  title: "Dashboard - FarmZap",
  description: "FarmZap Management Dashboard",
}

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <DashboardOverviewClient />
    </div>
  )
}
