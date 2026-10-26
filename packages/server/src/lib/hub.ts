// The Soko hub: sellers drop items off here, and orders are consolidated
// and shipped to buyers from here. Fill in the street address once fixed.
export const HUB = {
  name: "Soko Hub",
  area: "Nairobi CBD",
} as const;

export const HUB_LABEL = `${HUB.name}, ${HUB.area}`;

// Target time for sellers to drop items off after payment. Shown to
// sellers; not enforced yet.
export const DROP_OFF_HOURS = 48;
