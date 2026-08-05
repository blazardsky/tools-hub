/** Gelato balancing formulas. All weights in grams. */

import {
	ADDITIVE_ALERTS,
	ALCOHOL_MIX_TWEAKS,
	ALCOHOL_PAC_PER_PURE_GRAM,
	FRUIT_TO_TOTAL,
	INGREDIENT_DATA,
	INGREDIENT_ROWS,
	INVERT_SUGAR_DIY,
	KIND,
	KIND_OPTIONS,
	PAC_INDEX,
	POD_INDEX,
	type RecipeKind,
	type RicottaMilk,
	SERVICE_TEMP,
	type ServiceTempKey,
	SUGAR_MODES,
	type SugarMode,
	saltGramsPerKg,
	TARGETS,
	usesTotalGrams,
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
	fromSalt: number;
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
	salt?: number;
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
	const fromSalt = pacPoints(opts.salt ?? 0, PAC_INDEX.salt, mix);
	const abv = opts.abvPercent ?? 0;
	const fromAlcohol = alcoholPacPoints(opts.alcoholGrams ?? 0, abv, mix);
	const sugarPac = fromSucrose + fromDextrose + fromHoney + fromInverted;
	const total = round(sugarPac + fromLemon + fromSalt + fromAlcohol, 1);
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
		fromSalt,
		fromAlcohol,
		total,
		margin: sugarMargin,
		remaining,
		maxLiquorAtAbv: maxLiquorGrams(Math.max(0, remaining), abv || 40, mix),
	};
}

export type RecipeInput = {
	kind: RecipeKind;
	/** Fruit weight (g). Required for fruit_* and sorbet; ignored for cream/yogurt/ricotta. */
	fruitGrams?: number;
	/** Desired mix weight (g). Required for cream/yogurt/ricotta; otherwise = fruit × 2.2. */
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
	/**
	 * When sugarMode is inverted: neutralize DIY acid with bicarbonate (default true).
	 * If false, residual acidity can bump neutro (ignored if delta < 1 g). Does not add lemon to the ingredient list.
	 */
	invertNeutralize?: boolean;
	/** Egg yolk as emulsifier/neutro (displaces milk/water; reduces neutro dose). */
	eggYolkGrams?: number;
	/** Savory / gastronomic — higher salt dose (4–8 g/kg cream, 8 g/kg sorbet). */
	savory?: boolean;
	/** Absolute salt grams when savory (optional; otherwise formula default for kind). */
	saltGrams?: number;
	/** Yogurt MG % (yogurt kind). Scales panna toward ~5% fat mix. */
	yogurtFatPercent?: number;
	/** Strained Greek yogurt (yogurt kind) — tip / label; same 50% dose. */
	greekYogurt?: boolean;
	/** Ricotta % of mix (ricotta kind; typically 15–25). */
	ricottaPercent?: number;
	/** Ricotta milk type — sets composition defaults. */
	ricottaMilk?: RicottaMilk;
	/** Ricotta fat % (MG). */
	ricottaFatPercent?: number;
	/** Ricotta solids non-fat % (SLNG). */
	ricottaSlngPercent?: number;
	/** Ricotta total solids %. */
	ricottaSolidsPercent?: number;
};

export type RecipeIngredients = {
	fruit: number;
	yogurt: number;
	ricotta: number;
	milk: number;
	skimMilkPowder: number;
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

/** DIY batch to produce the invert syrup weighed into the mix. */
export type InvertDiyBatch = {
	/** Sugar solids (PAC/POD basis). */
	solidsGrams: number;
	/** Finished syrup weight (~75% solids) added to the mix. */
	syrupGrams: number;
	/** Bound water in syrup — displaces milk/water in formula. */
	waterInSyrup: number;
	/** Starting sucrose for the DIY batch. */
	sucrose: number;
	/** Process water before evaporation. */
	processWater: number;
	lemonJuice: number;
	citricAcid: number;
	bicarbonate: number;
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
	/** DIY invert batch when sugarMode is inverted (and invert > 0). */
	invertDiy: InvertDiyBatch | null;
};

/** Scale DIY invert ratios from sugar solids → finished ~75% syrup. */
export function invertDiyFromSolids(solidsGrams: number): InvertDiyBatch {
	const solidsFrac = INVERT_SUGAR_DIY.solidsPercent / 100;
	const syrupGrams = solidsGrams <= 0 ? 0 : solidsGrams / solidsFrac;
	const scale = solidsGrams / 100;
	return {
		solidsGrams: round(solidsGrams),
		syrupGrams: round(syrupGrams),
		waterInSyrup: round(Math.max(0, syrupGrams - solidsGrams)),
		sucrose: round(solidsGrams),
		processWater: round(INVERT_SUGAR_DIY.waterPer100gSucrose * scale),
		lemonJuice: round(INVERT_SUGAR_DIY.lemonJuicePer100gSucrose * scale, 2),
		citricAcid: round(INVERT_SUGAR_DIY.citricAcidPer100gSucrose * scale, 2),
		bicarbonate: round(INVERT_SUGAR_DIY.bicarbonatePer100gSucrose * scale, 2),
	};
}

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
	if (usesTotalGrams(input.kind)) {
		const targetTotal = input.totalGrams ?? 0;
		if (targetTotal <= 0) {
			throw new Error(`${input.kind} recipes need totalGrams > 0`);
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
 * Panna (g) so dairy fat + cream + residual milk ≈ target mix fat %.
 * milk = target − fixedWithoutPanna − panna.
 */
function pannaForMixFat(opts: {
	targetTotal: number;
	dairyGrams: number;
	dairyFatPercent: number;
	fixedWithoutPanna: number;
	targetMixFatPercent: number;
	creamFatPercent: number;
	milkFatPercent: number;
}): number {
	const T = opts.targetTotal;
	const df = opts.dairyFatPercent / 100;
	const cf = opts.creamFatPercent / 100;
	const mf = opts.milkFatPercent / 100;
	const targetFat = (opts.targetMixFatPercent / 100) * T;
	const dairyFat = opts.dairyGrams * df;
	// targetFat = dairyFat + panna*cf + (T - fixed - panna)*mf
	const denom = cf - mf;
	if (denom <= 0) return 0;
	const panna =
		(targetFat - dairyFat - (T - opts.fixedWithoutPanna) * mf) / denom;
	return Math.max(0, panna);
}

/** LMP (g) so ricotta SLNG + milk SNF + LMP ≈ target mix SLNG (LMP displaces milk). */
function lmpForMixSlng(opts: {
	targetTotal: number;
	ricottaGrams: number;
	ricottaSlngPercent: number;
	/** Mix weight already allocated (no milk, no LMP). */
	fixedWithoutMilkOrLmp: number;
	targetMixSlngPercent: number;
	milkSlngPercent: number;
	lmpSolidsPercent: number;
	maxGramsPerKg: number;
}): number {
	const T = opts.targetTotal;
	const milk0 = Math.max(0, T - opts.fixedWithoutMilkOrLmp);
	const rSlng = opts.ricottaGrams * (opts.ricottaSlngPercent / 100);
	const ms = opts.milkSlngPercent / 100;
	const ls = opts.lmpSolidsPercent / 100;
	const target = (opts.targetMixSlngPercent / 100) * T;
	// target = rSlng + (milk0 - lmp)*ms + lmp*ls
	const denom = ls - ms;
	if (denom <= 0) return 0;
	const lmp = (target - rSlng - milk0 * ms) / denom;
	const maxG = doseFor(opts.maxGramsPerKg, T);
	return Math.max(0, Math.min(maxG, lmp));
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
	const savory = input.savory ?? false;
	const saltDefaultKg = saltGramsPerKg(savory, input.kind);
	const saltOverride = Math.max(0, input.saltGrams ?? 0);
	const salt =
		savory && saltOverride > 0
			? saltOverride
			: doseFor(saltDefaultKg, targetTotal);
	const saltPac = pacPoints(salt, PAC_INDEX.salt, targetTotal);
	const desiredSugarPac = Math.max(0, pacTarget - alcoholPac - saltPac);
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
	const invertSolids = mode.useInvert && !preferSucrose ? scaled.highPac : 0;
	const invertDiy = invertSolids > 0 ? invertDiyFromSolids(invertSolids) : null;
	// Syrup weight into the mix (includes ~25% bound water).
	const invertedSugar = invertDiy?.syrupGrams ?? 0;
	const honey = mode.useHoney && !preferSucrose ? scaled.highPac : 0;

	const yogurt = targetTotal * params.yogurtFactor;
	const rf = INGREDIENT_DATA.ricotta.formula;
	const ricottaMilk: RicottaMilk = input.ricottaMilk ?? "cow";
	const ricottaPreset = rf[ricottaMilk];
	const ricottaFraction =
		input.kind === "ricotta"
			? Math.min(
					rf.maxFraction,
					Math.max(
						rf.minFraction,
						(input.ricottaPercent ?? rf.fractionOfMix * 100) / 100,
					),
				)
			: 0;
	const ricotta = targetTotal * ricottaFraction;
	const ricottaFatPercent = Math.max(
		0,
		input.ricottaFatPercent ?? ricottaPreset.fatPercent,
	);
	const ricottaSlngPercent = Math.max(
		0,
		input.ricottaSlngPercent ?? ricottaPreset.slngPercent,
	);
	const ricottaSolidsPercent = Math.max(
		0,
		input.ricottaSolidsPercent ?? ricottaPreset.solidsPercent,
	);
	const extraLemon = Math.max(0, input.extraLemonGrams ?? 0);
	// DIY invert lemon stays out of the ingredient list — process acid only.
	const lemonJuice = targetTotal * params.lemonPerKg + extraLemon;
	const eggYolk = Math.max(0, input.eggYolkGrams ?? 0);
	const invertNeutralize = input.invertNeutralize !== false;

	const nf = INGREDIENT_DATA.neutro.formula;
	const kindKey =
		input.kind === "sorbet"
			? "sorbet"
			: input.kind === "cream"
				? "cream"
				: input.kind === "yogurt"
					? "yogurt"
					: input.kind === "ricotta"
						? "ricotta"
						: "fruit";
	let neutroPerKg: number = nf.gramsPerKgByKind[kindKey];
	const isDairyWithAlcoholBump =
		kindKey === "cream" ||
		kindKey === "fruit" ||
		kindKey === "yogurt" ||
		kindKey === "ricotta";
	if (alcohol > 0 && isDairyWithAlcoholBump) {
		neutroPerKg = Math.max(neutroPerKg, nf.alcoholCreamGramsPerKg);
	}
	const formulaAcid = input.kind === "fruit_acid" || lemonJuice > 0;
	const invertResidualAcid = invertDiy != null && !invertNeutralize;
	const alcoholSorbetApplied = alcohol > 0 && input.kind === "sorbet";
	if (alcoholSorbetApplied) neutroPerKg *= 1 + nf.alcoholSorbetBump;
	const yolkNeutroEq =
		(eggYolk / INGREDIENT_DATA.eggYolk.formula.yolkGramsEach) *
		INGREDIENT_DATA.eggYolk.formula.neutroEquivalentPerYolkGrams;
	const neutroFrom = (perKg: number) =>
		Math.max(0, (perKg * targetTotal) / 1000 - yolkNeutroEq);
	const neutroBase = neutroFrom(neutroPerKg);
	const neutroAcid = neutroFrom(neutroPerKg * (1 + nf.acidBump));
	let acidApplied = formulaAcid;
	let neutro = neutroBase;
	if (formulaAcid) {
		neutro = neutroAcid;
	} else if (invertResidualAcid) {
		// Residual invert acidity: apply ×1.25 only if it moves neutro by ≥ 1 g.
		const delta = neutroAcid - neutroBase;
		if (delta >= 1) {
			neutro = neutroAcid;
			acidApplied = true;
		}
	}
	const extraPanna = Math.max(0, input.extraPannaGrams ?? 0);
	const extraWater = Math.max(0, input.extraWaterGrams ?? 0);

	const greekYogurt = input.greekYogurt ?? false;
	const yf = INGREDIENT_DATA.yogurt.formula;
	const yogurtFatPercent = Math.max(
		0,
		input.yogurtFatPercent ??
			(greekYogurt ? yf.greekDefaultFatPercent : yf.defaultFatPercent),
	);

	const fixedCore =
		fruit +
		yogurt +
		ricotta +
		sucrose +
		dextrose +
		invertedSugar +
		honey +
		lemonJuice +
		eggYolk +
		neutro +
		salt +
		alcohol +
		extraWater;

	const formulaPannaBase =
		input.kind === "yogurt"
			? pannaForMixFat({
					targetTotal,
					dairyGrams: yogurt,
					dairyFatPercent: yogurtFatPercent,
					fixedWithoutPanna: fixedCore,
					targetMixFatPercent: yf.targetMixFatPercent,
					creamFatPercent: yf.creamFatPercent,
					milkFatPercent: yf.milkFatPercent,
				})
			: input.kind === "ricotta"
				? pannaForMixFat({
						targetTotal,
						dairyGrams: ricotta,
						dairyFatPercent: ricottaFatPercent,
						fixedWithoutPanna: fixedCore,
						targetMixFatPercent: rf.targetMixFatPercent,
						creamFatPercent: rf.creamFatPercent,
						milkFatPercent: rf.milkFatPercent,
					})
				: targetTotal * params.pannaFactor;

	const lmpF = INGREDIENT_DATA.skimMilkPowder.formula;
	const skimMilkPowder =
		input.kind === "ricotta"
			? lmpForMixSlng({
					targetTotal,
					ricottaGrams: ricotta,
					ricottaSlngPercent,
					fixedWithoutMilkOrLmp: fixedCore + formulaPannaBase + extraPanna,
					targetMixSlngPercent: lmpF.targetMixSlngPercent,
					milkSlngPercent: lmpF.milkSlngPercent,
					lmpSolidsPercent: lmpF.solidsPercent,
					maxGramsPerKg: lmpF.maxGramsPerKg,
				})
			: 0;

	// Recompute panna with LMP in the fixed weight (LMP displaces milk fat).
	const formulaPanna =
		input.kind === "ricotta" && skimMilkPowder > 0
			? pannaForMixFat({
					targetTotal,
					dairyGrams: ricotta,
					dairyFatPercent: ricottaFatPercent,
					fixedWithoutPanna: fixedCore + skimMilkPowder,
					targetMixFatPercent: rf.targetMixFatPercent,
					creamFatPercent: rf.creamFatPercent,
					milkFatPercent: rf.milkFatPercent,
				})
			: formulaPannaBase;

	// Extras + alcohol count toward fixed weight so residual milk/water shrinks.
	const fixed = fixedCore + formulaPanna + extraPanna + skimMilkPowder;
	const residual = Math.max(0, targetTotal - fixed);
	const milk = params.liquid === "milk" ? residual : 0;
	const formulaWater = params.liquid === "water" ? residual : 0;

	const ingredients: RecipeIngredients = {
		fruit: round(fruit),
		yogurt: round(yogurt),
		ricotta: round(ricotta),
		milk: round(milk),
		skimMilkPowder: round(skimMilkPowder),
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
		if (
			alcohol > 0 &&
			isDairyWithAlcoholBump &&
			baseKg < nf.alcoholCreamGramsPerKg
		) {
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
	if (ingredients.yogurt > 0) {
		const kindLabel = greekYogurt ? "Yogurt greco" : "Yogurt";
		tips.push(
			`${kindLabel}: ${ingredients.yogurt} g (50% · ${yogurtFatPercent}% MG). Incorpora solo a ≤ 4°C dopo pastorizzazione — non scaldare (pH 4,2–4,6; fermenti e caseina). Panna bilanciata per grassi mix ~${yf.targetMixFatPercent}% (range ${TARGETS.fatsYogurt.min}–${TARGETS.fatsYogurt.max}%).${greekYogurt ? " Greco: più solidi/proteine, meno siero." : ""}`,
		);
	}
	if (ingredients.ricotta > 0) {
		const milkLabel = ricottaMilk === "sheep" ? "pecora" : "vaccina";
		const solidsSum = ricottaFatPercent + ricottaSlngPercent;
		const solidsNote =
			Math.abs(ricottaSolidsPercent - solidsSum) > 1
				? ` Attenzione: solidi totali (${ricottaSolidsPercent}%) ≠ MG+SLNG (${round(solidsSum, 1)}%).`
				: "";
		tips.push(
			`Ricotta ${milkLabel}: ${ingredients.ricotta} g (${round(ricottaFraction * 100, 0)}% · MG ${ricottaFatPercent}% · SLNG ${ricottaSlngPercent}% · solidi ${ricottaSolidsPercent}%). Aggiungi a freddo in mantecatura; omogeneizza col mixer. Panna bilanciata per ~${rf.targetMixFatPercent}% grassi.${solidsNote}`,
		);
		if (ingredients.skimMilkPowder > 0) {
			tips.push(
				`LMP: ${ingredients.skimMilkPowder} g (SLNG mix obiettivo ~${lmpF.targetMixSlngPercent}%; max ${lmpF.maxGramsPerKg} g/kg). Favorisce overrun (~35% tipico con ricotta).`,
			);
		}
		tips.push(
			`Inclusioni (fichi, cioccolato, …): ~${rf.inclusionGramsPerKg} g/kg a fine mantecatura; canditi/caramellati ammorbidiscono (zuccheri extra).`,
		);
	}
	if (ingredients.lemonJuice > 0 && params.liquid === "milk") {
		tips.push(
			"Aggiungi il succo di limone solo a freddo (≤ 2–4°C), preferibilmente in mantecatura a miscela già maturata — a pH < 5 la caseina precipita (taglio del latte).",
		);
	}
	if (invertDiy) {
		const diyAcid = `${invertDiy.lemonJuice} g limone (o ${invertDiy.citricAcid} g acido citrico)`;
		const diyCore = `Zucchero invertito: ${invertDiy.syrupGrams} g sciroppo (~${INVERT_SUGAR_DIY.solidsPercent}% solidi = ${invertDiy.solidsGrams} g; acqua legata ${invertDiy.waterInSyrup} g già sottratta da latte/acqua). Fai da te: ${invertDiy.sucrose} g saccarosio + ${invertDiy.processWater} g acqua + ${diyAcid} a ${INVERT_SUGAR_DIY.heatC[0]}–${INVERT_SUGAR_DIY.heatC[1]}°C`;
		if (invertNeutralize) {
			tips.push(
				`${diyCore}; a fine ${invertDiy.bicarbonate} g bicarbonato per neutralizzare.`,
			);
		} else {
			const invertBumped = acidApplied && !formulaAcid;
			tips.push(
				invertBumped
					? `${diyCore}. Acidità residua (non neutralizzata): neutro ×${1 + nf.acidBump}. Il limone/acido DIY non compare in lista ingredienti.`
					: `${diyCore}. Acidità residua non neutralizzata${formulaAcid ? ` (neutro già ×${1 + nf.acidBump} da acido in formula)` : " (effetto neutro < 1 g: ignorato)"}. Il limone/acido DIY non compare in lista ingredienti.`,
			);
			if (params.liquid === "milk") {
				tips.push(
					"Acidità residua nello sciroppo invertito con latte: rischio taglio della caseina — meglio neutralizzare col bicarbonato.",
				);
			}
		}
	}
	if (eggYolk > 0) {
		const yolkG = INGREDIENT_DATA.eggYolk.formula.yolkGramsEach;
		const yolks = round(eggYolk / yolkG, 1);
		tips.push(
			`Tuorlo: ≈ ${yolks} tuorli (≈ ${round(yolkNeutroEq, 1)} g neutro sostituiti). Coagula a ~65°C — non superare in pastorizzazione.`,
		);
	}
	if (savory) {
		const sf = INGREDIENT_DATA.salt.formula;
		const perKg = round((salt * 1000) / targetTotal, 2);
		tips.push(
			input.kind === "sorbet"
				? `Sale gastronomico: ${ingredients.salt} g (≈ ${perKg} g/kg; tipico ${sf.gramsPerKgSavorySorbet} g/kg). PAC 100 — riservato nel bilancio zuccheri.`
				: `Sale gastronomico: ${ingredients.salt} g (≈ ${perKg} g/kg; range ${sf.gramsPerKgSavoryCreamMin}–${sf.gramsPerKgSavoryCreamMax} g/kg). PAC 100 — riservato nel bilancio zuccheri.`,
		);
	}

	const pac = computePacBalance({
		tempKey,
		mixGrams: actualTotal,
		sucrose: ingredients.sucrose,
		dextrose: ingredients.dextrose,
		honey: ingredients.honey,
		// PAC on sugar solids, not full syrup weight.
		invertedSugar: invertDiy?.solidsGrams ?? 0,
		lemonJuice: ingredients.lemonJuice,
		salt: ingredients.salt,
		alcoholGrams: ingredients.alcohol,
		abvPercent: abv,
	});

	const pod = podPercent(actualTotal, {
		sucrose: ingredients.sucrose,
		dextrose: ingredients.dextrose,
		honey: ingredients.honey,
		invertedSugar: invertDiy?.solidsGrams ?? 0,
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
		invertDiy,
	};
}

/** Filename slug: lowercase, no accents, spaces → `-`. */
export function recipeSlug(raw: string): string {
	const s = raw
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return s || "ricetta";
}

export function recipeFilename(
	name: string | undefined,
	kind: RecipeKind,
	targetTotal: number,
): string {
	const kindLabel = KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
	const base = name?.trim()
		? recipeSlug(name)
		: `ricetta-${recipeSlug(kindLabel)}`;
	return `${base}-${Math.round(targetTotal)}g.txt`;
}

export type RecipeExportOpts = {
	name?: string;
	result: RecipeResult;
	tempKey: ServiceTempKey;
	savory: boolean;
	alcoholAbv: number;
	greekYogurt: boolean;
	yogurtFatPercent: number;
	ricottaMilk: RicottaMilk;
	ricottaPercent: number;
	ricottaFatPercent: number;
	ricottaSlngPercent: number;
	ricottaSolidsPercent: number;
	/** Casein advice grams; omit or 0 to skip the line. */
	caseinGrams?: number;
	/** Only meaningful when sugarMode is inverted. */
	invertNeutralize?: boolean;
};

/** Compact lab text: header + formula settings + ingredient doses. */
export function formatRecipeText(opts: RecipeExportOpts): string {
	const { result } = opts;
	const kindLabel =
		KIND_OPTIONS.find((o) => o.value === result.kind)?.label ?? result.kind;
	const temp = SERVICE_TEMP[opts.tempKey];
	const sugar = SUGAR_MODES[result.sugarMode];
	const lines: string[] = [];

	if (opts.name?.trim()) lines.push(opts.name.trim());
	lines.push(`Tipo: ${kindLabel}`);
	lines.push(`Miscela: ${result.targetTotal} g`);
	lines.push(`Servizio: ${temp.label}`);
	lines.push(`Zuccheri: ${sugar.label}`);

	if (opts.savory) lines.push("Salato: sì");
	if (result.ingredients.alcohol > 0 && opts.alcoholAbv > 0) {
		lines.push(`Alcol: ${opts.alcoholAbv}%`);
	}
	if (result.kind === "yogurt") {
		lines.push(`Yogurt: ${opts.yogurtFatPercent}% MG`);
	}
	if (result.kind === "ricotta") {
		const milk = opts.ricottaMilk === "sheep" ? "pecora" : "vaccina";
		lines.push(
			`Ricotta: ${milk} · ${opts.ricottaPercent}% mix · ${opts.ricottaFatPercent}% MG · ${opts.ricottaSlngPercent}% SLNG · ${opts.ricottaSolidsPercent}% solidi`,
		);
	}
	if (result.sugarMode === "inverted") {
		lines.push(
			opts.invertNeutralize
				? "Invertito: neutralizzato (bicarbonato)"
				: "Invertito: acidità residua",
		);
	}

	const rows: { label: string; grams: number }[] = [];
	for (const { key, label } of INGREDIENT_ROWS) {
		const grams = result.ingredients[key];
		if (grams <= 0) continue;
		const rowLabel =
			key === "yogurt"
				? `${opts.greekYogurt ? "Yogurt greco" : "Yogurt"} (${opts.yogurtFatPercent}% MG)`
				: key === "ricotta"
					? `Ricotta ${opts.ricottaMilk === "sheep" ? "pecora" : "vaccina"} (${opts.ricottaFatPercent}% MG)`
					: label;
		rows.push({ label: rowLabel, grams });
	}
	if (opts.caseinGrams && opts.caseinGrams > 0) {
		rows.push({ label: "Caseina (consigliata)", grams: opts.caseinGrams });
	}

	const width = Math.max(...rows.map((r) => r.label.length), 8);
	lines.push("—");
	for (const row of rows) {
		lines.push(`${row.label.padEnd(width)}  ${row.grams} g`);
	}
	return `${lines.join("\n")}\n`;
}

export function downloadTextFile(filename: string, text: string): void {
	const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/** Self-check — run: npx tsx -e "import { __selfCheck } from './src/components/gelato-recipe-maker/lib.ts'; __selfCheck()" */
export function __selfCheck() {
	const assert = (ok: boolean, msg: string) => {
		if (!ok) throw new Error(msg);
	};
	assert(recipeSlug("Limone Basilico!") === "limone-basilico", "slug");
	assert(
		recipeSlug("Frutta acida (pH < 5)") === "frutta-acida-ph-5",
		"slug kind",
	);
	assert(
		recipeFilename("Limone", "fruit_acid", 1100) === "limone-1100g.txt",
		"named file",
	);
	assert(
		recipeFilename("", "cream", 1000) === "ricetta-base-bianca-1000g.txt",
		"auto file",
	);
	const result = generateRecipe({
		kind: "cream",
		totalGrams: 1000,
		tempKey: "professional",
		sugarMode: "blend",
	});
	const text = formatRecipeText({
		name: "Test",
		result,
		tempKey: "professional",
		savory: false,
		alcoholAbv: 40,
		greekYogurt: false,
		yogurtFatPercent: 3.5,
		ricottaMilk: "cow",
		ricottaPercent: 20,
		ricottaFatPercent: 11,
		ricottaSlngPercent: 7,
		ricottaSolidsPercent: 25,
	});
	assert(text.includes("Tipo: Base bianca"), "kind header");
	assert(text.includes("Miscela: 1000 g"), "target weight");
	assert(text.includes("Latte"), "ingredient row");
	assert(!text.includes("Caseina"), "no casein by default");
	console.log("gelato-recipe-maker self-check ok");
}
