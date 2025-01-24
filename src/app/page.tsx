"use client"

import { useEffect, useRef, useState } from "react"

// Define types for better code organization and type safety
type TimeUnit = {
  value: number
  total: number
  radius: number
  labels: string[]
}

type ClockDimensions = {
  width: number
  height: number
  centerX: number
  centerY: number
  maxRadius: number
}

export default function Clock() {
  // Reference to the SVG element for drawing
  const clockFaceRef = useRef<SVGSVGElement>(null)
  // Reference to store animation frame for cleanup
  const clockAnimationRef = useRef<number | undefined>(undefined)
  // State to store container dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  // Reference to the container div
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle resize events
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        const size = Math.min(width, height) - 40 // 40px padding
        setDimensions({ width: size, height: size })
      }
    }

    // Initial size calculation
    updateDimensions()

    // Add resize listener
    window.addEventListener("resize", updateDimensions)

    // Cleanup
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  useEffect(() => {
    /**
     * Main function to render the clock face
     * Updates every animation frame for smooth movement
     */
    const renderClockFace = () => {
      const currentTime = new Date()

      // Calculate precise time values including fractional parts for smooth animation
      const preciseSeconds = currentTime.getSeconds() + currentTime.getMilliseconds() / 1000
      const preciseMinutes = currentTime.getMinutes() + preciseSeconds / 60
      const preciseHours = currentTime.getHours() + preciseMinutes / 60

      // Calculate precise date values
      const currentDay = currentTime.getDate()
      const preciseDay = currentDay + preciseHours / 24
      const currentMonth = currentTime.getMonth()
      const daysInCurrentMonth = new Date(currentTime.getFullYear(), currentMonth + 1, 0).getDate()
      const preciseMonth = currentMonth + preciseDay / daysInCurrentMonth

      // Define time units with their respective properties
      const timeUnits: TimeUnit[] = [
        {
          value: preciseSeconds,
          total: 60,
          radius: 1,
          labels: Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")),
        },
        {
          value: preciseMinutes,
          total: 60,
          radius: 0.8,
          labels: Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")),
        },
        {
          value: preciseHours,
          total: 24,
          radius: 0.6,
          labels: Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")),
        },
        {
          value: preciseDay - 1,
          total: 31,
          radius: 0.4,
          labels: Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, "0")),
        },
        {
          value: preciseMonth,
          total: 12,
          radius: 0.2,
          labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
        },
      ]

      const svg = clockFaceRef.current
      if (!svg) return

      // Clear previous render
      svg.innerHTML = ""

      // Setup clock face dimensions
      const clockDimensions = {
        width: dimensions.width,
        height: dimensions.height,
        centerX: dimensions.width / 2,
        centerY: dimensions.height / 2,
        maxRadius: Math.min(dimensions.width, dimensions.height) / 2 - 10,
      }

      // Draw reference line (red line indicating current time)
      const referenceLine = createReferenceLine(clockDimensions)
      svg.appendChild(referenceLine)

      // Draw each time unit disc
      timeUnits.forEach((unit) => {
        const disc = createTimeDisc(unit, clockDimensions)
        svg.appendChild(disc)
      })

      // Request next animation frame
      clockAnimationRef.current = requestAnimationFrame(renderClockFace)
    }

    if (dimensions.width > 0 && dimensions.height > 0) {
      renderClockFace()
    }

    // Cleanup on unmount
    return () => {
      if (clockAnimationRef.current) {
        cancelAnimationFrame(clockAnimationRef.current)
      }
    }
  }, [dimensions])

  /**
   * Creates the reference line element
   */
  const createReferenceLine = (dimensions: ClockDimensions) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
    const { centerX, centerY, maxRadius } = dimensions

    line.setAttribute("x1", `${centerX + maxRadius}`)
    line.setAttribute("y1", `${centerY}`)
    line.setAttribute("x2", `${centerX}`)
    line.setAttribute("y2", `${centerY}`)
    line.setAttribute("stroke", "#ff0000")
    line.setAttribute("stroke-width", "2")

    return line
  }

  /**
   * Creates a rotating time disc with numbers and tick marks
   */
  const createTimeDisc = (timeUnit: TimeUnit, dimensions: ClockDimensions) => {
    const { centerX, centerY, maxRadius } = dimensions
    const currentRadius = maxRadius * timeUnit.radius
    const rotationAngle = (timeUnit.value / timeUnit.total) * Math.PI * 2

    const discGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")

    // Add disc outline
    const outline = document.createElementNS("http://www.w3.org/2000/svg", "circle")
    outline.setAttribute("cx", `${centerX}`)
    outline.setAttribute("cy", `${centerY}`)
    outline.setAttribute("r", `${currentRadius}`)
    outline.setAttribute("fill", "none")
    outline.setAttribute("stroke", "#ffffff")
    outline.setAttribute("stroke-width", "0.5")
    discGroup.appendChild(outline)

    // Calculate optimal font size based on disc size and number of labels
    const fontSize = Math.min(currentRadius / 10, (2 * Math.PI * (currentRadius - 15)) / timeUnit.labels.length / 1.5)

    // Add numbers and major tick marks
    timeUnit.labels.forEach((label, index) => {
      const angle = (index / timeUnit.labels.length) * Math.PI * 2 - rotationAngle
      addTickMarkAndLabel(discGroup, {
        angle,
        radius: currentRadius,
        label,
        fontSize,
        centerX,
        centerY,
      })
    })

    // Add minor tick marks for time units with 60 or fewer divisions
    if (timeUnit.labels.length <= 60) {
      addMinorTickMarks(discGroup, {
        total: timeUnit.labels.length,
        radius: currentRadius,
        rotationAngle,
        centerX,
        centerY,
      })
    }

    return discGroup
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 grid place-items-center h-screen w-full bg-black p-4 sm:p-6 md:p-8 overflow-hidden"
    >
      <svg
        ref={clockFaceRef}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="max-w-full max-h-full"
        aria-label="Smooth disc clock showing time and date"
      />
      <a
        href="https://werzq.cc"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-2 right-4 text-xs text-muted-foreground"
      >
        &copy; werzq.cc
      </a>
    </div>
  )
}

// Helper function to add tick mark and label to a disc
function addTickMarkAndLabel(
  group: SVGGElement,
  {
    angle,
    radius,
    label,
    fontSize,
    centerX,
    centerY,
  }: {
    angle: number
    radius: number
    label: string
    fontSize: number
    centerX: number
    centerY: number
  },
) {
  // Add major tick mark
  const tickLength = radius * 0.05
  const tick = document.createElementNS("http://www.w3.org/2000/svg", "line")
  tick.setAttribute("x1", `${centerX + radius * Math.cos(angle)}`)
  tick.setAttribute("y1", `${centerY + radius * Math.sin(angle)}`)
  tick.setAttribute("x2", `${centerX + (radius - tickLength) * Math.cos(angle)}`)
  tick.setAttribute("y2", `${centerY + (radius - tickLength) * Math.sin(angle)}`)
  tick.setAttribute("stroke", "#ffffff")
  tick.setAttribute("stroke-width", "0.5")
  group.appendChild(tick)

  // Add label
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
  const textRadius = radius - radius * 0.1
  text.setAttribute("x", `${centerX + textRadius * Math.cos(angle)}`)
  text.setAttribute("y", `${centerY + textRadius * Math.sin(angle)}`)
  text.setAttribute("fill", "#ffffff")
  text.setAttribute("font-family", "monospace")
  text.setAttribute("font-size", `${fontSize}px`)
  text.setAttribute("text-anchor", "middle")
  text.setAttribute("dominant-baseline", "middle")
  text.textContent = label
  group.appendChild(text)
}

// Helper function to add minor tick marks between major ticks
function addMinorTickMarks(
  group: SVGGElement,
  {
    total,
    radius,
    rotationAngle,
    centerX,
    centerY,
  }: {
    total: number
    radius: number
    rotationAngle: number
    centerX: number
    centerY: number
  },
) {
  const subDivisions = 4
  for (let i = 0; i < total * subDivisions; i++) {
    if (i % subDivisions !== 0) {
      const subAngle = (i / (total * subDivisions)) * Math.PI * 2 - rotationAngle
      const subTick = document.createElementNS("http://www.w3.org/2000/svg", "line")
      subTick.setAttribute("x1", `${centerX + radius * Math.cos(subAngle)}`)
      subTick.setAttribute("y1", `${centerY + radius * Math.sin(subAngle)}`)
      subTick.setAttribute("x2", `${centerX + (radius - radius * 0.03) * Math.cos(subAngle)}`)
      subTick.setAttribute("y2", `${centerY + (radius - radius * 0.03) * Math.sin(subAngle)}`)
      subTick.setAttribute("stroke", "#666")
      subTick.setAttribute("stroke-width", "1")
      group.appendChild(subTick)
    }
  }
}