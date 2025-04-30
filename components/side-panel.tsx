"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SidePanelProps {
  children: React.ReactNode
  open: boolean
  onClose: () => void
}

export function SidePanel({ children, open, onClose }: SidePanelProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div
      className={cn(
        "absolute right-0 top-0 z-[2000] h-full w-80 transform bg-[#F7F3EC] p-4 shadow-lg transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#8B3E2F]">Controls</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-[#8B3E2F] hover:bg-[#8B3E2F]/10">
          <X size={20} />
        </Button>
      </div>
      <div className="overflow-y-auto">{children}</div>
    </div>
  )
}
