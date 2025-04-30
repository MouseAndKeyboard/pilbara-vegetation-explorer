"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Menu, X, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { TimeControls } from "@/components/time-controls"
import { SidePanel } from "@/components/side-panel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Dynamically import the Map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#F7F3EC]">
      <p className="text-lg font-medium text-[#333]">Loading map...</p>
    </div>
  ),
})

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date(2023, 0, 15)) // Start with January 15, 2023
  const [activeLayers, setActiveLayers] = useState({
    denseVegetation: true,
    moderateVegetation: true,
    sparseVegetation: true,
    satellite: true,
  })
  const [showTimelineInfo, setShowTimelineInfo] = useState(true)

  const toggleLayer = (layer: string) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }))
  }

  // Hide timeline info after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimelineInfo(false)
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-14 items-center justify-between bg-[#C3562E] px-4 text-white">
        <h1 className="text-xl font-bold">Pilbara Vegetation Explorer</h1>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-[#8B3E2F]"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </header>

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="h-full w-full">
          <MapComponent activeLayers={activeLayers} currentDate={currentDate} />
        </div>

        {/* Timeline Info Alert */}
        {showTimelineInfo && (
          <div className="absolute left-1/2 top-4 w-full max-w-md -translate-x-1/2 transform px-4">
            <Alert className="border-[#9CAF88] bg-white">
              <AlertTriangle className="h-4 w-4 text-[#C3562E]" />
              <AlertTitle className="text-[#8B3E2F]">Time Series Animation</AlertTitle>
              <AlertDescription className="text-sm text-[#333]">
                Use the timeline controls below to animate vegetation changes throughout the year. Watch how the Pilbara
                region changes with the seasons.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Side Panel */}
        <SidePanel open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-lg font-bold text-[#8B3E2F]">Layers</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[#333]">
                    <div className="h-3 w-3 rounded-full bg-[#7B9C62]"></div>
                    Dense Vegetation
                  </label>
                  <Switch
                    checked={activeLayers.denseVegetation}
                    onCheckedChange={() => toggleLayer("denseVegetation")}
                    className="data-[state=checked]:bg-[#7B9C62]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[#333]">
                    <div className="h-3 w-3 rounded-full bg-[#9CAF88]"></div>
                    Moderate Vegetation
                  </label>
                  <Switch
                    checked={activeLayers.moderateVegetation}
                    onCheckedChange={() => toggleLayer("moderateVegetation")}
                    className="data-[state=checked]:bg-[#9CAF88]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[#333]">
                    <div className="h-3 w-3 rounded-full bg-[#D2C096]"></div>
                    Sparse Vegetation
                  </label>
                  <Switch
                    checked={activeLayers.sparseVegetation}
                    onCheckedChange={() => toggleLayer("sparseVegetation")}
                    className="data-[state=checked]:bg-[#D2C096]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[#333]">Satellite Imagery</label>
                  <Switch
                    checked={activeLayers.satellite}
                    onCheckedChange={() => toggleLayer("satellite")}
                    className="data-[state=checked]:bg-[#C3562E]"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-[#8B3E2F]">Layer Opacity</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-[#555]">Vegetation Overlay</label>
                  <Slider defaultValue={[75]} max={100} step={1} className="[&_[role=slider]]:bg-[#9CAF88]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#555]">Satellite Imagery</label>
                  <Slider defaultValue={[100]} max={100} step={1} className="[&_[role=slider]]:bg-[#C3562E]" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-[#8B3E2F]">Seasonal Information</h2>
              <div className="space-y-3 text-sm text-[#333]">
                <p>
                  <strong>Summer (Dec-Feb):</strong> Hot and potentially wet season with higher vegetation growth.
                </p>
                <p>
                  <strong>Autumn (Mar-May):</strong> Cooling down with moderate vegetation health.
                </p>
                <p>
                  <strong>Winter (Jun-Aug):</strong> Dry season with reduced vegetation health.
                </p>
                <p>
                  <strong>Spring (Sep-Nov):</strong> Warming up with vegetation beginning to recover.
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-bold text-[#8B3E2F]">About NDVI</h2>
              <div className="space-y-2 text-sm text-[#333]">
                <p>NDVI (Normalized Difference Vegetation Index) measures vegetation health from satellite imagery.</p>
                <p>Higher values (0.6-0.9) indicate dense, healthy vegetation.</p>
                <p>Medium values (0.4-0.6) indicate moderate vegetation.</p>
                <p>Lower values (0.1-0.4) indicate sparse vegetation or bare soil.</p>
              </div>
            </div>
          </div>
        </SidePanel>
      </div>

      {/* Time Scrubber */}
      <TimeControls currentDate={currentDate} onDateChange={setCurrentDate} />
    </div>
  )
}
