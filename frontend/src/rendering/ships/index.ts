import type { ShipType } from "../../types";

type ShipSprite = {
  src: string;
  width: number;
  height: number;
};

export const shipSprites = {
  Raven: {
    src: new URL("../../assets/ships/raven.png", import.meta.url).href,
    width: 32,
    height: 32,
  },
  Gat: {
    src: new URL("../../assets/ships/gat.png", import.meta.url).href,
    width: 24,
    height: 24,
  },
  Cottonwood: {
    src: new URL("../../assets/ships/cottonwood.svg", import.meta.url).href,
    width: 36,
    height: 36,
  },
  Archer: {
    src: new URL("../../assets/ships/archer.svg", import.meta.url).href,
    width: 32,
    height: 32,
  },
  Hummingbird: {
    src: new URL("../../assets/ships/hummingbird.svg", import.meta.url).href,
    width: 24,
    height: 24,
  },
} satisfies Record<ShipType, ShipSprite>;
