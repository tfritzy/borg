import type { ProjectileType } from "../../types";

export const projectileSprites = {
  Bullet: {
    src: new URL("../../assets/projectiles/bullet.svg", import.meta.url).href,
    width: 8,
    height: 8,
  },
} satisfies Record<
  ProjectileType,
  { src: string; width: number; height: number }
>;
