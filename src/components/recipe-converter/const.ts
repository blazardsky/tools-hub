/** Culinary volume → ml (US cooking approximations). */
export const CULINARY_ML = {
	cup: 240,
	spoon: 15,
	teaspoon: 5,
	dash: 0.6,
	pinch: 0.3,
	sprinkle: 0.15,
} as const;

export type CulinaryUnit = keyof typeof CULINARY_ML;

/** Alias → culinary key (normalized lowercase). */
export const MEASURE_ALIASES: Record<string, CulinaryUnit> = {
	cup: "cup",
	cups: "cup",
	spoon: "spoon",
	spoons: "spoon",
	tablespoon: "spoon",
	tablespoons: "spoon",
	tbsp: "spoon",
	tbs: "spoon",
	"tbs.": "spoon",
	teaspoon: "teaspoon",
	teaspoons: "teaspoon",
	tsp: "teaspoon",
	"tsp.": "teaspoon",
	dash: "dash",
	dashes: "dash",
	pinch: "pinch",
	pinches: "pinch",
	sprinkle: "sprinkle",
	sprinkles: "sprinkle",
	smidgen: "sprinkle",
};

/**
 * Volume → grams uses water density (1 g/ml). Grams vary by ingredient density;
 * water is the standard cooking approximation when density is unknown.
 */
export const WATER_G_PER_ML = 1;

/** Select options: value is what lib.ts understands. */
export const MEASURE_OPTIONS = [
	{ value: "g", label: "g" },
	{ value: "kg", label: "kg" },
	{ value: "mg", label: "mg" },
	{ value: "oz", label: "oz" },
	{ value: "lb", label: "lb" },
	{ value: "ml", label: "ml" },
	{ value: "l", label: "l" },
	{ value: "fl-oz", label: "fl oz" },
	{ value: "cup", label: "cup" },
	{ value: "spoon", label: "spoon (tbsp)" },
	{ value: "teaspoon", label: "teaspoon (tsp)" },
	{ value: "dash", label: "dash" },
	{ value: "pinch", label: "pinch" },
	{ value: "sprinkle", label: "sprinkle" },
] as const;

export const fieldClass =
	"mt-1 w-full border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25";

export const labelClass = "block text-sm font-medium text-foreground";
