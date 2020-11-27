import { useEffect, useMemo, useRef, useState } from 'react'
import { LazyBrush, Point } from 'lazy-brush'
import { Catenary } from 'catenary-curve'
import ResizeObserver from 'resize-observer-polyfill'

const LAZY_RADIUS = 60
const BRUSH_RADIUS = 12.5
const catenary = new Catenary()

function midPointBtw(p1, p2) {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2
  };
}

function context(canvas) {
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

  useResizeObserver(canvasContainer, (entries, observer) => handleCanvasResize(entries, observer))

  useEffect(() => {
    // // Listeners for mouse events
    // this.canvas.interface.addEventListener('mousedown', this.handlePointerDown.bind(this))
    // this.canvas.interface.addEventListener('mouseup', this.handlePointerUp.bind(this))
    // this.canvas.interface.addEventListener('mousemove', (e) => this.handlePointerMove(e.clientX, e.clientY))

    // // Listeners for touch events
    // this.canvas.interface.addEventListener('touchstart', (e) => this.handleTouchStart(e))
    // this.canvas.interface.addEventListener('touchend', (e) => this.handleTouchEnd(e))
    // this.canvas.interface.addEventListener('touchmove', (e) => this.handleTouchMove(e))

    // Listeners for click events on butons
    // this.button.clear.addEventListener('click', (e) => this.handleButtonClear(e))
    // this.button.lazy.addEventListener('click', (e) => this.handleButtonLazy(e))

    // Listeners for input events on range sliders
    // this.slider.brush.addEventListener('input', (e) => this.handleSliderBrush(e))
    // this.slider.lazy.addEventListener('input', (e) => this.handleSliderLazy(e))

    // Set initial value for range sliders
    // this.slider.brush.value = BRUSH_RADIUS
    // this.slider.lazy.value = LAZY_RADIUS

    // observeCanvas.observe(canvasContainer.current)

    // const observeSidebar = new ResizeObserver((entries, observer) => this.handleSidebarResize(entries, observer))
    // observeSidebar.observe(this.sidebar)

    loop()

    // window.setTimeout(() => {
    //   const initX = window.innerWidth / 2
    //   const initY = window.innerHeight / 2
    //   lazy.update({x: initX - (chainLength  / 4), y: initY}, { both: true })
    //   lazy.update({x: initX + (chainLength  / 4), y: initY}, { both: false })
    //   setMouseHasMoved(true)
    //   setValuesChanged(true)
    //   clearCanvas()
    // }, 100)
  }, [])

  const handleTouchStart = (e) => {
    const x = e.changedTouches[0].clientX
    const y = e.changedTouches[0].clientY
    lazy.update({x: x, y: y}, { both: true })
    handlePointerDown(e)

    setMouseHasMoved(true)
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    this.handlePointerMove(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
  }

  const handleTouchEnd = (e) => {
    handlePointerUp(e)
    const brush = lazy.getBrushCoordinates()
    lazy.update({x: brush.x, y: brush.y}, { both: true })
    setMouseHasMoved(true)
  }

  const handleSidebarResize = (entries, observer) => {
    for (const entry of entries) {
      const {left, top, width, height} = entry.contentRect
      loop({ once: true })
    }
  }

  const setCanvasSize = (canvas, width, height, dpi) => {
    canvas.width = width * dpi
    canvas.height = height * dpi
    canvas.style.width = width
    canvas.style.height = height
    canvas.getContext('2d').scale(dpi, dpi)
  }

  const handleCanvasResize = (entries, observer) => {
    console.log('handleCanvasResize', entries, observer)
    const dpi = window.devicePixelRatio

    for (const entry of entries) {
      const { width, height } = entry.contentRect
      console.log(width, height)
      setCanvasSize(canvas.interface.current, width, height, window.innerWidth > 1024 ? Math.min(dpi, 1.25): dpi)
      setCanvasSize(canvas.drawing.current, width, height, window.innerWidth > 1024 ? Math.min(dpi, 1): dpi)
      setCanvasSize(canvas.temp.current, width, height, window.innerWidth > 1024 ? Math.min(dpi, 1): dpi)
      // setCanvasSize(canvas.drawing.current, width, height, 1)
      // setCanvasSize(canvas.temp.current, width, height, 1)
      setCanvasSize(canvas.grid.current, width, height, window.innerWidth > 1024 ? Math.min(dpi, 2): dpi)

      drawGrid(context(canvas.grid.current))
      loop({ once: true })
    }
  }

//   handleSliderBrush (e) {
//     const val = parseInt(e.target.value)
//     this.valuesChanged = true
//     brushRadis = val
//   }

//   handleSliderLazy (e) {
//     this.valuesChanged = true
//     const val = parseInt(e.target.value)
//     chainLength = val
//     lazy.setRadius(val)
//   }

  const handlePointerDown = (e) => {
    e.preventDefault()
    setIsPressing(true)
  }

  const handlePointerUp = (e) => {
    e.preventDefault()
    setIsDrawing(false)
    setIsPressing(false)
    points.current = []

    const dpi = window.innerWidth > 1024 ? 1 : window.devicePixelRatio
    const width = canvas.temp.current.width / dpi
    const height = canvas.temp.current.height / dpi

    context(canvas.drawing.current).drawImage(canvas.temp.current, 0, 0, width, height)
    context(canvas.temp.current).clearRect(0, 0, width, height)
  }

  const handlePointerMove = (x, y) => {
    const hasChanged = lazy.update({ x: x, y: y})
    const isDisabled = !lazy.isEnabled()

    context(canvas.temp.current).lineJoin = 'round'
    context(canvas.temp.current).lineCap = 'round'
    context(canvas.temp.current).strokeStyle = "#f2530b"

    if ((isPressing && hasChanged && !isDrawing) || (isDisabled && isPressing)) {
      setIsDrawing(true)
      points.current.push(lazy.brush.toObject())
    }

    if (isDrawing && (lazy.brushHasMoved() || isDisabled)) {

      context(canvas.temp.current).clearRect(0, 0, canvas.temp.current.width, canvas.temp.current.height)
      context(canvas.temp.current).lineWidth = brushRadis * 2
      points.current.push(lazy.brush.toObject())
      const mPoints = points.current

      var p1 = mPoints[0]
      var p2 = mPoints[1]

      context(canvas.temp.current).moveTo(p2.x, p2.y)
      context(canvas.temp.current).beginPath()

      for (var i = 1, len = mPoints.length; i < len; i++) {
        // we pick the point between pi+1 & pi+2 as the
        // end point and p1 as our control point
        var midPoint = midPointBtw(p1, p2)
        context(canvas.temp.current).quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
        p1 = mPoints[i]
        p2 = mPoints[i+1];
      }
      // Draw last line as a straight line while
      // we wait for the next point to be able to calculate
      // the bezier control point
      context(canvas.temp.current).lineTo(p1.x, p1.y)
      context(canvas.temp.current).stroke()
    }

    setMouseHasMoved(true)
  }

  const clearCanvas = () => {
    setValuesChanged(true)
    // context(canvas.drawing.current).clearRect(0, 0, canvas.drawing.current.width, canvas.drawing.current.height)
    context(canvas.temp.current).clearRect(0, 0, canvas.temp.current.width, canvas.temp.current.height)
  }

  const loop = ({ once = false } = {}) => {
    if (mouseHasMoved || valuesChanged) {
      const pointer = lazy.getPointerCoordinates()
      const brush = lazy.getBrushCoordinates()

      drawInterface(context(canvas.interface.current), pointer, brush)
      setMouseHasMoved(false)
      setValuesChanged(false)
    }

    if (!once) {
      window.requestAnimationFrame(() => {
        loop()
      })
    }
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
      catenary.drawToCanvas(context(canvas.interface.current), brush, pointer, chainLength)
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
        <canvas className="absolute left-0 top-0 w-full h-full" ref={canvas.temp}></canvas>
        <canvas className="absolute left-0 top-0 w-full h-full" ref={canvas.drawing}></canvas>
        <canvas className="absolute left-0 top-0 w-full h-full" ref={canvas.grid}></canvas>
        <canvas className="absolute left-0 top-0 w-full h-full" ref={canvas.interface}
            onMouseDown={ handlePointerDown }
            onMouseUp={ handlePointerUp }
            onMouseMove={ (e) => handlePointerMove(e.clientX, e.clientY) }
            onTouchStart={ (e) => handleTouchStart(e) }
            onTouchEnd={ (e) => handleTouchEnd(e) }
            onTouchMove={ (e) => handleTouchMove(e) }
        ></canvas>
    </div>
  )
}
