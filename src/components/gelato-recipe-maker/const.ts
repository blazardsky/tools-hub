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
	/** Honey ≈ invert sugar (glucose + fructose). */
	honey: 190,
	/** Atomized glucose 21 DE — solids without PAC. */
	glucoseAtomized21DE: 0,
	lactose: 100,
} as const;

/** Relative POD (sweetening power); sucrose = 100. */
export const POD_INDEX = {
	sucrose: 100,
	dextrose: 70,
	invertedSugar: 130,
	/** Honey ≈ invert sugar sweetness. */
	honey: 130,
	lactose: 16,
} as const;

/**
 * Sugar strategies. Default `blend` keeps KIND.sucroseShare (80/20 creams, 70/30 sorbet).
 * Sucrose alone has PAC:POD = 1:1 — impossible to hit PAC 410 (−18°C) without ~41% sugar.
 */
export const SUGAR_MODES = {
	blend: {
		label: "Sucrose + dextrose (recommended)",
		sucroseOnly: false,
		useHoney: false,
		useInvert: false,
		hint: "Dextrose PAC 190 / POD 70 — raises freeze resistance without cloying sweetness.",
	},
	inverted: {
		label: "Sucrose + inverted sugar",
		sucroseOnly: false,
		useHoney: false,
		useInvert: true,
		hint: "Invert PAC 190 / POD 130 — softer scoop than sucrose alone; still sweeter than dextrose.",
	},
	honey: {
		label: "Sucrose + honey",
		sucroseOnly: false,
		useHoney: true,
		useInvert: false,
		hint: "Honey ≈ invert (PAC 190 / POD 130). Prefer acacia for a milder flavour.",
	},
	common: {
		label: "Common sugar only (sucrose)",
		sucroseOnly: true,
		useHoney: false,
		useInvert: false,
		/** Creams 17–18%; sorbets 22–24% — edible sweetness, not full −18°C PAC. */
		creamSugarFactor: 0.175,
		sorbetSugarFactor: 0.23,
		hint: "PAC:POD = 1:1 — cannot hit freezer PAC without tasting sickly. Prefer dextrose, invert, or alcohol.",
	},
} as const;

export type SugarMode = keyof typeof SUGAR_MODES;

/** DIY invert-sugar procedure (shown when sucrose-only or invert mode). */
export const INVERT_SUGAR_HOWTO = {
	summary:
		"Invert sugar splits sucrose into glucose + fructose: PAC 190 (vs 100) and blocks crystallization.",
	steps: [
		"Dissolve sucrose in water and heat with a little acid (citric acid, cream of tartar, or lemon juice).",
		"Acid + heat cleaves sucrose into glucose and fructose.",
		"Simple formula: heat a sugar–water solution to 80°C with a pinch of citric acid; ~30 min → >90% inversion, fine for home use.",
	],
} as const;

/** Mix / pasteurization / maturation procedure (shown below PAC balance). */
export const MIX_PROCEDURE = {
	title: "Mix procedure",
	stages: [
		{
			title: "1. Mixing order",
			points: [
				"Cold liquids first: pour milk and panna.",
				"Rain in powders (sugars, milk powder) while still cold; agitate hard to avoid lumps.",
				"Stabilizer (neutro / xanthan): blend with a little sugar and add around 40°C so it disperses instead of floating on steam.",
			],
		},
		{
			title: "2. Heat to 85°C (high pasteurization)",
			points: [
				"Bring the mix to 85°C; start cooling immediately or after a few seconds (no long hold).",
				"Not only sanitation: activates neutri/stabilizers (best hydration above ~80–82°C), emulsifies fats, dissolves sugars evenly, and hydrates milk proteins so they bind free water.",
			],
		},
		{
			title: "3. Rapid cool 85°C → 4°C",
			points: [
				"Cool as fast as possible — ideally under 1 hour (heating + cooling together under ~2 hours).",
				"45°C → 15°C is the critical bacterial window; pass it as quickly as you can.",
			],
		},
		{
			title: "4. Maturation (6–12 h at 4°C)",
			points: [
				"Rest in the fridge 6–12 hours (some texts allow up to 14).",
				"Fats crystallize, proteins finish hydrating, stabilizers bind free water → creamier scoop, fewer large ice crystals, better overrun.",
			],
		},
		{
			title: "5. Churn & fruit timing",
			points: [
				"Load the mantecatore at ≤ 4°C so you keep the air built during maturation.",
				"Acid fruit (pH < 5): add at the end, preferably in the churn when the base is under ~2°C — cold stops casein precipitation (“cutting”).",
				"Browning fruit (banana, peach): fold in last and churn immediately to keep colour.",
			],
		},
	],
} as const;

/**
 * Pure alcohol grams × this = PAC points (per kg mix convention).
 * Rule: each alcoholic degree (≈ 1 g pure alcohol / kg) ≈ 9 PAC.
 */
export const ALCOHOL_PAC_PER_PURE_GRAM = 9;

/** Recipe tweaks when alcohol is in the mix (casein is advice only — not auto-dosed). */
export const ALCOHOL_MIX_TWEAKS = {
	/** Suggested pure casein if using alcohol — show as tip, not an ingredient line. */
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

export const KIND_OPTIONS: {
	value: RecipeKind;
	label: string;
	hint: string;
}[] = [
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
	{ key: "invertedSugar", label: "Inverted sugar" },
	{ key: "honey", label: "Honey" },
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

export const labelClass =
	"block text-sm font-medium text-[rgb(var(--text-title))]";
