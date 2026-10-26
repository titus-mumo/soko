// The Soko hub, where sellers drop items off and orders ship from.
// Keep in sync with packages/server/src/lib/hub.ts.
export const HUB = {
  name: "Soko Hub",
  area: "Nairobi CBD",
} as const;

export const HUB_LABEL = `${HUB.name}, ${HUB.area}`;

/** Target time for sellers to drop items off after payment (not enforced yet). */
export const DROP_OFF_HOURS = 48;
