import { useEffect, useMemo, useRef, useState } from 'react'
import { LazyBrush, Point } from 'lazy-brush'
import { Catenary } from 'catenary-curve'
import ResizeObserver from 'resize-observer-polyfill'
import * as d3 from 'd3-path'

const LAZY_RADIUS = 60
const BRUSH_RADIUS = 12.5
const catenary = new Catenary()

function midPointBtw(p1, p2) {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2
  };
}

function getContext(canvas) {
    return canvas.getContext('2d')
}

function useResizeObserver(elRef, handle) {
  const observer = useRef(new ResizeObserver(handle));

  useEffect(() => {
    if (elRef.current) {
      observer.current.observe(elRef.current);
    }

    return () => {
      observer.current.unobserve(elRef.current);
    };
  }, [elRef, observer]);
}

function useAnimationFrame(render) {
  const request = useRef()

  const animate = () => {
    render()
    request.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    request.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(request.current)
  }, [])
}

export default function Scene() {
    const canvas = {}
    canvas.interface = useRef()
    canvas.drawing = useRef()
    canvas.temp = useRef()
    canvas.grid = useRef()

    // this.sidebar = document.getElementById(sidebar)
    const canvasContainer = useRef()

    // this.slider = {}
    // Object.keys(slider).forEach(s => {
    //   this.slider[s] = document.getElementById(slider[s])
    // })

    const lazy = useMemo(() => new LazyBrush({
      radius: LAZY_RADIUS,
      enabled: true,
      initialPoint: {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      }
    }), [])

    const points = useRef([])

    const [mouseHasMoved, setMouseHasMoved] = useState(true)
    const [valuesChanged, setValuesChanged] = useState(true)
    const [isDrawing, setIsDrawing] = useState(false)
    const [isPressing, setIsPressing] = useState(false)
    const brushRadis = BRUSH_RADIUS
    const chainLength = LAZY_RADIUS

  useResizeObserver(canvasContainer, (entries, observer) => {
    const dpi = window.devicePixelRatio

    const setCanvasSize = (canvas, width, height, dpi) => {
      canvas.width = width * dpi
      canvas.height = height * dpi
      canvas.style.width = width
      canvas.style.height = height
      canvas.getContext('2d').scale(dpi, dpi)
    }

    for (const entry of entries) {
      const { width, height } = entry.contentRect
      console.log(width, height)
      setCanvasSize(canvas.interface.current, width, height, window.innerWidth > 1024 ? Math.min(dpi, 1.25): dpi)
      setCanvasSize(canvas.drawing.current, width, height, window.innerWidth > 1024 ? Math.min(dpi, 1): dpi)
      setCanvasSize(canvas.temp.current, width, height, window.innerWidth > 1024 ? Math.min(dpi, 1): dpi)
      setCanvasSize(canvas.grid.current, width, height, window.innerWidth > 1024 ? Math.min(dpi, 2): dpi)

      drawGrid(getContext(canvas.grid.current))
    }
  })

  useAnimationFrame(() => {
    if (mouseHasMoved || valuesChanged) {
      const pointer = lazy.getPointerCoordinates()
      const brush = lazy.getBrushCoordinates()

      drawInterface(getContext(canvas.interface.current), pointer, brush)
      setMouseHasMoved(false)
      setValuesChanged(false)
    }
  })

  const handleTouchStart = (e) => {
    const x = e.changedTouches[0].clientX
    const y = e.changedTouches[0].clientY
    lazy.update({x: x, y: y}, { both: true })
    handlePointerDown(e)

    setMouseHasMoved(true)
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    handlePointerMove(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
  }

  const handleTouchEnd = (e) => {
    handlePointerUp(e)
    const brush = lazy.getBrushCoordinates()
    lazy.update({x: brush.x, y: brush.y}, { both: true })
    setMouseHasMoved(true)
  }

  const handlePointerDown = (e) => {
    e.preventDefault()
    setIsPressing(true)
  }

  const handlePointerUp = (e) => {
    e.preventDefault()
    setIsDrawing(false)
    setIsPressing(false)

    if (points.current.length > 2) {
      const path = d3.path()
      drawPoints(path)
      console.log(path.toString())
    }

    points.current = []

    const dpi = window.innerWidth > 1024 ? 1 : window.devicePixelRatio
    const width = canvas.temp.current.width / dpi
    const height = canvas.temp.current.height / dpi

    getContext(canvas.drawing.current).drawImage(canvas.temp.current, 0, 0, width, height)
    getContext(canvas.temp.current).clearRect(0, 0, width, height)
  }

  const drawPoints = context => {
    context.lineWidth = brushRadis * 2

    const mPoints = points.current
    var p1 = mPoints[0]
    var p2 = mPoints[1]

    context.moveTo(p2.x, p2.y)
    // Fix d3-path
    context.beginPath && context.beginPath()

    for (var i = 1, len = mPoints.length; i < len; i++) {
      // we pick the point between pi+1 & pi+2 as the
      // end point and p1 as our control point
      var midPoint = midPointBtw(p1, p2)
      context.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      p1 = mPoints[i]
      p2 = mPoints[i+1];
    }
    // Draw last line as a straight line while
    // we wait for the next point to be able to calculate
    // the bezier control point
    context.lineTo(p1.x, p1.y)
    // Fix d3-path
    context.stroke && context.stroke()
  }

  const handlePointerMove = (x, y) => {
    const context = getContext(canvas.temp.current)
    const hasChanged = lazy.update({ x: x, y: y})
    const isDisabled = !lazy.isEnabled()

    context.lineJoin = 'round'
    context.lineCap = 'round'
    context.strokeStyle = "#f2530b"

    if ((isPressing && hasChanged && !isDrawing) || (isDisabled && isPressing)) {
      setIsDrawing(true)
      points.current.push(lazy.brush.toObject())
    }

    if (isDrawing && (lazy.brushHasMoved() || isDisabled)) {
      context.clearRect(0, 0, canvas.temp.current.width, canvas.temp.current.height)
      points.current.push(lazy.brush.toObject())
      drawPoints(context)
    }

    setMouseHasMoved(true)
  }

  const clearCanvas = () => {
    points.current = []
    setIsDrawing(false)
    // setIsPressing(false)
    setValuesChanged(true)
    getContext(canvas.drawing.current).clearRect(0, 0, canvas.drawing.current.width, canvas.drawing.current.height)
    getContext(canvas.temp.current).clearRect(0, 0, canvas.temp.current.width, canvas.temp.current.height)
  }

  const drawGrid = (ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    ctx.beginPath()
    ctx.setLineDash([5,1])
    ctx.setLineDash([])
    // ctx.strokeStyle = styleVariables.colorInterfaceGrid
    ctx.strokeStyle = 'rgba(150,150,150,0.17)'
    ctx.lineWidth = 0.5

    const gridSize = 25

    let countX = 0
    while (countX < ctx.canvas.width) {
      countX += gridSize
      ctx.moveTo(countX, 0)
      ctx.lineTo(countX, ctx.canvas.height)
    }
    ctx.stroke()

    let countY = 0
    while (countY < ctx.canvas.height) {
      countY += gridSize
      ctx.moveTo(0, countY)
      ctx.lineTo(ctx.canvas.width, countY)
    }
    ctx.stroke()
  }

  const drawInterface = (ctx, pointer, brush) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Draw brush point
    ctx.beginPath()
    ctx.fillStyle = "#f2530b"
    ctx.arc(brush.x, brush.y, brushRadis, 0, Math.PI * 2, true)
    ctx.fill()

    // Draw mouse point
    ctx.beginPath()
    ctx.fillStyle = "#34312f"
    ctx.arc(pointer.x, pointer.y, 4, 0, Math.PI * 2, true)
    ctx.fill()

    //Draw catharina
    if (lazy.isEnabled()) {
      ctx.beginPath()
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.setLineDash([2, 4])
      ctx.strokeStyle = "#34312f"
      catenary.drawToCanvas(getContext(canvas.interface.current), brush, pointer, chainLength)
      ctx.stroke()
    }

    // Draw mouse point
    ctx.beginPath()
    ctx.fillStyle = '#222222'
    ctx.arc(brush.x, brush.y, 2, 0, Math.PI * 2, true)
    ctx.fill()
  }

  return (
    <div className="w-full h-full relative" ref={canvasContainer}>
        <canvas className="absolute left-0 top-0 w-full h-full" ref={canvas.temp} />
        <canvas className="absolute left-0 top-0 w-full h-full" ref={canvas.drawing} />
        <canvas className="absolute left-0 top-0 w-full h-full" ref={canvas.grid} />
        <canvas className="absolute left-0 top-0 w-full h-full" ref={canvas.interface}
            onMouseDown={ handlePointerDown }
            onMouseUp={ handlePointerUp }
            onMouseMove={ (e) => handlePointerMove(e.clientX, e.clientY) }
            onTouchStart={ (e) => handleTouchStart(e) }
            onTouchEnd={ (e) => handleTouchEnd(e) }
            onTouchMove={ (e) => handleTouchMove(e) }
        />
        <div className="absolute left-0 bottom-0 w-full px-4 py-2 flex">
          <button className="block border-2 border-gray-800 px-4 py-2" onClick={clearCanvas}>Clear</button>
        </div>
    </div>
  )
}
