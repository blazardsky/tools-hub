/** Gelato balancing formulas. All weights in grams. */

import {
	ADDITIVE_ALERTS,
	ALCOHOL_MIX_TWEAKS,
	ALCOHOL_PAC_PER_PURE_GRAM,
	FRUIT_TO_TOTAL,
	INGREDIENT_DATA,
	KIND,
	PAC_INDEX,
	POD_INDEX,
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

/** Perceived sweetness % of mix (sucrose-equivalent grams / mix × 100). */
export function podPercent(
	mixGrams: number,
	parts: {
		sucrose?: number;
		dextrose?: number;
		honey?: number;
		invertedSugar?: number;
		lemonJuice?: number;
	},
): number {
	if (mixGrams <= 0) return 0;
	const eq =
		(parts.sucrose ?? 0) * (POD_INDEX.sucrose / 100) +
		(parts.dextrose ?? 0) * (POD_INDEX.dextrose / 100) +
		(parts.honey ?? 0) * (POD_INDEX.honey / 100) +
		(parts.invertedSugar ?? 0) * (POD_INDEX.invertedSugar / 100) +
		(parts.lemonJuice ?? 0) * (POD_INDEX.lemonJuice / 100);
	return round((eq / mixGrams) * 100, 1);
}

export type PacBalance = {
	tempKey: ServiceTempKey;
	celsius: -12 | -18;
	target: number;
	fromSucrose: number;
	fromDextrose: number;
	fromHoney: number;
	fromInverted: number;
	fromLemon: number;
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
	invertedSugar?: number;
	lemonJuice?: number;
	alcoholGrams?: number;
	abvPercent?: number;
}): PacBalance {
	const temp = SERVICE_TEMP[opts.tempKey];
	const mix = opts.mixGrams;
	const fromSucrose = pacPoints(opts.sucrose, PAC_INDEX.sucrose, mix);
	const fromDextrose = pacPoints(opts.dextrose, PAC_INDEX.dextrose, mix);
	const fromHoney = pacPoints(opts.honey ?? 0, PAC_INDEX.honey, mix);
	const fromInverted = pacPoints(
		opts.invertedSugar ?? 0,
		PAC_INDEX.invertedSugar,
		mix,
	);
	const fromLemon = pacPoints(opts.lemonJuice ?? 0, PAC_INDEX.lemonJuice, mix);
	const abv = opts.abvPercent ?? 0;
	const fromAlcohol = alcoholPacPoints(opts.alcoholGrams ?? 0, abv, mix);
	const sugarPac = fromSucrose + fromDextrose + fromHoney + fromInverted;
	const total = round(sugarPac + fromLemon + fromAlcohol, 1);
	const sugarMargin = round(temp.pacTarget - sugarPac, 1);
	const remaining = round(temp.pacTarget - total, 1);

	return {
		tempKey: opts.tempKey,
		celsius: temp.celsius,
		target: temp.pacTarget,
		fromSucrose,
		fromDextrose,
		fromHoney,
		fromInverted,
		fromLemon,
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
	/** Optional extras — displace residual milk/water (alcohol also cuts sugars). */
	alcoholGrams?: number;
	/** ABV % of the liquor (needed to reserve PAC for alcohol). */
	alcoholAbv?: number;
	/** Extra panna beyond the formula amount (displaces milk/water). */
	extraPannaGrams?: number;
	/** Extra water beyond the formula amount (displaces milk when liquid is milk). */
	extraWaterGrams?: number;
	/** Extra lemon juice beyond formula (displaces milk/water; acid bumps neutro ×1.25). */
	extraLemonGrams?: number;
	/** Egg yolk as emulsifier/neutro (displaces milk/water; reduces neutro dose). */
	eggYolkGrams?: number;
};

export type RecipeIngredients = {
	fruit: number;
	milk: number;
	sucrose: number;
	dextrose: number;
	invertedSugar: number;
	honey: number;
	/** Formula panna + optional extra. */
	panna: number;
	/** Formula water + optional extra. */
	water: number;
	lemonJuice: number;
	eggYolk: number;
	neutro: number;
	salt: number;
	alcohol: number;
};

export type AdditiveAlert = {
	ingredient: "panna" | "alcohol" | "water";
	/** Share of final mix weight. */
	percent: number;
	severity: "ok" | "warn" | "high";
};

/** Shown when sucrose-only cannot (or should not) hit the PAC target alone. */
export type SucroseAdvisory = {
	/** POD % if sucrose alone filled the PAC target (inedible at −18°C). */
	podIfSucroseOnly: number;
	/** Grams sucrose per kg that would hit target PAC. */
	sucroseGramsForTarget: number;
	/** PAC still missing after edible common-sugar dose (+ current alcohol). */
	pacShortfall: number;
	/** Liquor grams @ abv that would close the shortfall. */
	alcoholToCloseG: number;
	/** Dextrose-only grams for target PAC (ideal substitute). */
	dextroseGramsForTarget: number;
	/** Invert-only grams for target PAC. */
	invertGramsForTarget: number;
	/** POD % with dextrose-only fill. */
	podWithDextrose: number;
	/** POD % with invert-only fill. */
	podWithInvert: number;
};

export type RecipeResult = {
	kind: RecipeKind;
	sugarMode: SugarMode;
	targetTotal: number;
	actualTotal: number;
	ingredients: RecipeIngredients;
	/** Percents of final mix for the three watch ingredients. */
	percents: { panna: number; alcohol: number; water: number };
	alerts: AdditiveAlert[];
	/** Process / balancing tips (lemon cold-add, stabilizer bump, …). */
	tips: string[];
	pac: PacBalance;
	/** Perceived sweetness % of mix. */
	pod: number;
	/** Set when sugarMode is common — sucrose 1:1 limit + alternatives. */
	sucroseAdvisory: SucroseAdvisory | null;
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
 * High-PAC fraction (dextrose / honey / invert) uses index 190.
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

function buildSucroseAdvisory(
	pacTarget: number,
	mixGrams: number,
	pacShortfall: number,
	abvPercent: number,
): SucroseAdvisory {
	const sucroseGramsForTarget = round((pacTarget * mixGrams) / 1000, 1);
	const dextroseGramsForTarget = round(
		(pacTarget * mixGrams) / (1000 * (PAC_INDEX.dextrose / 100)),
		1,
	);
	const invertGramsForTarget = round(
		(pacTarget * mixGrams) / (1000 * (PAC_INDEX.invertedSugar / 100)),
		1,
	);
	return {
		podIfSucroseOnly: podPercent(mixGrams, {
			sucrose: sucroseGramsForTarget,
		}),
		sucroseGramsForTarget,
		pacShortfall: round(Math.max(0, pacShortfall), 1),
		alcoholToCloseG: maxLiquorGrams(
			Math.max(0, pacShortfall),
			abvPercent || 40,
			mixGrams,
		),
		dextroseGramsForTarget,
		invertGramsForTarget,
		podWithDextrose: podPercent(mixGrams, {
			dextrose: dextroseGramsForTarget,
		}),
		podWithInvert: podPercent(mixGrams, {
			invertedSugar: invertGramsForTarget,
		}),
	};
}

/**
 * Build a balanced gelato/sorbet recipe from fruit (or total) weight.
 * Sugars are scaled so sugar PAC (+ alcohol) hits the service-temperature target
 * — except sucrose-only mode, which stays at edible sweetness and reports the PAC gap.
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
	// With alcohol: avoid high-PAC sugars (dextrose/invert/honey) — prefer sucrose.
	const preferSucrose = alcohol > 0 && ALCOHOL_MIX_TWEAKS.preferSucrose;
	const share = mode.sucroseOnly || preferSucrose ? 1 : sucroseShare;

	const baselineSugar = Math.max(
		0,
		targetTotal * sugarTotalFactor - fruit * params.fruitSugarFactor,
	);
	const baselineSucrose = baselineSugar * share;
	const baselineHighPac = baselineSugar - baselineSucrose;
	const highPacIndex = preferSucrose
		? PAC_INDEX.sucrose
		: mode.useHoney
			? PAC_INDEX.honey
			: mode.useInvert
				? PAC_INDEX.invertedSugar
				: PAC_INDEX.dextrose;
	const baselinePac =
		pacPoints(baselineSucrose, PAC_INDEX.sucrose, targetTotal) +
		pacPoints(baselineHighPac, highPacIndex, targetTotal);

	// Sucrose-only: keep edible sugar %, do not scale up to freezer PAC (would be ~41% @ −18°C).
	// Still cut if alcohol PAC would push the mix over the target.
	const scaled = mode.sucroseOnly
		? {
				sucrose: Math.min(
					baselineSucrose,
					(desiredSugarPac * targetTotal) / 1000,
				),
				highPac: 0,
			}
		: baselinePac > 0
			? {
					sucrose: baselineSucrose * (desiredSugarPac / baselinePac),
					highPac: baselineHighPac * (desiredSugarPac / baselinePac),
				}
			: sugarsForPac(desiredSugarPac, targetTotal, share);

	const sucrose = scaled.sucrose;
	const dextrose =
		mode.useHoney || mode.useInvert || mode.sucroseOnly || preferSucrose
			? 0
			: scaled.highPac;
	const invertedSugar = mode.useInvert && !preferSucrose ? scaled.highPac : 0;
	const honey = mode.useHoney && !preferSucrose ? scaled.highPac : 0;

	const formulaPanna = targetTotal * params.pannaFactor;
	const extraLemon = Math.max(0, input.extraLemonGrams ?? 0);
	const lemonJuice = targetTotal * params.lemonPerKg + extraLemon;
	const eggYolk = Math.max(0, input.eggYolkGrams ?? 0);

	const nf = INGREDIENT_DATA.neutro.formula;
	const kindKey =
		input.kind === "sorbet"
			? "sorbet"
			: input.kind === "cream"
				? "cream"
				: "fruit";
	let neutroPerKg = nf.gramsPerKgByKind[kindKey];
	const isCreamOrFruit = kindKey === "cream" || kindKey === "fruit";
	if (alcohol > 0 && isCreamOrFruit) {
		neutroPerKg = nf.alcoholCreamGramsPerKg;
	}
	const hasAcid = input.kind === "fruit_acid" || lemonJuice > 0;
	const acidApplied = hasAcid;
	const alcoholSorbetApplied = alcohol > 0 && input.kind === "sorbet";
	if (acidApplied) neutroPerKg *= 1 + nf.acidBump;
	if (alcoholSorbetApplied) neutroPerKg *= 1 + nf.alcoholSorbetBump;
	const yolkNeutroEq =
		(eggYolk / INGREDIENT_DATA.eggYolk.formula.yolkGramsEach) *
		INGREDIENT_DATA.eggYolk.formula.neutroEquivalentPerYolkGrams;
	const neutro = Math.max(0, (neutroPerKg * targetTotal) / 1000 - yolkNeutroEq);

	const salt = (targetTotal * INGREDIENT_DATA.salt.formula.gramsPerKg) / 1000;
	const extraPanna = Math.max(0, input.extraPannaGrams ?? 0);
	const extraWater = Math.max(0, input.extraWaterGrams ?? 0);

	// Extras + alcohol count toward fixed weight so residual milk/water shrinks.
	const fixed =
		fruit +
		sucrose +
		dextrose +
		invertedSugar +
		honey +
		formulaPanna +
		extraPanna +
		lemonJuice +
		eggYolk +
		neutro +
		salt +
		alcohol +
		extraWater;
	const residual = Math.max(0, targetTotal - fixed);
	const milk = params.liquid === "milk" ? residual : 0;
	const formulaWater = params.liquid === "water" ? residual : 0;

	const ingredients: RecipeIngredients = {
		fruit: round(fruit),
		milk: round(milk),
		sucrose: round(sucrose),
		dextrose: round(dextrose),
		invertedSugar: round(invertedSugar),
		honey: round(honey),
		panna: round(formulaPanna + extraPanna),
		water: round(formulaWater + extraWater),
		lemonJuice: round(lemonJuice),
		eggYolk: round(eggYolk),
		neutro: round(neutro, 2),
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

	const tips: string[] = [];
	{
		const baseKg = nf.gramsPerKgByKind[kindKey];
		const parts: string[] = [`base ${baseKg} g/kg`];
		if (alcohol > 0 && isCreamOrFruit) {
			parts.push(`alcol → ${nf.alcoholCreamGramsPerKg} g/kg`);
		}
		if (acidApplied) parts.push(`acido ×${1 + nf.acidBump}`);
		if (alcoholSorbetApplied) {
			parts.push(`alcol+sorbetto ×${1 + nf.alcoholSorbetBump}`);
		}
		if (yolkNeutroEq > 0) {
			parts.push(`−${round(yolkNeutroEq, 1)} g (tuorlo)`);
		}
		tips.push(
			`Neutro: ${ingredients.neutro} g (${parts.join("; ")}). Mescola a secco con ~10× saccarosio; attiva a 82–85°C.`,
		);
	}
	if (ingredients.lemonJuice > 0 && params.liquid === "milk") {
		tips.push(
			"Aggiungi il succo di limone solo a freddo (≤ 2–4°C), preferibilmente in mantecatura a miscela già maturata — a pH < 5 la caseina precipita (taglio del latte).",
		);
	}
	if (eggYolk > 0) {
		const yolkG = INGREDIENT_DATA.eggYolk.formula.yolkGramsEach;
		const yolks = round(eggYolk / yolkG, 1);
		tips.push(
			`Tuorlo: ≈ ${yolks} tuorli (≈ ${round(yolkNeutroEq, 1)} g neutro sostituiti). Coagula a ~65°C — non superare in pastorizzazione.`,
		);
	}

	const pac = computePacBalance({
		tempKey,
		mixGrams: actualTotal,
		sucrose: ingredients.sucrose,
		dextrose: ingredients.dextrose,
		honey: ingredients.honey,
		invertedSugar: ingredients.invertedSugar,
		lemonJuice: ingredients.lemonJuice,
		alcoholGrams: ingredients.alcohol,
		abvPercent: abv,
	});

	const pod = podPercent(actualTotal, {
		sucrose: ingredients.sucrose,
		dextrose: ingredients.dextrose,
		honey: ingredients.honey,
		invertedSugar: ingredients.invertedSugar,
		lemonJuice: ingredients.lemonJuice,
	});

	const sucroseAdvisory = mode.sucroseOnly
		? buildSucroseAdvisory(
				pacTarget,
				actualTotal || targetTotal,
				pac.remaining,
				abv || 40,
			)
		: null;

	return {
		kind: input.kind,
		sugarMode,
		targetTotal: round(targetTotal),
		actualTotal,
		ingredients,
		percents,
		alerts,
		tips,
		pac,
		pod,
		sucroseAdvisory,
	};
}
