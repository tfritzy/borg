# Ship rendering

The backend `ShipType` enum is the source of truth. Generated bindings carry
`shipType.tag` into the frontend's `ShipType` union; do not maintain a second enum.

Both controllers use `control/syncShipMetadata.ts` to create `ShipEntity` instances and
refresh their type on every row update, including updates with no movement.
Ownership determines prediction versus interpolation, not appearance. The helper
preserves the entity and its interpolated pose when metadata changes.

`WorldRenderer` handles the camera, pixel ratio, position, and heading.
`rendering/ships/index.ts` maps each ship type to a PNG and its display dimensions
in CSS pixels. `ShipRenderer` loads those images once and draws them centered at
the ship's position. Loading or failed images are skipped; failures are logged.

The transparent PNGs in `frontend/src/assets/ships/` use the original unfilled,
dark outline style. Raven is the original four-point cursor; Gat is a simple
rounded passenger hull with two seat marks. Each image is 128×128, displayed at 32×32 for crisp
rendering on high-DPI screens. The ship's origin is at the image center and its
bow points up. Replace `raven.png` or `gat.png` to swap artwork without changing
code. Keep that center and orientation; source resolution can change independently
of display size. For a different footprint, update `width` and `height` in the
registry. Vite bundles and versions the assets for deployment.

To add a ship:

1. Add a variant in `backend/src/types/ship_type.rs`.
2. From the repository root, run
   `spacetime generate --lang typescript --out-dir frontend/module_bindings --module-path backend`.
3. Add a PNG under `frontend/src/assets/ships/` and register its URL and display
   dimensions in `shipSprites`. The exhaustive `Record<ShipType, ShipSprite>` makes missing
   entries a build error after regeneration.
4. In `frontend`, run `npm run build`, `npm run lint`, and `npm test` (Node 24+).

The tests cover local, remote, and unowned ships, type-only updates, ownership
changes, distinct visuals, and world rendering transforms without a running server.
