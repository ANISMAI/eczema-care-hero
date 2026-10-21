// The town seen from above (title screen): a painted image with the clinic in the middle and a
// straight road below the plaza. The title zooms into the clinic's door when the player presses
// Enter, and small vehicles drive along the road's two lanes (ui/TownTraffic.ts).
//
// Source: art-source/town-map.webp (full quality); the game loads public/assets/town-map.webp.
// If the image is replaced, measure the door and the road again (image pixels).
// (The earlier hand-drawn SVG town is in git history, before this change.)

export interface Town {
  url: string;
  /** Width = height of the square image (px); all positions below are in these pixels. */
  size: number;
  /** Clinic front door: where Enter zooms in. */
  door: { x: number; y: number };
  /** Top of the clinic's roof: kept on screen in short landscape views. */
  clinicTop: number;
  /** The road's asphalt band (top and bottom y). */
  road: { top: number; bottom: number };
  /** Road lanes for the passing traffic: where wheels touch the road, and the direction. */
  lanes: { y: number; dir: 1 | -1 }[];
  /** Vehicle size on this image (1 = the size the vehicles are drawn at). */
  vehicleScale: number;
}

export const TOWN: Town = {
  url: "assets/town-map.webp",
  size: 1254,
  door: { x: 626, y: 505 },
  clinicTop: 219,
  road: { top: 825, bottom: 918 },
  // asphalt from y 825 to 918, dashed centre line at 871. Left-hand traffic, as in Malaysia:
  // eastbound on the upper lane, westbound on the lower one.
  lanes: [
    { y: 862, dir: 1 },
    { y: 911, dir: -1 },
  ],
  vehicleScale: 0.82,
};

export function buildTown(): Town {
  return TOWN;
}
