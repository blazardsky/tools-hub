/** Gelato balancing formulas. All weights in grams. */

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
 * Method/notes copy lives in the App form later — not duplicated here.
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

/** Scale a per-kg dose to an arbitrary mix weight. */
export const doseFor = (gramsPerKg: number, mixGrams: number) =>
	(gramsPerKg * mixGrams) / 1000;

export type RecipeKind = "fruit_acid" | "fruit_sweet" | "cream" | "sorbet";

export type RecipeInput = {
	kind: RecipeKind;
	/** Fruit weight (g). Required for fruit_* and sorbet; ignored for cream. */
	fruitGrams?: number;
	/** Desired mix weight (g). Required for cream; otherwise = fruit × 2.2. */
	totalGrams?: number;
	/** Optional extras on top of the balanced base. */
	alcoholGrams?: number;
	/** Extra panna beyond the formula amount. */
	extraPannaGrams?: number;
	/** Extra water beyond the formula amount. */
	extraWaterGrams?: number;
};

export type RecipeIngredients = {
	fruit: number;
	milk: number;
	sucrose: number;
	dextrose: number;
	/** Formula panna + optional extra. */
	panna: number;
	/** Formula water + optional extra. */
	water: number;
	lemonJuice: number;
	xanthan: number;
	salt: number;
	alcohol: number;
};

export type AdditiveAlert = {
	ingredient: "panna" | "alcohol" | "water";
	/** Share of final mix weight. */
	percent: number;
	severity: "ok" | "warn" | "high";
};

export type RecipeResult = {
	kind: RecipeKind;
	targetTotal: number;
	actualTotal: number;
	ingredients: RecipeIngredients;
	/** Percents of final mix for the three watch ingredients. */
	percents: { panna: number; alcohol: number; water: number };
	alerts: AdditiveAlert[];
};

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

const KIND: Record<RecipeKind, KindParams> = {
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

const round = (n: number, decimals = 1) => {
	const f = 10 ** decimals;
	return Math.round(n * f) / f;
};

const pct = (part: number, total: number) =>
	total <= 0 ? 0 : round((part / total) * 100, 2);

function severity(
	percent: number,
	thresholds: { warn: number; high: number },
): AdditiveAlert["severity"] {
	if (percent >= thresholds.high) return "high";
	if (percent >= thresholds.warn) return "warn";
	return "ok";
}

function resolveTargetTotal(input: RecipeInput): {
	fruit: number;
	targetTotal: number;
} {
	if (input.kind === "cream") {
		const targetTotal = input.totalGrams ?? 0;
		if (targetTotal <= 0) {
			throw new Error("cream recipes need totalGrams > 0");
		}
		return { fruit: 0, targetTotal };
	}
	const fruit = input.fruitGrams ?? 0;
	if (fruit <= 0) {
		throw new Error(`${input.kind} recipes need fruitGrams > 0`);
	}
	return { fruit, targetTotal: fruit * FRUIT_TO_TOTAL };
}

/**
 * Build a balanced gelato/sorbet recipe from fruit (or total) weight.
 * Optional alcohol / extra panna / extra water are added on top of the base;
 * liquid (milk or water) is Q.b. so the base hits targetTotal before extras.
 *
 * Alcohol PAC compensation (reduce sugars so PAC ≈ 270–290) is not applied yet —
 * ponytail: needs full PAC/POD model; surface via alerts until then.
 */
export function generateRecipe(input: RecipeInput): RecipeResult {
	const params = KIND[input.kind];
	const { fruit, targetTotal } = resolveTargetTotal(input);

	const sugarTotal = Math.max(
		0,
		targetTotal * params.sugarTotalFactor - fruit * params.fruitSugarFactor,
	);
	const sucrose = sugarTotal * params.sucroseShare;
	const dextrose = sugarTotal - sucrose;
	const formulaPanna = targetTotal * params.pannaFactor;
	const lemonJuice = targetTotal * params.lemonPerKg;
	const xanthan = targetTotal * params.xanthanFactor;
	const salt = targetTotal * 0.0005; // 0.5 g/kg

	const fixed =
		fruit + sucrose + dextrose + formulaPanna + lemonJuice + xanthan + salt;
	const residual = Math.max(0, targetTotal - fixed);
	const milk = params.liquid === "milk" ? residual : 0;
	const formulaWater = params.liquid === "water" ? residual : 0;

	const alcohol = Math.max(0, input.alcoholGrams ?? 0);
	const extraPanna = Math.max(0, input.extraPannaGrams ?? 0);
	const extraWater = Math.max(0, input.extraWaterGrams ?? 0);

	const ingredients: RecipeIngredients = {
		fruit: round(fruit),
		milk: round(milk),
		sucrose: round(sucrose),
		dextrose: round(dextrose),
		panna: round(formulaPanna + extraPanna),
		water: round(formulaWater + extraWater),
		lemonJuice: round(lemonJuice),
		xanthan: round(xanthan, 2),
		salt: round(salt, 2),
		alcohol: round(alcohol),
	};

	const actualTotal = round(
		Object.values(ingredients).reduce((a, b) => a + b, 0),
	);

	const percents = {
		panna: pct(ingredients.panna, actualTotal),
		alcohol: pct(ingredients.alcohol, actualTotal),
		water: pct(ingredients.water, actualTotal),
	};

	const alerts: AdditiveAlert[] = (
		[
			["panna", percents.panna, ADDITIVE_ALERTS.panna],
			["alcohol", percents.alcohol, ADDITIVE_ALERTS.alcohol],
			["water", percents.water, ADDITIVE_ALERTS.water],
		] as const
	).map(([ingredient, percent, thresholds]) => ({
		ingredient,
		percent,
		severity: severity(percent, thresholds),
	}));

	return {
		kind: input.kind,
		targetTotal: round(targetTotal),
		actualTotal,
		ingredients,
		percents,
		alerts,
	};
}
