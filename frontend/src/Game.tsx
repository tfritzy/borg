import { useEffect, useRef } from "react";
import { GameEngine } from "./gameEngine";
import { WorldRenderer } from "./rendering/WorldRenderer";

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new GameEngine();
    const renderer = new WorldRenderer(canvas, game.world);
    game.start(() => renderer.render());

    return () => {
      game.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}
