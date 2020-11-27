import { useEffect, useRef } from "react";

const { default: Scene } = require("./Scene");

function App() {
  const container = useRef()

  useEffect(() => {
    // First we get the viewport height and we multiple it by 1% to get a value for a vh unit
    let vh = window.innerHeight * 0.01;
    // Then we set the value in the --vh custom property to the root of the document
    container.current.style.setProperty('--vh', `${vh}px`);
  }, [])

  return (
    <div className="w-100" ref={container} style={{ height: "calc(var(--vh, 1vh) * 100)" }}>
      <Scene />
    </div>
  );
}

export default App;
