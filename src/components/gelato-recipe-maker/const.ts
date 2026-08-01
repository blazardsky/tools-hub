/** Gelato balancing constants. All weights in grams. */

export const FRUIT_TO_TOTAL = 2.2;

/** Target ranges (informational). */
export const TARGETS = {
	fruitPercent: { min: 35, max: 50 },
	sugarsCream: { min: 18, max: 22 },
	sugarsSorbet: { min: 25, max: 30 },
	fatsCream: { min: 4, max: 6 },
	xanthanMaxPercent: 0.2,
} as const;

/**
 * Alert thresholds for optional additives (% of final mix).
 * ponytail: placeholder cutoffs — tune when UI lands / after tasting tests.
 */
export const ADDITIVE_ALERTS = {
	panna: { warn: 15, high: 25 },
	alcohol: { warn: 2, high: 5 },
	water: { warn: 10, high: 20 },
} as const;

/**
 * Base bianca flavor doses per kg of mix (typically calculated on 1000g).
 * Dissolving flavors: subtract the same weight from milk to keep total.
 * Inclusions: add during/at end of churn — do not displace milk.
 */
export const BASE_BIANCA_FLAVORS = {
	coffeeFreezeDried: { gramsPerKg: 20, replaceMilk: true },
	espresso: { gramsPerKg: 200, replaceMilk: true },
	vanillaPods: { minPerKg: 2, maxPerKg: 4 },
	spices: { gramsPerKg: 5, replaceMilk: true },
	cocoaPowder_22_24: { gramsPerKg: 60, replaceMilk: true },
	/** Couverture 70% — high fat; often needs recipe rebalance (drop panna/milk → water). */
	chocolateCouverture70: { gramsPerKg: 170, replaceMilk: true },
	stracciatella: { gramsPerKg: 100, replaceMilk: false },
	nuts: { gramsPerKg: 100, replaceMilk: false },
	candiedFruit: { gramsPerKg: 100, replaceMilk: false },
	/** Turn base bianca into egg base (mantecato). */
	eggYolk: { gramsPerKg: 100, replaceMilk: true },
	/** Crema catalana: caramel pieces at end of churn (on egg base). */
	catalanaCaramel: { gramsPerKg: 50, replaceMilk: false },
	/** Cut base sugars when using sugary inclusions (candied, raisins, caramel). */
	sugaryInclusionSugarCut: { gramsPerKg: 20 },
} as const;

/**
 * Service temperature → PAC target (points, as for a ~1 kg mix).
 * Sources often cite −11°C / 270 for display; UI uses −12° professional.
 */
export const SERVICE_TEMP = {
	professional: {
		celsius: -12 as const,
		pacTarget: 270,
		label: "Professional (−12°C)",
	},
	home: {
		celsius: -18 as const,
		pacTarget: 410,
		label: "Home freezer (−18°C)",
	},
} as const;

export type ServiceTempKey = keyof typeof SERVICE_TEMP;

/** Relative PAC index (sucrose = 100). */
export const PAC_INDEX = {
	sucrose: 100,
	dextrose: 190,
	invertedSugar: 190,
	/** Atomized glucose 21 DE — solids without PAC. */
	glucoseAtomized21DE: 0,
	lactose: 100,
} as const;

/** Relative POD (sweetening power); sucrose = 100. */
export const POD_INDEX = {
	sucrose: 100,
	dextrose: 70,
	lactose: 16,
} as const;

/**
 * Pure alcohol grams × this = PAC points (per kg mix convention).
 * Rule: each alcoholic degree (≈ 1 g pure alcohol / kg) ≈ 9 PAC.
 */
export const ALCOHOL_PAC_PER_PURE_GRAM = 9;

/** Recipe tweaks when alcohol is in the mix. */
export const ALCOHOL_MIX_TWEAKS = {
	caseinGramsPerKg: 20,
	/** Increase neutro/stabilizer vs normal dose. */
	stabilizerBump: 0.25,
	/** Prefer sucrose (PAC 100); avoid high-PAC sugars (dextrose, invert). */
	preferSucrose: true,
} as const;

/**
 * Lactose-free milk: lactase splits lactose → glucose + galactose.
 * Raises POD and PAC vs standard lactose; texture: less sandiness.
 * Exact PAC delta not standardized here — cut other sugars if mix is soft/sweet.
 */
export const LACTOSE_FREE = {
	pacHigherThanLactose: true,
	podHigherThanLactose: true,
	/** Earlier rule of thumb from fruit-base notes. */
	sugarCutFraction: 0.1,
} as const;

export type RecipeKind = "fruit_acid" | "fruit_sweet" | "cream" | "sorbet";

type KindParams = {
	sugarTotalFactor: number;
	fruitSugarFactor: number;
	pannaFactor: number;
	xanthanFactor: number;
	lemonPerKg: number;
	/** Creams use milk residual; sorbets use water residual. */
	liquid: "milk" | "water";
	/** Sucrose share of total sugars (rest is dextrose). */
	sucroseShare: number;
};

export const KIND: Record<RecipeKind, KindParams> = {
	// Frutta pH < 5 — cream base, lower fruit sugars
	fruit_acid: {
		sugarTotalFactor: 0.18,
		fruitSugarFactor: 0.1,
		pannaFactor: 0.12,
		xanthanFactor: 0.0015,
		lemonPerKg: 0,
		liquid: "milk",
		sucroseShare: 0.8,
	},
	// Frutta pH > 5
	fruit_sweet: {
		sugarTotalFactor: 0.18,
		fruitSugarFactor: 0.15,
		pannaFactor: 0.12,
		xanthanFactor: 0.0015,
		lemonPerKg: 0.035,
		liquid: "milk",
		sucroseShare: 0.8,
	},
	// Base bianca (no fruit)
	cream: {
		sugarTotalFactor: 0.18,
		fruitSugarFactor: 0,
		pannaFactor: 0.17,
		xanthanFactor: 0.006,
		lemonPerKg: 0,
		liquid: "milk",
		sucroseShare: 0.8,
	},
	// Sorbetto
	sorbet: {
		sugarTotalFactor: 0.25,
		fruitSugarFactor: 0.1,
		pannaFactor: 0,
		xanthanFactor: 0.005,
		lemonPerKg: 0.035,
		liquid: "water",
		sucroseShare: 0.7,
	},
};

export const KIND_OPTIONS: { value: RecipeKind; label: string; hint: string }[] =
	[
		{
			value: "fruit_acid",
			label: "Acid fruit (pH < 5)",
			hint: "Plums, strawberries, berries — fruit in churn when mix is cold",
		},
		{
			value: "fruit_sweet",
			label: "Sweet fruit (pH > 5)",
			hint: "Banana, mango, figs — blend fruit with base before churning",
		},
		{
			value: "cream",
			label: "Base bianca (cream)",
			hint: "No fruit — set desired mix weight",
		},
		{
			value: "sorbet",
			label: "Sorbet",
			hint: "Fruit + water base, higher sugars",
		},
	];

export const INGREDIENT_ROWS = [
	{ key: "fruit", label: "Fruit" },
	{ key: "milk", label: "Milk" },
	{ key: "sucrose", label: "Sucrose" },
	{ key: "dextrose", label: "Dextrose" },
	{ key: "panna", label: "Panna (35%)" },
	{ key: "water", label: "Water" },
	{ key: "lemonJuice", label: "Lemon juice" },
	{ key: "xanthan", label: "Xanthan" },
	{ key: "salt", label: "Salt" },
	{ key: "alcohol", label: "Alcohol" },
] as const;

export const FLAVOR_ROWS: {
	key: keyof typeof BASE_BIANCA_FLAVORS;
	label: string;
	note?: string;
}[] = [
	{
		key: "coffeeFreezeDried",
		label: "Coffee (freeze-dried)",
		note: "Add while heating; subtract same weight from milk",
	},
	{
		key: "espresso",
		label: "Espresso",
		note: "Replace equal milk weight",
	},
	{
		key: "vanillaPods",
		label: "Vanilla pods",
		note: "Split & scrape; steep while heating, strain after maturation",
	},
	{
		key: "spices",
		label: "Spices (e.g. cinnamon)",
		note: "Infuse sticks in hot milk",
	},
	{
		key: "cocoaPowder_22_24",
		label: "Cocoa powder 22/24",
		note: "Replace equal milk weight",
	},
	{
		key: "chocolateCouverture70",
		label: "Chocolate couverture 70%",
		note: "High fat — often drop panna/milk and use water",
	},
	{
		key: "stracciatella",
		label: "Stracciatella",
		note: "Add at end of churn (melted stream or chips)",
	},
	{
		key: "nuts",
		label: "Nuts (chopped / candied)",
		note: "Fold in during churn",
	},
	{
		key: "candiedFruit",
		label: "Candied fruit",
		note: "Add in churn; consider sugar cut below",
	},
	{
		key: "eggYolk",
		label: "Egg yolk (base uova)",
		note: "Turns base bianca into mantecato; replace milk",
	},
	{
		key: "catalanaCaramel",
		label: "Crema catalana caramel",
		note: "On egg base; add pieces at end of churn",
	},
	{
		key: "sugaryInclusionSugarCut",
		label: "Sugar cut (sugary inclusions)",
		note: "Reduce base sugars when using candied / raisins / caramel",
	},
];

export const fieldClass =
	"mt-1 w-full border border-[rgb(var(--page-border))] bg-[rgb(var(--header))] px-3 py-2 text-base text-[rgb(var(--text-color))] outline-none focus-visible:border-[rgb(var(--brand))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand)/0.25)]";

export const labelClass = "block text-sm font-medium text-[rgb(var(--text-title))]";
