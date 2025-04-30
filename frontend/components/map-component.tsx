"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { fetchTimeSeriesForMonth } from "@/helpers/fetchData"

// Fix the default icon issue in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

interface MapComponentProps {
  activeLayers: {
    denseVegetation: boolean
    moderateVegetation: boolean
    sparseVegetation: boolean
    satellite: boolean
  }
  currentDate: Date
}

/**
 * MapComponent displays the Pilbara region map and vegetation markers
 * fetched directly from Supabase for the given month/year.
 */
export default function MapComponent({ activeLayers, currentDate }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<{ [key: string]: L.LayerGroup }>({
    dense: L.layerGroup(),
    moderate: L.layerGroup(),
    sparse: L.layerGroup(),
  })
  const satelliteLayerRef = useRef<L.TileLayer | null>(null)
  const osmLayerRef = useRef<L.TileLayer | null>(null)

  const [mapInitialized, setMapInitialized] = useState(false)
  const [currentMarkers, setCurrentMarkers] = useState<any[]>([])

  /**
   * 1) Fetch data from Supabase each time currentDate changes.
   */
  useEffect(() => {
    async function loadData() {
      const fetchedData = await fetchTimeSeriesForMonth(currentDate.getMonth(), currentDate.getFullYear())
      // Transform Supabase data into a shape consistent with your existing code
      // e.g. flatten "vegetation_points" props up into the main object
      const flattened = fetchedData.map((entry: any) => {
        return {
          // Timeseries fields
          date: new Date(entry.date),
          ndvi: entry.ndvi,
          type: entry.type,
          // From vegetation_points relationship
          lat: entry.vegetation_points.lat,
          lng: entry.vegetation_points.lng,
          name: entry.vegetation_points.name,
          confidence: entry.vegetation_points.confidence,
        }
      })
      setCurrentMarkers(flattened)
    }
    loadData()
  }, [currentDate])

  /**
   * 2) A helper to create custom “dot” icons for different vegetation types/NDVI.
   */
  function createVegetationIcon(type: string, ndvi: number) {
    // Default color (sparse)
    let color = "#D2C096"
    let size = 10

    if (type === "dense") {
      // Adjust green intensity based on NDVI
      // (just reusing your snippet logic)
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

  /**
   * 3) A function to clear old markers and add new ones based on currentMarkers + layer toggles.
   */
  function updateMarkers() {
    if (!mapRef.current) return

    // Clear existing
    Object.values(markersRef.current).forEach((layer) => {
      layer.clearLayers()
    })

    // Add new markers
    currentMarkers.forEach((point) => {
      // Respect activeLayers (dense, moderate, sparse)
      if (!activeLayers[`${point.type}Vegetation` as keyof typeof activeLayers]) return

      const icon = createVegetationIcon(point.type, point.ndvi)

      const popupContent = `
        <div class="p-2">
          <h3 class="font-bold text-[#8B3E2F]">${point.name}</h3>
          <div class="mt-1 text-sm">
            <div><span class="font-medium">NDVI:</span> ${point.ndvi}</div>
            <div><span class="font-medium">Confidence:</span> ${(point.confidence * 100).toFixed(2)}%</div>
            <div><span class="font-medium">Date:</span> ${point.date.toLocaleDateString("en-AU", {
              month: "long",
              year: "numeric",
            })}</div>
          </div>
        </div>
      `

      const marker = L.marker([point.lat, point.lng], { icon })
        .bindPopup(popupContent)
        .addTo(markersRef.current[point.type])

      // Simple animation
      const markerElement = marker.getElement()
      if (markerElement) {
        markerElement.style.transition = "transform 0.5s ease-in-out"
        markerElement.style.transform = "scale(1.2)"
        setTimeout(() => {
          markerElement.style.transform = "scale(1)"
        }, 500)
      }
    })

    // Add layer groups if they're toggled on
    Object.entries(markersRef.current).forEach(([type, layerGroup]) => {
      if (activeLayers[`${type}Vegetation` as keyof typeof activeLayers]) {
        layerGroup.addTo(mapRef.current!)
      }
    })
  }

  /**
   * 4) Initialize the map once and handle base layer changes (OSM vs Satellite).
   */
  useEffect(() => {
    if (!mapRef.current) {
      // Initial map creation
      mapRef.current = L.map("map", {
        center: [-22.2876, 117.8734], // Pilbara region
        zoom: 12,
      })

      // OSM
      osmLayerRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      })
      osmLayerRef.current.addTo(mapRef.current)

      // Satellite
      satelliteLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, " +
            "Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
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

      // Info button
      const infoButton = L.control({ position: "topright" })
      infoButton.onAdd = () => {
        const div = L.DomUtil.create("div", "info-button")
        div.innerHTML = `
          <button class="bg-white p-2 rounded-full shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24" fill="none" stroke="#8B3E2F"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
        `
        div.onclick = () => {
          alert("Pilbara Vegetation Explorer\nExplore vegetation classification data for the Australian Pilbara region.")
        }
        return div
      }
      infoButton.addTo(mapRef.current)

      // NDVI Timeline indicator
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

      setMapInitialized(true)
    }

    // Switch base layers (Satellite vs OSM) any time activeLayers.satellite changes
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
  }, [activeLayers]) // only re-run when activeLayers changes (especially satellite toggles)

  /**
   * 5) Update markers every time `currentMarkers` or the relevant `activeLayers` toggles change
   */
  useEffect(() => {
    updateMarkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMarkers, activeLayers])

  /**
   * RENDER
   */
  return (
    <div className="relative h-full w-full">
      {/* The Leaflet map container */}
      <div id="map" className="h-full w-full" />

      {/* A simple overlay to show current month/year */}
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
                  ? (
                      currentMarkers.reduce((sum, m) => sum + Number(m.ndvi), 0) /
                      currentMarkers.length
                    ).toFixed(2)
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
