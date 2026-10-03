import type { ProjectileType } from "../../types";

export const projectileSprites = {
  Bullet: {
    src: new URL("../../assets/projectiles/bullet.png", import.meta.url).href,
    width: 12,
    height: 12,
  },
} satisfies Record<
  ProjectileType,
  { src: string; width: number; height: number }
>;
