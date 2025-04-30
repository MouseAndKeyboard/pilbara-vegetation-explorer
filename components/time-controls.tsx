"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Play, Pause, SkipBack, SkipForward } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TimeControlsProps {
  currentDate: Date
  onDateChange: (date: Date) => void
}

export function TimeControls({ currentDate, onDateChange }: TimeControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeValue, setTimeValue] = useState(0) // 0-100 representing the timeline
  const [playbackSpeed, setPlaybackSpeed] = useState(1) // 1x speed by default
  const animationRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)

  // Define date range (full year 2023)
  const startDate = new Date(2023, 0, 1) // Jan 1, 2023
  const endDate = new Date(2023, 11, 31) // Dec 31, 2023

  // Calculate the number of months in the range
  const totalMonths = 12

  // Convert current date to slider value
  useEffect(() => {
    const month = currentDate.getMonth()
    const percentage = (month / (totalMonths - 1)) * 100
    setTimeValue(percentage)
  }, [currentDate])

  // Handle animation frame
  const animate = (timestamp: number) => {
    if (!lastUpdateTimeRef.current) {
      lastUpdateTimeRef.current = timestamp
    }

    // Calculate elapsed time since last update
    const elapsed = timestamp - lastUpdateTimeRef.current

    // Update every 100ms * (1/playbackSpeed) - faster speed = more frequent updates
    if (elapsed > 1000 / playbackSpeed) {
      // Move to next month
      const nextMonth = (currentDate.getMonth() + 1) % 12
      const nextYear = nextMonth === 0 ? currentDate.getFullYear() + 1 : currentDate.getFullYear()
      const nextDate = new Date(nextYear, nextMonth, 15)

      // Check if we've reached the end of our range
      if (nextDate > endDate) {
        // Loop back to start
        onDateChange(new Date(startDate))
      } else {
        onDateChange(nextDate)
      }

      lastUpdateTimeRef.current = timestamp
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  // Start/stop animation
  useEffect(() => {
    if (isPlaying) {
      lastUpdateTimeRef.current = 0
      animationRef.current = requestAnimationFrame(animate)
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, currentDate, playbackSpeed])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    const prevMonth = (newDate.getMonth() - 1 + 12) % 12 // Add 12 to handle negative values
    const prevYear = prevMonth === 11 && newDate.getMonth() === 0 ? newDate.getFullYear() - 1 : newDate.getFullYear()

    const newDateObj = new Date(prevYear, prevMonth, 15)
    if (newDateObj >= startDate) {
      onDateChange(newDateObj)
    }
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    const nextMonth = (newDate.getMonth() + 1) % 12
    const nextYear = nextMonth === 0 ? newDate.getFullYear() + 1 : newDate.getFullYear()

    const newDateObj = new Date(nextYear, nextMonth, 15)
    if (newDateObj <= endDate) {
      onDateChange(newDateObj)
    }
  }

  const handleSliderChange = (value: number[]) => {
    const percentage = value[0]
    setTimeValue(percentage)

    // Convert percentage to month index (0-11)
    const monthIndex = Math.round((percentage / 100) * (totalMonths - 1))
    const newDate = new Date(2023, monthIndex, 15)
    onDateChange(newDate)
  }

  const handleSkipToStart = () => {
    onDateChange(new Date(startDate))
  }

  const handleSkipToEnd = () => {
    onDateChange(new Date(2023, 11, 15)) // December 15, 2023
  }

  const handleSpeedChange = () => {
    // Cycle through speeds: 1x -> 2x -> 4x -> 1x
    const newSpeed = playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1
    setPlaybackSpeed(newSpeed)
  }

  return (
    <div className="flex h-16 items-center justify-between border-t bg-white px-4 shadow-md">
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSkipToStart}
                className="h-8 w-8 border-[#C3562E] text-[#C3562E] hover:bg-[#C3562E]/10 hover:text-[#C3562E]"
              >
                <SkipBack size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Skip to start</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                className="h-8 w-8 border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88]/10 hover:text-[#9CAF88]"
              >
                <ChevronLeft size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Previous month</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePlayPause}
                className="h-8 w-8 border-[#C3562E] text-[#C3562E] hover:bg-[#C3562E]/10 hover:text-[#C3562E]"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPlaying ? "Pause" : "Play"} animation</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="h-8 w-8 border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88]/10 hover:text-[#9CAF88]"
              >
                <ChevronRight size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Next month</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSkipToEnd}
                className="h-8 w-8 border-[#C3562E] text-[#C3562E] hover:bg-[#C3562E]/10 hover:text-[#C3562E]"
              >
                <SkipForward size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Skip to end</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={handleSpeedChange}
                className="h-8 border-[#8B3E2F] text-[#8B3E2F] hover:bg-[#8B3E2F]/10 hover:text-[#8B3E2F] text-xs font-bold"
              >
                {playbackSpeed}x
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Playback speed</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex w-full max-w-md items-center gap-4 px-4">
        <Slider
          value={[timeValue]}
          min={0}
          max={100}
          step={1}
          onValueChange={handleSliderChange}
          className="[&_[role=slider]]:bg-[#C3562E] [&_[role=slider]]:border-[#C3562E]"
        />
      </div>

      <div className="min-w-32 text-right font-medium text-[#8B3E2F]">
        {currentDate.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
      </div>
    </div>
  )
}
