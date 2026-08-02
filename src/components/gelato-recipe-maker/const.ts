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
		label: "Professionale (−12°C)",
	},
	home: {
		celsius: -18 as const,
		pacTarget: 410,
		label: "Freezer di casa (−18°C)",
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
	/** Lemon juice ≈ 5% natural sugars; 100 g → 5 PAC on a 1 kg mix. */
	lemonJuice: 5,
} as const;

/** Relative POD (sweetening power); sucrose = 100. */
export const POD_INDEX = {
	sucrose: 100,
	dextrose: 70,
	invertedSugar: 130,
	/** Honey ≈ invert sugar sweetness. */
	honey: 130,
	lactose: 16,
	/** Lemon juice: 100 g → 5 POD on a 1 kg mix. */
	lemonJuice: 5,
} as const;

/**
 * Sugar strategies. Default `blend` keeps KIND.sucroseShare (80/20 creams, 70/30 sorbet).
 * Sucrose alone has PAC:POD = 1:1 — impossible to hit PAC 410 (−18°C) without ~41% sugar.
 */
export const SUGAR_MODES = {
	blend: {
		label: "Saccarosio + destrosio (consigliato)",
		sucroseOnly: false,
		useHoney: false,
		useInvert: false,
		hint: "Destrosio PAC 190 / POD 70 — alza la resistenza al gelo senza dolcezza stucchevole.",
	},
	inverted: {
		label: "Saccarosio + zucchero invertito",
		sucroseOnly: false,
		useHoney: false,
		useInvert: true,
		hint: "Invertito PAC 190 / POD 130 — scoop più morbido del solo saccarosio; più dolce del destrosio.",
	},
	honey: {
		label: "Saccarosio + miele",
		sucroseOnly: false,
		useHoney: true,
		useInvert: false,
		hint: "Miele ≈ invertito (PAC 190 / POD 130). Preferisci acacia per un sapore più delicato.",
	},
	common: {
		label: "Solo zucchero comune (saccarosio)",
		sucroseOnly: true,
		useHoney: false,
		useInvert: false,
		/** Creams 17–18%; sorbets 22–24% — edible sweetness, not full −18°C PAC. */
		creamSugarFactor: 0.175,
		sorbetSugarFactor: 0.23,
		hint: "PAC:POD = 1:1 — non si raggiunge il PAC del freezer senza un gusto stucchevole. Preferisci destrosio, invertito o alcol.",
	},
} as const;

export type SugarMode = keyof typeof SUGAR_MODES;

/** DIY invert-sugar procedure (shown when sucrose-only or invert mode). */
export const INVERT_SUGAR_HOWTO = {
	summary:
		"Lo zucchero invertito spezza il saccarosio in glucosio + fruttosio: PAC 190 (vs 100) e blocca la cristallizzazione.",
	steps: [
		"Sciogli il saccarosio in acqua e scalda con un po' di acido (acido citrico, cremor tartaro o succo di limone).",
		"Acido + calore spezzano il saccarosio in glucosio e fruttosio.",
		"Formula semplice: scalda una soluzione zucchero–acqua a 80°C con un pizzico di acido citrico; ~30 min → >90% di inversione, ok per uso domestico.",
	],
} as const;

/** Mix / pasteurization / maturation procedure (shown below PAC balance). */
export const MIX_PROCEDURE = {
	title: "Procedura di miscelazione",
	stages: [
		{
			title: "1. Ordine di miscelazione",
			points: [
				"Prima i liquidi freddi: versa latte e panna.",
				"Incorpora le polveri (zuccheri, latte in polvere) ancora a freddo; agita con forza per evitare grumi.",
				"Stabilizzante (neutro / xantano): mescola con un po' di zucchero e aggiungi intorno ai 40°C così si disperde invece di galleggiare sul vapore.",
			],
		},
		{
			title: "2. Riscaldare a 85°C (pastorizzazione alta)",
			points: [
				"Porta la miscela a 85°C; inizia a raffreddare subito o dopo pochi secondi (niente sosta lunga).",
				"Non solo sanificazione: attiva neutri/stabilizzanti (idratazione ottimale sopra ~80–82°C), emulsiona i grassi, scioglie gli zuccheri in modo uniforme e idrata le proteine del latte così legano l'acqua libera.",
			],
		},
		{
			title: "3. Raffreddamento rapido 85°C → 4°C",
			points: [
				"Raffredda il più in fretta possibile — idealmente sotto 1 ora (riscaldamento + raffreddamento insieme sotto ~2 ore).",
				"45°C → 15°C è la finestra batterica critica; attraversala il più in fretta possibile.",
			],
		},
		{
			title: "4. Maturazione (6–12 h a 4°C)",
			points: [
				"Riposa in frigo 6–12 ore (alcuni testi arrivano fino a 14).",
				"I grassi cristallizzano, le proteine finiscono di idratarsi, gli stabilizzanti legano l'acqua libera → scoop più cremoso, meno cristalli di ghiaccio grandi, overrun migliore.",
			],
		},
		{
			title: "5. Mantecazione e timing della frutta",
			points: [
				"Carica il mantecatore a ≤ 4°C così conservi l'aria costruita in maturazione.",
				"Frutta acida (pH < 5): aggiungi alla fine, preferibilmente in mantecatura quando la base è sotto ~2°C — il freddo ferma la precipitazione della caseina («taglio»).",
				"Frutta che imbrunisce (banana, pesca): incorpora per ultima e manteca subito per mantenere il colore.",
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
	/** Increase neutro/stabilizer vs normal dose. */
	stabilizerBump: 0.25,
	/** Prefer sucrose (PAC 100); avoid high-PAC sugars (dextrose, invert). */
	preferSucrose: true,
} as const;

/**
 * Pure casein (sodium caseinate spray) — advice only, not an ingredient line.
 * Toggle defaults on with alcohol; chocolate tip lives on flavor rows.
 */
export const CASEIN_ADVICE = {
	gramsPerKg: 20,
	alcoholTip:
		"L'alcol disattiva le proteine e ostacola l'overrun; la caseina (caseinati sodici spray) compensa, trattiene l'alcol e mantiene la struttura sollevata.",
	chocolateTip:
		"Consiglio caseina (~20 g/kg): il cacao apporta molti solidi; alleggerisce la struttura e facilita l'aria.",
	acidWarning:
		"La caseina precipita sotto pH 5 (o 4,5). Con frutta acida/agrumi: aggiungi la parte acida solo a freddo o in mantecatura.",
} as const;

/**
 * Lemon juice: displaces milk/water, tiny PAC/POD, acids cut stabilizer power.
 * Add cold (≤ 2–4°C) on milk mixes — casein precipitates below pH 5 when warm.
 */
export const LEMON_MIX_TWEAKS = {
	/** +25% xanthan for each 2.5% of mix that is lemon juice. */
	stabilizerBumpPerStep: 0.25,
	lemonPercentPerStep: 2.5,
	/** Typical dose when a sweet-fruit recipe calls for lemon (g/kg). */
	typicalGramsPerKg: 35,
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
		label: "Frutta acida (pH < 5)",
		hint: "Susine, fragole, frutti di bosco — frutta in mantecatura a miscela fredda",
	},
	{
		value: "fruit_sweet",
		label: "Frutta dolce (pH > 5)",
		hint: "Banana, mango, fichi — mischia la frutta con la base prima di mantecare",
	},
	{
		value: "cream",
		label: "Base bianca (crema)",
		hint: "Senza frutta — imposta il peso desiderato della miscela",
	},
	{
		value: "sorbet",
		label: "Sorbetto",
		hint: "Base frutta + acqua, zuccheri più alti",
	},
];

export const INGREDIENT_ROWS = [
	{ key: "fruit", label: "Frutta" },
	{ key: "milk", label: "Latte" },
	{ key: "sucrose", label: "Saccarosio" },
	{ key: "dextrose", label: "Destrosio" },
	{ key: "invertedSugar", label: "Zucchero invertito" },
	{ key: "honey", label: "Miele" },
	{ key: "panna", label: "Panna (35%)" },
	{ key: "water", label: "Acqua" },
	{ key: "lemonJuice", label: "Succo di limone" },
	{ key: "xanthan", label: "Xantano" },
	{ key: "salt", label: "Sale" },
	{ key: "alcohol", label: "Alcol" },
] as const;

export const FLAVOR_ROWS: {
	key: keyof typeof BASE_BIANCA_FLAVORS;
	label: string;
	note?: string;
}[] = [
	{
		key: "coffeeFreezeDried",
		label: "Caffè (liofilizzato)",
		note: "Aggiungi in riscaldamento; sottrai lo stesso peso dal latte",
	},
	{
		key: "espresso",
		label: "Espresso",
		note: "Sostituisci lo stesso peso di latte",
	},
	{
		key: "vanillaPods",
		label: "Baccelli di vaniglia",
		note: "Apri e raschia; infondi in riscaldamento, filtra dopo la maturazione",
	},
	{
		key: "spices",
		label: "Spezie (es. cannella)",
		note: "Infondi i bastoncini nel latte caldo",
	},
	{
		key: "cocoaPowder_22_24",
		label: "Cacao in polvere 22/24",
		note: `Sostituisci lo stesso peso di latte. ${CASEIN_ADVICE.chocolateTip}`,
	},
	{
		key: "chocolateCouverture70",
		label: "Cioccolato couverture 70%",
		note: `Alto grasso — spesso riduci panna/latte e usa acqua. ${CASEIN_ADVICE.chocolateTip}`,
	},
	{
		key: "stracciatella",
		label: "Stracciatella",
		note: "Aggiungi a fine mantecatura (filo fuso o scaglie)",
	},
	{
		key: "nuts",
		label: "Frutta secca (trita / candita)",
		note: "Incorpora durante la mantecatura",
	},
	{
		key: "candiedFruit",
		label: "Frutta candita",
		note: "Aggiungi in mantecatura; valuta la riduzione zuccheri sotto",
	},
	{
		key: "eggYolk",
		label: "Tuorlo d'uovo (base uova)",
		note: "Trasforma la base bianca in mantecato; sostituisci il latte",
	},
	{
		key: "catalanaCaramel",
		label: "Caramello crema catalana",
		note: "Su base uova; aggiungi pezzi a fine mantecatura",
	},
	{
		key: "sugaryInclusionSugarCut",
		label: "Riduzione zuccheri (inclusioni dolci)",
		note: "Riduci gli zuccheri di base con canditi / uvetta / caramello",
	},
];

export const fieldClass =
	"mt-1 w-full border border-[rgb(var(--page-border))] bg-[rgb(var(--header))] px-3 py-2 text-base text-[rgb(var(--text-color))] outline-none focus-visible:border-[rgb(var(--brand))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand)/0.25)]";

export const labelClass =
	"block text-sm font-medium text-[rgb(var(--text-title))]";
