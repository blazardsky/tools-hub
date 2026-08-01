/** Gelato balancing formulas. All weights in grams. */

import {
	ADDITIVE_ALERTS,
	ALCOHOL_MIX_TWEAKS,
	ALCOHOL_PAC_PER_PURE_GRAM,
	FRUIT_TO_TOTAL,
	KIND,
	PAC_INDEX,
	type RecipeKind,
	SERVICE_TEMP,
	type ServiceTempKey,
	SUGAR_MODES,
	type SugarMode,
} from "./const";

/** Scale a per-kg dose to an arbitrary mix weight. */
export const doseFor = (gramsPerKg: number, mixGrams: number) =>
	(gramsPerKg * mixGrams) / 1000;

const round = (n: number, decimals = 1) => {
	const f = 10 ** decimals;
	return Math.round(n * f) / f;
};

/** PAC points from an ingredient, normalized to a 1 kg mix. */
export function pacPoints(
	grams: number,
	index: number,
	mixGrams: number,
): number {
	if (mixGrams <= 0 || grams <= 0) return 0;
	return round((grams * (index / 100) * 1000) / mixGrams, 1);
}

export function alcoholPacPoints(
	liquorGrams: number,
	abvPercent: number,
	mixGrams: number,
): number {
	if (mixGrams <= 0 || liquorGrams <= 0 || abvPercent <= 0) return 0;
	const purePerKg = (liquorGrams * (abvPercent / 100) * 1000) / mixGrams;
	return round(purePerKg * ALCOHOL_PAC_PER_PURE_GRAM, 1);
}

/** Max liquor (g) that fills a PAC margin at the given ABV. */
export function maxLiquorGrams(
	pacMargin: number,
	abvPercent: number,
	mixGrams: number,
): number {
	if (pacMargin <= 0 || abvPercent <= 0 || mixGrams <= 0) return 0;
	const purePerKg = pacMargin / ALCOHOL_PAC_PER_PURE_GRAM;
	return round((purePerKg / (abvPercent / 100)) * (mixGrams / 1000), 1);
}

export type PacBalance = {
	tempKey: ServiceTempKey;
	celsius: -12 | -18;
	target: number;
	fromSucrose: number;
	fromDextrose: number;
	fromHoney: number;
	fromAlcohol: number;
	total: number;
	/** Target − sugar PAC (room reserved / available before counting alcohol). */
	margin: number;
	/** Target − total PAC (room left after current alcohol). */
	remaining: number;
	/** Suggested max additional liquor at abv for `remaining`. */
	maxLiquorAtAbv: number;
};

export function computePacBalance(opts: {
	tempKey: ServiceTempKey;
	mixGrams: number;
	sucrose: number;
	dextrose: number;
	honey?: number;
	alcoholGrams?: number;
	abvPercent?: number;
}): PacBalance {
	const temp = SERVICE_TEMP[opts.tempKey];
	const mix = opts.mixGrams;
	const fromSucrose = pacPoints(opts.sucrose, PAC_INDEX.sucrose, mix);
	const fromDextrose = pacPoints(opts.dextrose, PAC_INDEX.dextrose, mix);
	const fromHoney = pacPoints(opts.honey ?? 0, PAC_INDEX.honey, mix);
	const abv = opts.abvPercent ?? 0;
	const fromAlcohol = alcoholPacPoints(opts.alcoholGrams ?? 0, abv, mix);
	const sugarPac = fromSucrose + fromDextrose + fromHoney;
	const total = round(sugarPac + fromAlcohol, 1);
	const sugarMargin = round(temp.pacTarget - sugarPac, 1);
	const remaining = round(temp.pacTarget - total, 1);

	return {
		tempKey: opts.tempKey,
		celsius: temp.celsius,
		target: temp.pacTarget,
		fromSucrose,
		fromDextrose,
		fromHoney,
		fromAlcohol,
		total,
		margin: sugarMargin,
		remaining,
		maxLiquorAtAbv: maxLiquorGrams(Math.max(0, remaining), abv || 40, mix),
	};
}

export type RecipeInput = {
	kind: RecipeKind;
	/** Fruit weight (g). Required for fruit_* and sorbet; ignored for cream. */
	fruitGrams?: number;
	/** Desired mix weight (g). Required for cream; otherwise = fruit × 2.2. */
	totalGrams?: number;
	/** Service temperature — scales sugars so mix PAC hits the target. */
	tempKey?: ServiceTempKey;
	/** Kitchen sugar / honey instead of the default sucrose+dextrose blend. */
	sugarMode?: SugarMode;
	/** Optional extras on top of the balanced base. */
	alcoholGrams?: number;
	/** ABV % of the liquor (needed to reserve PAC for alcohol). */
	alcoholAbv?: number;
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
	honey: number;
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
	pac: PacBalance;
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
 * Grams of sugars needed for `desiredPac` at this mix weight & sucrose share.
 * High-PAC fraction (dextrose or honey) uses index 190.
 * PAC = (sucrose×1 + highPac×1.9) × 1000/mix
 */
function sugarsForPac(
	desiredPac: number,
	mixGrams: number,
	sucroseShare: number,
): { sucrose: number; highPac: number } {
	if (desiredPac <= 0 || mixGrams <= 0) return { sucrose: 0, highPac: 0 };
	const pacPerGramAt1kg = 1.9 - 0.9 * sucroseShare;
	const sugarTotal = (desiredPac * mixGrams) / (1000 * pacPerGramAt1kg);
	const sucrose = sugarTotal * sucroseShare;
	return { sucrose, highPac: sugarTotal - sucrose };
}

/**
 * Build a balanced gelato/sorbet recipe from fruit (or total) weight.
 * Sugars are scaled so sugar PAC (+ alcohol) hits the service-temperature target.
 * Liquid (milk or water) is Q.b. to hit targetTotal before extras.
 */
export function generateRecipe(input: RecipeInput): RecipeResult {
	const params = KIND[input.kind];
	const tempKey = input.tempKey ?? "professional";
	const sugarMode = input.sugarMode ?? "blend";
	const mode = SUGAR_MODES[sugarMode];
	const pacTarget = SERVICE_TEMP[tempKey].pacTarget;
	const { fruit, targetTotal } = resolveTargetTotal(input);

	const sucroseShare = mode.sucroseOnly ? 1 : params.sucroseShare;
	const sugarTotalFactor =
		sugarMode === "common"
			? params.liquid === "water"
				? SUGAR_MODES.common.sorbetSugarFactor
				: SUGAR_MODES.common.creamSugarFactor
			: params.sugarTotalFactor;

	const alcohol = Math.max(0, input.alcoholGrams ?? 0);
	const abv = Math.max(0, input.alcoholAbv ?? 0);
	const alcoholPac = alcoholPacPoints(alcohol, abv, targetTotal);
	const desiredSugarPac = Math.max(0, pacTarget - alcoholPac);

	const baselineSugar = Math.max(
		0,
		targetTotal * sugarTotalFactor - fruit * params.fruitSugarFactor,
	);
	const baselineSucrose = baselineSugar * sucroseShare;
	const baselineHighPac = baselineSugar - baselineSucrose;
	const highPacIndex = mode.useHoney ? PAC_INDEX.honey : PAC_INDEX.dextrose;
	const baselinePac =
		pacPoints(baselineSucrose, PAC_INDEX.sucrose, targetTotal) +
		pacPoints(baselineHighPac, highPacIndex, targetTotal);

	const scaled =
		baselinePac > 0
			? {
					sucrose: baselineSucrose * (desiredSugarPac / baselinePac),
					highPac: baselineHighPac * (desiredSugarPac / baselinePac),
				}
			: sugarsForPac(desiredSugarPac, targetTotal, sucroseShare);

	const sucrose = scaled.sucrose;
	const dextrose = mode.useHoney || mode.sucroseOnly ? 0 : scaled.highPac;
	const honey = mode.useHoney ? scaled.highPac : 0;

	const formulaPanna = targetTotal * params.pannaFactor;
	const lemonJuice = targetTotal * params.lemonPerKg;
	let xanthan = targetTotal * params.xanthanFactor;
	if (alcohol > 0) {
		xanthan *= 1 + ALCOHOL_MIX_TWEAKS.stabilizerBump;
	}
	const salt = targetTotal * 0.0005; // 0.5 g/kg

	const fixed =
		fruit +
		sucrose +
		dextrose +
		honey +
		formulaPanna +
		lemonJuice +
		xanthan +
		salt +
		alcohol;
	const residual = Math.max(0, targetTotal - fixed);
	const milk = params.liquid === "milk" ? residual : 0;
	const formulaWater = params.liquid === "water" ? residual : 0;

	const extraPanna = Math.max(0, input.extraPannaGrams ?? 0);
	const extraWater = Math.max(0, input.extraWaterGrams ?? 0);

	const ingredients: RecipeIngredients = {
		fruit: round(fruit),
		milk: round(milk),
		sucrose: round(sucrose),
		dextrose: round(dextrose),
		honey: round(honey),
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

	const pac = computePacBalance({
		tempKey,
		mixGrams: actualTotal,
		sucrose: ingredients.sucrose,
		dextrose: ingredients.dextrose,
		honey: ingredients.honey,
		alcoholGrams: ingredients.alcohol,
		abvPercent: abv,
	});

	return {
		kind: input.kind,
		targetTotal: round(targetTotal),
		actualTotal,
		ingredients,
		percents,
		alerts,
		pac,
	};
}
