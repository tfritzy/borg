import type { ProjectileType } from "../../types";

export const projectileSprites = {
  Bullet: {
    src: new URL("../../assets/projectiles/bullet.svg", import.meta.url).href,
    width: 4,
    height: 4,
  },
} satisfies Record<
  ProjectileType,
  { src: string; width: number; height: number }
>;
