"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix the default icon issue in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

// Enhanced vegetation data with time series information
const generateTimeSeriesData = () => {
  // Base vegetation points
  const basePoints = [
    { lat: -22.2876, lng: 117.8734, type: "dense", name: "Spinifex Grassland", baseNdvi: 0.72, confidence: 0.89 },
    { lat: -22.3176, lng: 117.9034, type: "dense", name: "Eucalyptus Woodland", baseNdvi: 0.68, confidence: 0.92 },
    { lat: -22.2976, lng: 117.8534, type: "moderate", name: "Acacia Shrubland", baseNdvi: 0.54, confidence: 0.78 },
    { lat: -22.3276, lng: 117.8634, type: "moderate", name: "Mixed Shrubland", baseNdvi: 0.51, confidence: 0.81 },
    { lat: -22.2776, lng: 117.8834, type: "sparse", name: "Sparse Grassland", baseNdvi: 0.32, confidence: 0.85 },
    {
      lat: -22.3076,
      lng: 117.9134,
      type: "sparse",
      name: "Barren with Scattered Vegetation",
      baseNdvi: 0.28,
      confidence: 0.76,
    },
    { lat: -22.2676, lng: 117.8934, type: "dense", name: "Riparian Vegetation", baseNdvi: 0.75, confidence: 0.94 },
    { lat: -22.3376, lng: 117.8434, type: "moderate", name: "Hummock Grassland", baseNdvi: 0.58, confidence: 0.83 },
    {
      lat: -22.2576,
      lng: 117.9234,
      type: "sparse",
      name: "Rocky Outcrop Vegetation",
      baseNdvi: 0.35,
      confidence: 0.79,
    },
    { lat: -22.3476, lng: 117.8334, type: "dense", name: "Mangrove", baseNdvi: 0.71, confidence: 0.88 },
  ]

  // Generate time series data for each point
  const startDate = new Date(2023, 0, 1) // Jan 1, 2023
  const endDate = new Date(2023, 11, 31) // Dec 31, 2023
  const timeSeriesData = []

  // Create monthly data points
  for (let month = 0; month < 12; month++) {
    const currentDate = new Date(2023, month, 15) // 15th of each month

    basePoints.forEach((point) => {
      // Create seasonal variations in NDVI
      // Australian seasons are opposite to Northern Hemisphere
      // Summer: Dec-Feb, Autumn: Mar-May, Winter: Jun-Aug, Spring: Sep-Nov
      let seasonalFactor = 0

      if (month >= 0 && month <= 2) {
        // Summer (hot and potentially wet)
        seasonalFactor = 0.15 // Higher NDVI in wet summer
      } else if (month >= 3 && month <= 5) {
        // Autumn (cooling down)
        seasonalFactor = 0.05 // Slightly higher NDVI
      } else if (month >= 6 && month <= 8) {
        // Winter (dry season)
        seasonalFactor = -0.15 // Lower NDVI in dry winter
      } else {
        // Spring (warming up)
        seasonalFactor = -0.05 // Slightly lower NDVI
      }

      // Add some randomness to make it more realistic
      const randomFactor = Math.random() * 0.1 - 0.05

      // Calculate new NDVI with seasonal and random factors
      let newNdvi = point.baseNdvi + seasonalFactor + randomFactor

      // Ensure NDVI stays in realistic range (0-1)
      newNdvi = Math.max(0.1, Math.min(0.9, newNdvi))

      // Determine vegetation type based on new NDVI
      let type = "sparse"
      if (newNdvi > 0.6) {
        type = "dense"
      } else if (newNdvi > 0.4) {
        type = "moderate"
      }

      timeSeriesData.push({
        ...point,
        date: new Date(currentDate),
        ndvi: Number.parseFloat(newNdvi.toFixed(2)),
        type,
      })
    })
  }

  return timeSeriesData
}

const vegetationTimeSeriesData = generateTimeSeriesData()

interface MapComponentProps {
  activeLayers: {
    denseVegetation: boolean
    moderateVegetation: boolean
    sparseVegetation: boolean
    satellite: boolean
  }
  currentDate: Date
}

export default function MapComponent({ activeLayers, currentDate }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<{ [key: string]: L.LayerGroup }>({
    dense: L.layerGroup(),
    moderate: L.layerGroup(),
    sparse: L.layerGroup(),
  })
  const satelliteLayerRef = useRef<L.TileLayer | null>(null)
  const osmLayerRef = useRef<L.TileLayer | null>(null)
  const [currentMarkers, setCurrentMarkers] = useState<any[]>([])
  const [mapInitialized, setMapInitialized] = useState(false)

  // Filter vegetation data for the current date
  const getVegetationDataForDate = (date: Date) => {
    // Find the closest date in our dataset
    const targetMonth = date.getMonth()
    return vegetationTimeSeriesData.filter((point) => point.date.getMonth() === targetMonth)
  }

  // Create custom icons for different vegetation types
  const createVegetationIcon = (type: string, ndvi: number) => {
    // Adjust color intensity based on NDVI
    let color = "#D2C096" // Default sparse color
    let size = 10 // Base size

    if (type === "dense") {
      // Adjust green intensity based on NDVI
      const intensity = Math.floor(((ndvi - 0.6) / 0.3) * 30) + 70
      color = `#7B9C${intensity.toString(16)}`
      size = 14
    } else if (type === "moderate") {
      const intensity = Math.floor(((ndvi - 0.4) / 0.2) * 30) + 70
      color = `#9CAF${intensity.toString(16)}`
      size = 12
    }

    return L.divIcon({
      className: "custom-div-icon",
      html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }

  // Update markers based on current date
  const updateMarkers = () => {
    if (!mapRef.current) return

    // Clear existing markers
    Object.values(markersRef.current).forEach((layer) => {
      layer.clearLayers()
    })

    // Get data for current date
    const currentData = getVegetationDataForDate(currentDate)
    setCurrentMarkers(currentData)

    // Add new markers
    currentData.forEach((point) => {
      if (!activeLayers[`${point.type}Vegetation` as keyof typeof activeLayers]) return

      const icon = createVegetationIcon(point.type, point.ndvi)

      const popupContent = `
        <div class="p-2">
          <h3 class="font-bold text-[#8B3E2F]">${point.name}</h3>
          <div class="mt-1 text-sm">
            <div><span class="font-medium">NDVI:</span> ${point.ndvi}</div>
            <div><span class="font-medium">Confidence:</span> ${point.confidence * 100}%</div>
            <div><span class="font-medium">Date:</span> ${point.date.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</div>
          </div>
        </div>
      `

      const marker = L.marker([point.lat, point.lng], { icon })
        .bindPopup(popupContent)
        .addTo(markersRef.current[point.type])

      // Add a slight animation to highlight changes
      const markerElement = marker.getElement()
      if (markerElement) {
        markerElement.style.transition = "transform 0.5s ease-in-out"
        markerElement.style.transform = "scale(1.2)"
        setTimeout(() => {
          markerElement.style.transform = "scale(1)"
        }, 500)
      }
    })

    // Add layer groups to map
    Object.entries(markersRef.current).forEach(([type, layer]) => {
      if (activeLayers[`${type}Vegetation` as keyof typeof activeLayers]) {
        layer.addTo(mapRef.current!)
      }
    })
  }

  useEffect(() => {
    if (!mapRef.current) {
      // Initialize map
      mapRef.current = L.map("map", {
        center: [-22.2876, 117.8734], // Pilbara region coordinates
        zoom: 12,
      })

      // Create and store the OSM layer
      osmLayerRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current)

      // Create and store the satellite layer (but don't add it yet)
      satelliteLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        },
      )

      // Add legend
      const legend = L.control({ position: "bottomright" })
      legend.onAdd = () => {
        const div = L.DomUtil.create("div", "info legend")
        div.innerHTML = `
          <div class="bg-white p-2 rounded shadow-md text-sm">
            <div class="font-bold mb-1 text-[#8B3E2F]">Vegetation Types</div>
            <div class="flex items-center gap-1 mb-1">
              <div class="w-3 h-3 rounded-full bg-[#7B9C62]"></div>
              <span>Dense</span>
            </div>
            <div class="flex items-center gap-1 mb-1">
              <div class="w-3 h-3 rounded-full bg-[#9CAF88]"></div>
              <span>Moderate</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded-full bg-[#D2C096]"></div>
              <span>Sparse</span>
            </div>
          </div>
        `
        return div
      }
      legend.addTo(mapRef.current)

      // Add info button
      const infoButton = L.control({ position: "topright" })
      infoButton.onAdd = () => {
        const div = L.DomUtil.create("div", "info-button")
        div.innerHTML = `
          <button class="bg-white p-2 rounded-full shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B3E2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
        `
        div.onclick = () => {
          alert(
            "Pilbara Vegetation Explorer\nExplore vegetation classification data for the Australian Pilbara region.",
          )
        }
        return div
      }
      infoButton.addTo(mapRef.current)

      // Add NDVI timeline indicator
      const ndviIndicator = L.control({ position: "bottomleft" })
      ndviIndicator.onAdd = () => {
        const div = L.DomUtil.create("div", "ndvi-indicator")
        div.innerHTML = `
          <div class="bg-white p-2 rounded shadow-md text-sm">
            <div class="font-bold mb-1 text-[#8B3E2F]">NDVI Timeline</div>
            <div class="flex items-center gap-1">
              <div class="w-full h-2 bg-gradient-to-r from-[#D2C096] via-[#9CAF88] to-[#7B9C62] rounded"></div>
            </div>
            <div class="flex justify-between text-xs mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        `
        return div
      }
      ndviIndicator.addTo(mapRef.current)

      // Set base layer based on satellite toggle
      if (activeLayers.satellite && satelliteLayerRef.current) {
        satelliteLayerRef.current.addTo(mapRef.current)
        if (osmLayerRef.current) {
          mapRef.current.removeLayer(osmLayerRef.current)
        }
      }

      setMapInitialized(true)
    }

    // Update markers based on current date
    updateMarkers()

    // Handle satellite/OSM layer toggle
    if (mapRef.current) {
      if (activeLayers.satellite) {
        if (satelliteLayerRef.current && !mapRef.current.hasLayer(satelliteLayerRef.current)) {
          satelliteLayerRef.current.addTo(mapRef.current)
        }
        if (osmLayerRef.current && mapRef.current.hasLayer(osmLayerRef.current)) {
          mapRef.current.removeLayer(osmLayerRef.current)
        }
      } else {
        if (osmLayerRef.current && !mapRef.current.hasLayer(osmLayerRef.current)) {
          osmLayerRef.current.addTo(mapRef.current)
        }
        if (satelliteLayerRef.current && mapRef.current.hasLayer(satelliteLayerRef.current)) {
          mapRef.current.removeLayer(satelliteLayerRef.current)
        }
      }
    }

    // Cleanup function
    return () => {
      // No need to destroy the map on every render
    }
  }, [activeLayers, currentDate])

  return (
    <div className="relative h-full w-full">
      <div id="map" className="h-full w-full" />

      {/* Overlay for animation status */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-md">
        <span className="font-medium text-[#8B3E2F]">
          {currentDate.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
        </span>
      </div>

      {/* NDVI Stats Overlay */}
      {mapInitialized && (
        <div className="absolute top-4 left-4 bg-white p-3 rounded-md shadow-lg max-w-xs z-[1000] border-l-4 border-[#7B9C62]">
          <h3 className="font-bold text-[#8B3E2F] mb-2">Vegetation Health</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center">
                <div className="w-2 h-2 rounded-full bg-[#7B9C62] mr-1.5"></div>
                Dense:
              </span>
              <span className="text-sm font-medium">
                {currentMarkers.filter((m) => m.type === "dense").length} locations
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center">
                <div className="w-2 h-2 rounded-full bg-[#9CAF88] mr-1.5"></div>
                Moderate:
              </span>
              <span className="text-sm font-medium">
                {currentMarkers.filter((m) => m.type === "moderate").length} locations
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center">
                <div className="w-2 h-2 rounded-full bg-[#D2C096] mr-1.5"></div>
                Sparse:
              </span>
              <span className="text-sm font-medium">
                {currentMarkers.filter((m) => m.type === "sparse").length} locations
              </span>
            </div>
            <div className="h-px bg-gray-200 my-1"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Avg NDVI:</span>
              <span className="text-sm font-medium">
                {currentMarkers.length > 0
                  ? (currentMarkers.reduce((sum, m) => sum + m.ndvi, 0) / currentMarkers.length).toFixed(2)
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
