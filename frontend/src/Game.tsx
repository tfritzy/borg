import { useEffect, useRef } from "react";
import { WorldRenderer } from "./rendering/WorldRenderer";
import { World } from "./state/world";
import { Entity } from "./state/Entity";
import { Vector2 } from "./util/Vector2";
import { update } from "./control/update";

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<World>(new World());

  useEffect(() => {
    const canvas = canvasRef.current;
    const world = stateRef.current;
    if (!canvas || !world) return;

    const player = new Entity("player", new Vector2(10, 20));
    world.entities.set(player.id, player);

    const renderer = new WorldRenderer(canvas, world);

    let frameId: number;
    const loop = () => {
      update(stateRef.current);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
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
