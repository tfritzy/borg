import { useEffect, useRef } from "react";
import { WorldRenderer } from "./rendering/WorldRenderer";
import { World } from "./state/world";
import { update } from "./control/update";
import { Database } from "./util/db";
import { setupPlayerSubscription } from "./subscription/player";

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<World>(new World());

  useEffect(() => {
    const database = new Database();
    const canvas = canvasRef.current;
    const world = stateRef.current;
    if (!canvas || !world) return;

    const renderer = new WorldRenderer(canvas, world);
    let active = true;
    let unsubscribe: (() => void) | undefined;

    database
      .connect()
      .then((connection) => {
        if (!active) return;

        unsubscribe = setupPlayerSubscription(connection, world);
        if (!active) unsubscribe();
      })
      .catch((error: unknown) => {
        console.error("Failed to connect to SpacetimeDB", error);
      });

    let frameId: number;
    const loop = () => {
      update(stateRef.current);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      active = false;
      unsubscribe?.();
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
