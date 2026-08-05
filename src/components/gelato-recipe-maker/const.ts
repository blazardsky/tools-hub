/** Gelato balancing constants. All weights in grams. */

export const FRUIT_TO_TOTAL = 2.2;

/** Target ranges (informational + sugar/PAC optimizer). */
export const TARGETS = {
	fruitPercent: { min: 35, max: 50 },
	sugarsCream: { min: 18, max: 22 },
	sugarsSorbet: { min: 25, max: 30 },
	fatsCream: { min: 6, max: 10 },
	/** Yogurt base: lower fat so yogurt aroma isn’t masked. */
	fatsYogurt: { min: 4, max: 6 },
	/** Ricotta / fresh cheese in mix. */
	ricottaPercent: { min: 15, max: 25 },
} as const;

/** |PAC − target| within this → “in target”. */
export const PAC_TOLERANCE = 10;

/**
 * Alert thresholds for mix shares (% of final mix).
 * Water = total water from all ingredients (not only added water).
 * Fats: protocol §6 patina risk >10–12%.
 * ponytail: placeholder cutoffs — tune after tasting tests.
 */
export const ADDITIVE_ALERTS = {
	panna: { warn: 15, high: 25 },
	alcohol: { warn: 2, high: 5 },
	/** Total water content; typical gelato ~55–65%. */
	water: { warn: 68, high: 75 },
	/** Total dairy fat % of mix. */
	fats: { warn: 10, high: 12 },
} as const;

/**
 * Approx lactose fraction (protocol: milk 4%; LMP ~50%).
 * Used for water:lactose ≥ 6:1 sandiness check.
 */
export const LACTOSE_FRACTION = {
	milk: 0.04,
	yogurt: 0.04,
	/** Cream ~35% MG. */
	panna: 0.03,
	skimMilkPowder: 0.5,
	/** Rough; lactose is a slice of ricotta SLNG. */
	ricotta: 0.03,
} as const;

/** Minimum free water : lactose (below → sabbiosità tip). */
export const MIN_WATER_TO_LACTOSE = 6;

/**
 * Fat fraction of fixed dairy lines (yogurt/ricotta MG from recipe inputs).
 */
export const FAT_FRACTION = {
	milk: 0.036,
	panna: 0.35,
	eggYolk: 0.32,
} as const;

/**
 * Water fraction of recipe lines (mix water %).
 * Alcohol: use (100 − ABV) / 100; default ABV 40% → 0.6.
 * Ricotta: 1 − solids%/100 (from recipe inputs).
 * Dextrose monohydrate ~9% water (PAC/POD still on sugar solids).
 */
export const WATER_FRACTION = {
	milk: 0.875,
	yogurt: 0.865,
	lemonJuice: 0.95,
	/** Cream ~35% MG. */
	panna: 0.6,
	water: 1,
	honey: 0.19,
	/** Finished invert syrup ~75% solids. */
	invertedSugar: 0.25,
	/** Monohydrate ~9% crystallization water. */
	dextrose: 0.09,
	eggYolk: 0.48,
	fruit: 0.85,
	skimMilkPowder: 0.04,
	/** Default when ABV not set. */
	alcoholDefaultAbv: 40,
} as const;

/**
 * Base bianca flavor doses per kg of mix (typically calculated on 1000g).
 * Dissolving flavors: subtract the same weight from milk to keep total.
 * Inclusions: add during/at end of churn — do not displace milk.
 * Keep in sync with INGREDIENT_DATA.formula.gramsPerKg for cocoa/couverture/egg/nuts.
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
	/** Crema catalana: caramel pieces at end of churn (with egg-yolk emulsified base). */
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

/**
 * Canonical ingredient data — source of truth for formula PAC/POD and key doses.
 * `pac`/`pod` may be a number, a [min,max] range (display), or null.
 * `formula` holds values the calculator uses (overrides when pac/pod is a range).
 */
export const INGREDIENT_DATA = {
	sucrose: {
		label: "Saccarosio",
		role: "Dolcificante, strutturante, controllo temperatura di congelamento",
		pod: 100,
		pac: 100,
		solidsPercent: 100,
		notes:
			"Zucchero di riferimento (disaccaride); cristallizza a basse temperature; ottima solubilità (204 g in 100 g acqua a 20°C); 4 kcal/g. Nei liquori si preferisce quasi solo saccarosio (PAC 100 < destrosio/invertito 190) per non far sciogliere il gelato.",
		dosage:
			"Creme: dolcezza rif. ~18%, zuccheri totali 17–22% (formula ~18%; sola saccarosio ~17,5%). Sorbetti: +5–8% vs creme → 22–25% (fino al 30%; formula ~25%; sola saccarosio ~23%). Liquore: ~15–16% quasi solo saccarosio. Share formula 80% creme / 70% sorbetto (100% se sola saccarosio o con alcol).",
	},
	dextrose: {
		label: "Destrosio (glucosio)",
		role: "Anticristallizzante, anticongelante, riduzione dolcezza",
		pod: [70, 80] as const,
		pac: [180, 190] as const,
		solidsPercent: [91, 100] as const,
		notes:
			"Monosaccaride da mais; polvere molto solubile; effetto rinfrescante; zucchero riducente; abbassa il punto di congelamento. Max ~25% del totale zuccheri per non abbassare troppo il punto di congelamento. Indice di lavoro POD 70 / PAC 190.",
		dosage:
			"Formula blend: resto dopo saccarosio (20% creme / 30% sorbetto degli zuccheri). Vetrina (−11/−12°C): spesso ~20 g/kg (2%). Freezer casa (−18°C): fino a ~137–150 g/kg (13–15%) per alzare il PAC senza dolcezza eccessiva. Fonti: 5–10% del mix come range generico.",
		formula: { pac: 190, pod: 70 },
	},
	invertedSugar: {
		label: "Zucchero invertito",
		role: "Anticristallizzante, ammorbidificante, umettante",
		pod: 130,
		pac: 190,
		solidsPercent: [70, 80] as const,
		notes:
			"Sciroppo di glucosio e fruttosio; alta igroscopicità; ritarda l'ossidazione; solubilità superiore al saccarosio. Evita cristallizzazione di saccarosio e lattosio; mantiene il gelato più plastico e morbido. Indice di lavoro POD 130 / PAC 190.",
		dosage:
			"5–15% del totale zuccheri (max 20–25%). In formula: sostituisce la quota destrosio in modalità invertito.",
	},
	fructose: {
		label: "Fruttosio (levulosio)",
		role: "Edulcorante intenso, umettante",
		pod: [120, 170] as const,
		pac: 190,
		solidsPercent: 100,
		notes:
			"Zucchero della frutta; altamente solubile e igroscopico; esalta i sapori di frutta; basso indice glicemico. Indice di lavoro POD 145 / PAC 190 (non ancora in formula).",
		dosage: "Ridotto rispetto al saccarosio; dosi limitate",
		formula: { pac: 190, pod: 145 },
	},
	honey: {
		label: "Miele",
		role: "Aromatizzante, zucchero invertito naturale",
		pod: [100, 130] as const,
		pac: 190,
		solidsPercent: [80, 82] as const,
		notes:
			"Composizione simile allo zucchero invertito; sapore caratteristico; pH acido (~4). Indice di lavoro POD 130 / PAC 190 (come invertito).",
		dosage:
			"Per aromatizzare e conferire morbidezza. In formula: sostituisce la quota destrosio in modalità miele.",
		formula: { pac: 190, pod: 130 },
	},
	lactose: {
		label: "Lattosio",
		role: "Assorbimento acqua, strutturante",
		pod: [15, 40] as const,
		pac: 100,
		solidsPercent: 100,
		notes:
			"Zucchero del latte poco solubile; solubilità pratica ~1:6 acqua:lattosio (sotto → sabbiosità). Indice di lavoro POD 40 / PAC 100 (non dosato in formula).",
		dosage:
			"Apportato dai derivati del latte (SLNG); limitare per evitare difetti. Non dosato in ricetta; con latte senza lattosio tip UI −10% zuccheri se il mix risulta morbido/dolce.",
		formula: {
			pac: 100,
			pod: 40,
		},
	},
	glucoseAtomized42DE: {
		label: "Glucosio atomizzato 42 DE",
		role: "Strutturante, controllo consistenza",
		pod: [40, 50] as const,
		pac: 90,
		solidsPercent: 100,
		notes:
			"Polvere di mais; bilancia la consistenza e previene la cristallizzazione superficiale. Indice di lavoro POD 45 / PAC 90 (non in formula).",
		dosage: "Per bilanciare la struttura",
		formula: {
			pac: 90,
			pod: 45,
		},
	},
	glucoseAtomized52DE: {
		label: "Glucosio atomizzato 52 DE",
		role: "Strutturante, controllo PAC",
		pod: 58,
		pac: 110,
		solidsPercent: 100,
		notes:
			"Polvere sottile e secca di mais; intermedio tra sciroppo e destrosio.",
		dosage: "Varia per ammorbidire o indurire il gelato",
	},
	glucoseAtomized21DE: {
		label: "Glucosio atomizzato 21 DE",
		role: "Riduzione overrun (antischiumogeno)",
		pod: 10,
		pac: 20,
		solidsPercent: 100,
		notes: "Alto contenuto di amido; rende il mix più pesante e denso.",
		dosage: "5%–20% nei gelati al liquore",
	},
	glucoseSyrup: {
		label: "Sciroppo di glucosio / mais",
		role: "Strutturante, anticristallizzante",
		pod: [40, 60] as const,
		pac: null,
		solidsPercent: [80, 100] as const,
		notes:
			"Liquido denso o polvere; maltosio e destrine; migliora conservabilità e corpo. PAC varia con il DE.",
		dosage: "4%–6% (solidi) o sostituzione 20–30% saccarosio",
	},
	maltose: {
		label: "Maltosio",
		role: "Sapore caratteristico, brunimento",
		pod: 50,
		pac: 100,
		solidsPercent: 100,
		notes: "Presente nello sciroppo di malto; zucchero riducente.",
		dosage: "In sciroppi o estratti di malto",
	},
	trehalose: {
		label: "Trealosio",
		role: "Ritardo ricristallizzazione ghiaccio",
		pod: [10, 14] as const,
		pac: null,
		solidsPercent: 100,
		notes:
			"Zucchero non riducente; basso indice glicemico; previene la denaturazione delle proteine. Indice di lavoro POD 12.",
		dosage: null,
		formula: {
			pod: 12,
		},
	},
	inulin: {
		label: "Inulina",
		role: "Fibra, sostituto dei solidi",
		pod: 10,
		pac: null,
		solidsPercent: null,
		notes:
			"Fibra di cicoria (prebiotico); ideale per sorbetti e gelati ipocalorici o alcolici. PAC basso.",
		dosage: "Fino al 12%",
		formula: {
			pod: 10,
		},
	},
	wholeMilk: {
		label: "Latte intero",
		role: "Base liquida, apporto grassi e proteine",
		pod: null,
		pac: 4,
		solidsPercent: [12, 13] as const,
		notes:
			"~87–88% acqua, 3,6% grassi, 3,3% proteine; apporta calcio e nutrienti. PAC 4 in indice ma non contato nel bilancio formula.",
		dosage: "Q.b. residuo (creme / frutta); non conta nel bilancio PAC",
	},
	skimMilkPowder: {
		label: "Latte magro in polvere (LMP)",
		role: "Strutturante, ritenzione acqua (ossatura)",
		pod: null,
		pac: 50,
		solidsPercent: [95, 100] as const,
		notes: "Proteine 36–38%, lattosio 50–51%; favorisce l'overrun.",
		dosage: "Max 10% del mix; SLNG tra 7,5% e 11,5%",
		formula: {
			solidsPercent: 96,
			maxGramsPerKg: 100,
			/** Mix SLNG target mid-range for overrun/structure. */
			targetMixSlngPercent: 9.5,
			/** Approx SNF of whole milk. */
			milkSlngPercent: 9,
		},
	},
	cream35: {
		label: "Panna (35–40% MG)",
		role: "Apporto materia grassa, cremosità",
		pod: null,
		pac: 3,
		solidsPercent: [40, 50] as const,
		notes:
			"Emulsione di grassi lattei; untuosità, palatabilità e resistenza alla fusione. I grassi non influenzano direttamente il PAC (non sono in soluzione vera, ma in emulsione). Target grassi totali ideale ~8% (range 6–10%); creme alla frutta / yogurt 4–6% per non coprire aroma e freschezza; sorbetti 0%.",
		dosage:
			"Formula: 12% frutta / 17% base bianca / 6% yogurt / panna ridotta con ricotta / 0% sorbetto (+ extra opzionale). Obiettivo grassi mix ~8% (6–10%); frutta/yogurt 4–6%.",
	},
	yogurt: {
		label: "Yogurt",
		role: "Gusto e acidità; sostituisce gran parte del latte",
		pod: null,
		pac: null,
		solidsPercent: [12, 15] as const,
		notes:
			"~85–88% acqua, pH 4,2–4,6. A pH < 5 la caseina del latte precipita («taglio») se scaldato — non riscaldare mai lo yogurt. Dose ideale 50% della miscela (500 g/kg) per sapore intenso. Conserva i fermenti lattici solo a freddo.",
		dosage:
			"500 g/kg (50% della miscela); incorpora solo a ≤ 4°C dopo pastorizzazione",
		formula: {
			fractionOfMix: 0.5,
			/** Default MG % if user doesn’t override. */
			defaultFatPercent: 3.5,
			greekDefaultFatPercent: 5,
			/** Mid of TARGETS.fatsYogurt — panna scales to hit this. */
			targetMixFatPercent: 5,
			creamFatPercent: 35,
			milkFatPercent: 3.6,
		},
	},
	ricotta: {
		label: "Ricotta",
		role: "Gusto formaggio fresco; grassi, SLNG e solidi totali",
		pod: null,
		pac: null,
		solidsPercent: [20, 30] as const,
		notes:
			"Non pastorizzare con la base: aggiungi a freddo in mantecatura (o dopo maturazione), poi omogeneizza con mixer. Proteine utili all'overrun (~35%). Vaccina tipica 10–13% MG; pecora 15–20%. Dose 15–25% della miscela.",
		dosage:
			"150–250 g/kg (15–25%); a freddo dopo maturazione; mixer prima della gelatiera",
		formula: {
			fractionOfMix: 0.2,
			minFraction: 0.15,
			maxFraction: 0.25,
			/** Keep cream ideal ~8%; panna drops as ricotta fat rises. */
			targetMixFatPercent: 8,
			creamFatPercent: 35,
			milkFatPercent: 3.6,
			cow: { fatPercent: 11, slngPercent: 11, solidsPercent: 22 },
			sheep: { fatPercent: 17, slngPercent: 12, solidsPercent: 29 },
			inclusionGramsPerKg: 100,
		},
	},
	butter: {
		label: "Burro",
		role: "Apporto di grassi",
		pod: 0,
		pac: 0,
		solidsPercent: [82, 84] as const,
		notes: "Grasso del latte concentrato; cremosità e formazione dell'overrun.",
		dosage: "Per bilanciare la quota grassa",
	},
	eggYolk: {
		label: "Tuorlo d'uovo",
		role: "Emulsionante naturale (neutro), legante, colorante",
		pod: 0,
		pac: 0,
		solidsPercent: [50, 56] as const,
		notes:
			"Grazie alla lecitina lega grassi e acqua — non è un gusto, è un ingrediente funzionale. Coagula a ~65°C. 1 tuorlo ≈ 20 g ≈ 2 g di neutro emulsionante (riduce la dose di neutro in formula). Minimo legale ~40 g/kg (4%) per «Mantecato».",
		dosage:
			"Come crema «all'uovo»: 80–100 g/kg (~4–5 tuorli). Solo emulsione (senza altri emulsionanti): basta meno — almeno 3 tuorli/kg (≈60 g) — e riduce il neutro. Supporto in ricette complesse (cioccolato / frutta secca): 20–30 g/kg.",
		formula: {
			gramsPerKg: 100,
			yolkGramsEach: 20,
			minYolksPerKgForEmulsion: 3,
			neutroEquivalentPerYolkGrams: 2,
			neutroGramsPerKgMin: 80,
			neutroGramsPerKgMax: 100,
		},
	},
	/** Commercial stabilizer blend — formula-dosed (replaces xanthan auto-dose). */
	neutro: {
		label: "Neutro",
		role: "Stabilizzante / emulsionante (miscela commerciale)",
		pod: 0,
		pac: 0,
		solidsPercent: 100,
		notes:
			"Pesatura precisa. Mescola a secco con ~10× saccarosio; attiva a 82–85°C. Il tuorlo sostituisce ~2 g di neutro per tuorlo.",
		dosage:
			"6 g/kg crema · 7 g/kg frutta · 8 g/kg yogurt/ricotta · 5 g/kg sorbetto; ×1,25 se acido; alcol+crema/frutta → 8 g/kg; alcol+sorbetto → ×1,25",
		formula: {
			gramsPerKgByKind: {
				cream: 6,
				fruit: 7,
				yogurt: 8,
				ricotta: 8,
				sorbet: 5,
			},
			alcoholCreamGramsPerKg: 8,
			acidBump: 0.25,
			alcoholSorbetBump: 0.25,
		},
	},
	locustBeanGum: {
		label: "Farina di semi di carrube (E410)",
		role: "Stabilizzante, addensante",
		pod: 0,
		pac: 0,
		solidsPercent: 100,
		notes:
			"Polisaccaride idrofilo; si scioglie solo a caldo; riduce la crescita dei cristalli di ghiaccio.",
		dosage: "0,1%–0,5% (fino a 1% in miscela)",
	},
	guarGum: {
		label: "Gomma di guar (E412)",
		role: "Stabilizzante, addensante",
		pod: 0,
		pac: 0,
		solidsPercent: 100,
		notes: "Solubile a freddo; stabile in ambienti acidi; ideale per HTST.",
		dosage: "0,15%–0,20%",
	},
	/** Sheet reference only — not formula-dosed (use neutro in recipe). */
	xanthan: {
		label: "Gomma xantano (E415)",
		role: "Addensante, stabilizzante",
		pod: 0,
		pac: 0,
		solidsPercent: null,
		notes:
			"Uso domestico / componente di neutri. Resiste a pH acidi; struttura cremosa. ≠ neutro commerciale auto-dosato in formula. Max tipico ~0,2% del mix.",
		dosage:
			"0,15% frutta / 0,6% base bianca / 0,5% sorbetto (riferimento; in ricetta usa Neutro)",
		formula: {
			factorByKind: {
				fruit_acid: 0.0015,
				fruit_sweet: 0.0015,
				cream: 0.006,
				sorbet: 0.005,
			},
			maxPercent: 0.2,
		},
	},
	carrageenan: {
		label: "Carragenina",
		role: "Stabilizzante secondario",
		pod: 0,
		pac: 0,
		solidsPercent: 100,
		notes:
			"Previene la separazione del siero (wheying off); sinergica con altre gomme.",
		dosage: "Minime dosi in miscele stabilizzanti",
	},
	agarAgar: {
		label: "Agar-agar",
		role: "Gelificante",
		pod: 0,
		pac: 0,
		solidsPercent: null,
		notes: "Estratto da alghe rosse; si scioglie a 65–75°C; forma gel densi.",
		dosage: "0,15%–0,25%",
	},
	monoDiglycerides: {
		label: "Mono- e digliceridi (E471)",
		role: "Emulsionante",
		pod: 0,
		pac: 0,
		solidsPercent: 100,
		notes:
			"Derivati vegetali; destabilizzazione controllata dei grassi per struttura asciutta.",
		dosage: "0,1%–0,3% della miscela",
	},
	polysorbate80: {
		label: "Polisorbato 80",
		role: "Emulsionante",
		pod: 0,
		pac: 0,
		solidsPercent: 100,
		notes: "Mantiene la forma e rallenta la fusione del gelato.",
		dosage: "0,02%–0,06%",
	},
	hazelnutPaste: {
		label: "Pasta di nocciole",
		role: "Aromatizzante, apporto grassi vegetali",
		pod: null,
		pac: -91,
		solidsPercent: 100,
		notes:
			"~65% grassi vegetali; tende a indurire il gelato (PAC −91). PAC non ancora applicato in formula.",
		dosage: "Gusto «frutta secca»: 100 g/kg (inclusione; non sposta il latte)",
		formula: { gramsPerKg: 100 },
	},
	couverture70: {
		label: "Copertura nera 70%",
		role: "Aromatizzante, cremosità",
		pod: null,
		pac: -150,
		solidsPercent: 100,
		notes:
			"~42,5% burro di cacao, 27,5% cacao puro; sapore intenso; PAC −150 (non ancora applicato in formula). Dose 170 g/kg ≈ stessa intensità aromatica di 60 g/kg cacao 22/24.",
		dosage: "Gusto base bianca: 170 g/kg (sostituisce latte)",
		formula: { gramsPerKg: 170 },
	},
	cocoaPowder: {
		label: "Cacao (polvere)",
		role: "Caratterizzazione aromatica, solidi",
		pod: null,
		pac: null,
		solidsPercent: null,
		notes:
			"Residuo secco vegetale; struttura e aroma intenso. 60 g/kg di cacao 22/24 ≈ 4,68% cacao puro — dose equilibrata. Indurisce molto: impatto PAC ≈ cacao magro × 1,8 + burro di cacao × 0,9 (non ancora in formula).",
		dosage: "Gusto base bianca 22/24: 60 g/kg (sostituisce latte)",
		formula: {
			gramsPerKg: 60,
			cocoaLeanPacFactor: 1.8,
			cocoaButterPacFactor: 0.9,
		},
	},
	coconutOil: {
		label: "Olio di cocco",
		role: "Apporto grassi vegetali",
		pod: 0,
		pac: 0,
		solidsPercent: 100,
		notes:
			"Grasso vegetale solido a basse temperature; influenza il punto di fusione.",
		dosage: "~3,3% del mix",
	},
	salt: {
		label: "Sale",
		role: "Esalatore di sapore, anticongelante",
		pod: null,
		pac: 100,
		solidsPercent: 100,
		notes:
			"PAC 100 (= saccarosio): ogni grammo abbassa il punto di congelamento quanto 1 g di zucchero. Favorisce la coagulazione delle proteine e ne riduce la capacità di legare acqua (viscosità, soprattutto con tuorlo). Non aggiungere sale agli albumi in montatura. Il latte intero porta già ~10 g/L di sali minerali (sapore + overrun). Acidità frutta: nessun cambio di dose sale — solo neutro ×1,25 e acidi a freddo se c’è latte.",
		dosage:
			"Dolce (crema/frutta/sorbetto): ~0,5 g/kg come esaltatore (non in tabelle professionali). Salato gastronomico — creme: 4–8 g/kg (es. 4 g Parmigiano/Gorgonzola, fino a 8 g Emmental/caviale); sorbetti: fino a 8 g/kg (es. pomodoro/carota 8 g/kg).",
		formula: {
			/** Sweet / tradizionale — common practice, not a table standard. */
			gramsPerKgSweet: 0.5,
			/** Default savory cream dose (range 4–8). */
			gramsPerKgSavoryCream: 4,
			gramsPerKgSavoryCreamMin: 4,
			gramsPerKgSavoryCreamMax: 8,
			/** Savory sorbet — sources cite 8 g/kg. */
			gramsPerKgSavorySorbet: 8,
		},
	},
	sorbitol: {
		label: "Sorbitolo",
		role: "Emulsionante (polialcole)",
		pod: null,
		pac: null,
		solidsPercent: null,
		notes: "Non è uno zucchero; igroscopico; usi tecnici.",
		dosage: "Max 1%",
	},
	wheyProtein: {
		label: "Proteine del siero",
		role: "Stabilizzante, effetto montante",
		pod: null,
		pac: null,
		solidsPercent: null,
		notes:
			"Lattoalbumine/globuline; effetto montante superiore alla caseina; solubili.",
		dosage: null,
	},
	lemonJuice: {
		label: "Succo di limone",
		role: "Acidificante, esaltatore di gusto",
		pod: 5,
		pac: 5,
		solidsPercent: null,
		notes:
			"~5% zuccheri naturali; PAC/POD 5 per 100 g. Aggiungere a freddo (≤ 2–4°C) su basi al latte — a pH < 5 la caseina precipita.",
		dosage:
			"0 frutta acida/crema; 35 g/kg frutta dolce/sorbetto (+ extra opzionale). Acido (fruit_acid o limone in ricetta) → neutro ×1,25.",
		formula: {
			typicalGramsPerKg: 35,
			stabilizerBump: 0.25,
			lemonPercentPerXanthanStep: 2.5,
		},
	},
	casein: {
		label: "Caseina pura",
		role: "Strutturante, overrun (consiglio)",
		pod: null,
		pac: null,
		solidsPercent: null,
		notes:
			"Caseinati sodici spray. Compensa proteine disattivate dall'alcol; con cacao alleggerisce il mix. Precipita sotto pH 5 (o 4,5).",
		dosage:
			"Consiglio 20 g/kg con alcol (non in tabella ingredienti; disattivabile). Con frutta acida/limone: acido solo a freddo o in mantecatura.",
		formula: {
			gramsPerKg: 20,
		},
	},
	alcohol: {
		label: "Alcol",
		role: "Anticongelante, aroma",
		pod: 0,
		pac: null,
		solidsPercent: null,
		notes:
			"PAC = grammi di alcol puro per kg × 9. Preferisci saccarosio (evita destrosio/invertito ad alto PAC). Con alcol: neutro 8 g/kg su crema/frutta, ×1,25 su sorbetto.",
		dosage:
			"Opzionale; sposta latte/acqua e ribilancia gli zuccheri per riservare margine PAC.",
		formula: { pacPerPureGram: 9, stabilizerBump: 0.25 },
	},
} as const;

export type IngredientDataKey = keyof typeof INGREDIENT_DATA;

type NumOrRange = number | readonly [number, number];

/** PAC/POD index used in generateRecipe. Prefer formula.* when pac/pod is a range. */
export function formulaIndex(
	key: IngredientDataKey,
	field: "pac" | "pod",
): number {
	const e = INGREDIENT_DATA[key] as {
		pac: NumOrRange | null;
		pod: NumOrRange | null;
		formula?: { pac?: number; pod?: number };
	};
	const override = e.formula?.[field];
	if (override != null) return override;
	const raw = e[field];
	if (typeof raw === "number") return raw;
	throw new Error(
		`INGREDIENT_DATA.${key}: set formula.${field} (value is range or null)`,
	);
}

/** Derived from INGREDIENT_DATA — used by lib/UI. */
export const PAC_INDEX = {
	sucrose: formulaIndex("sucrose", "pac"),
	dextrose: formulaIndex("dextrose", "pac"),
	invertedSugar: formulaIndex("invertedSugar", "pac"),
	honey: formulaIndex("honey", "pac"),
	fructose: formulaIndex("fructose", "pac"),
	glucoseAtomized21DE: formulaIndex("glucoseAtomized21DE", "pac"),
	glucoseAtomized42DE: formulaIndex("glucoseAtomized42DE", "pac"),
	glucoseAtomized52DE: formulaIndex("glucoseAtomized52DE", "pac"),
	maltose: formulaIndex("maltose", "pac"),
	lactose: formulaIndex("lactose", "pac"),
	wholeMilk: formulaIndex("wholeMilk", "pac"),
	skimMilkPowder: formulaIndex("skimMilkPowder", "pac"),
	cream35: formulaIndex("cream35", "pac"),
	lemonJuice: formulaIndex("lemonJuice", "pac"),
	salt: formulaIndex("salt", "pac"),
	hazelnutPaste: formulaIndex("hazelnutPaste", "pac"),
	couverture70: formulaIndex("couverture70", "pac"),
} as const;

export const POD_INDEX = {
	sucrose: formulaIndex("sucrose", "pod"),
	dextrose: formulaIndex("dextrose", "pod"),
	invertedSugar: formulaIndex("invertedSugar", "pod"),
	honey: formulaIndex("honey", "pod"),
	fructose: formulaIndex("fructose", "pod"),
	glucoseAtomized21DE: formulaIndex("glucoseAtomized21DE", "pod"),
	glucoseAtomized42DE: formulaIndex("glucoseAtomized42DE", "pod"),
	glucoseAtomized52DE: formulaIndex("glucoseAtomized52DE", "pod"),
	maltose: formulaIndex("maltose", "pod"),
	lactose: formulaIndex("lactose", "pod"),
	trehalose: formulaIndex("trehalose", "pod"),
	inulin: formulaIndex("inulin", "pod"),
	lemonJuice: formulaIndex("lemonJuice", "pod"),
} as const;

export function formatIngredientNum(
	v: number | readonly [number, number] | null | undefined,
): string {
	if (v == null) return "—";
	if (typeof v === "number") return String(v);
	return `${v[0]}–${v[1]}`;
}

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
		/** Creams/yogurt/ricotta 18%; sorbets 22–24% — edible sweetness, not full −18°C PAC. */
		creamSugarFactor: 0.18,
		sorbetSugarFactor: 0.23,
		hint: "PAC:POD = 1:1 — non si raggiunge il PAC del freezer senza un gusto stucchevole. Preferisci destrosio, invertito o alcol.",
	},
} as const;

export type SugarMode = keyof typeof SUGAR_MODES;

/**
 * DIY invert-sugar batch ratios (per 100 g sucrose) and finished syrup solids.
 * Final syrup ≈ 75% sugars / 25% water after heating (part of process water evaporates).
 */
export const INVERT_SUGAR_DIY = {
	/** Finished syrup sugar solids (rest is bound water). */
	solidsPercent: 75,
	/** Process water per 100 g sucrose (before evaporation). */
	waterPer100gSucrose: 43,
	citricAcidPer100gSucrose: 0.43,
	/** Filtered lemon juice alternative to citric acid (~½ tsp). */
	lemonJuicePer100gSucrose: 2.5,
	/** Neutralize residual acid so dairy doesn't curdle. */
	bicarbonatePer100gSucrose: 0.5,
	heatC: [80, 85] as const,
	/** Hold at ~80°C / pH ~3 for >90% inversion. */
	inversionMinutes: 30,
	targetPh: 3,
} as const;

/** DIY invert-sugar procedure (shown when sucrose-only or invert mode). */
export const INVERT_SUGAR_HOWTO = {
	summary:
		"Lo zucchero invertito spezza il saccarosio in glucosio + fruttosio: PAC 190 (vs 100) e blocca la cristallizzazione. Lo sciroppo finito è ~75% solidi / 25% acqua — l'acqua legata sposta latte/acqua in formula.",
	steps: [
		`Per 100 g di saccarosio: ${INVERT_SUGAR_DIY.waterPer100gSucrose} g acqua + ${INVERT_SUGAR_DIY.citricAcidPer100gSucrose} g acido citrico (o ~${INVERT_SUGAR_DIY.lemonJuicePer100gSucrose} g succo di limone filtrato) — pH ~${INVERT_SUGAR_DIY.targetPh}.`,
		`Scalda a ${INVERT_SUGAR_DIY.heatC[0]}–${INVERT_SUGAR_DIY.heatC[1]}°C e tieni ~${INVERT_SUGAR_DIY.inversionMinutes} min (inversione >90%); i solidi finiscono ~${INVERT_SUGAR_DIY.solidsPercent}% (parte dell'acqua evapora).`,
		`A fine inversione: ${INVERT_SUGAR_DIY.bicarbonatePer100gSucrose} g bicarbonato di sodio ogni 100 g di saccarosio iniziali per neutralizzare l'acidità residua.`,
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
				"Neutro: mescola a secco con ~10× saccarosio (pesata precisa), poi incorpora con le altre polveri ancora a freddo così si disperde senza grumi.",
			],
		},
		{
			title: "2. Riscaldare a 85°C (pastorizzazione alta)",
			points: [
				"Porta la miscela a 82–85°C; inizia a raffreddare subito o dopo pochi secondi (niente sosta lunga).",
				"Non solo sanificazione: attiva il neutro (idratazione ottimale a 82–85°C), emulsiona i grassi, scioglie gli zuccheri in modo uniforme e idrata le proteine del latte così legano l'acqua libera.",
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
				"Overrun tipico: creme latte/panna ~35–40%; frutta/sorbetti ~25–30%. Sotto −4°C l'aria non si incorpora più — non prolungare l'agitazione oltre.",
				"Frutta acida (pH < 5): aggiungi alla fine, preferibilmente in mantecatura quando la base è sotto ~2°C — il freddo ferma la precipitazione della caseina («taglio»).",
				"Frutta che imbrunisce (banana, pesca): incorpora per ultima e manteca subito per mantenere il colore.",
			],
		},
	],
} as const;

/** Yogurt base: pasteurize dairy without yogurt, then fold yogurt in cold. */
export const YOGURT_PROCEDURE = {
	title: "Procedura base yogurt",
	stages: [
		{
			title: "1. Base calda (senza yogurt)",
			points: [
				"Prima i liquidi freddi: latte e panna — non lo yogurt.",
				"Incorpora le polveri (zuccheri) a freddo; agita per evitare grumi.",
				"Neutro a 8 g/kg (miscela più fragile con grassi bassi): mescola a secco con ~10× saccarosio, poi con le altre polveri a freddo.",
			],
		},
		{
			title: "2. Pastorizzazione 82–85°C",
			points: [
				"Porta solo la base (latte, panna, zuccheri, neutro) a 82–85°C; raffredda subito.",
				"Attiva il neutro, emulsiona i grassi e idrata le proteine — senza yogurt in pentola.",
			],
		},
		{
			title: "3. Raffreddamento rapido → ≤ 4°C",
			points: [
				"Raffredda il più in fretta possibile sotto 4°C (finestra batterica 45°C → 15°C).",
			],
		},
		{
			title: "4. Yogurt a freddo (50% della miscela)",
			points: [
				"Incorpora lo yogurt solo a miscela ≤ 4°C — non scaldarlo mai (pH 4,2–4,6; sotto pH 5 la caseina «taglia»).",
				"500 g/kg (~85–88% acqua) sostituiscono gran parte del latte della base bianca e conservano i fermenti lattici.",
				"Grassi totali obiettivo 4–6% (panna drasticamente ridotta vs ~170 g/kg della base bianca) per non coprire aroma e freschezza.",
			],
		},
		{
			title: "5. Maturazione e mantecatura",
			points: [
				"Matura 6–12 h a 4°C, poi manteca a ≤ 4°C.",
				"Overrun creme ~35–40%; sotto −4°C l'aria cessa — non protrarre l'agitazione.",
			],
		},
	],
} as const;

/** Ricotta: pasteurize base without cheese, mature, then cold-blend ricotta before churn. */
export const RICOTTA_PROCEDURE = {
	title: "Procedura base formaggio (ricotta)",
	stages: [
		{
			title: "1. Base bianca (senza ricotta)",
			points: [
				"Mescola latte, panna, zuccheri, LMP e neutro — non la ricotta.",
				"Neutro a 8 g/kg (creme poco grasse): mescola a secco con ~10× saccarosio, poi con le altre polveri a freddo.",
			],
		},
		{
			title: "2. Pastorizzazione 85°C e maturazione",
			points: [
				"Porta la base a 82–85°C; raffredda rapidamente a 4°C.",
				"Matura in frigo 6–12 h a 4°C.",
			],
		},
		{
			title: "3. Ricotta a freddo (in mantecatura)",
			points: [
				"Unisci la ricotta di frigo solo al momento di mantecare — non pastorizzarla (sapore e grana).",
				"Dose tipica 15–25% della miscela (150–250 g/kg).",
				"Passa il mix con frullatore a immersione prima della gelatiera per una struttura liscia senza grumi.",
			],
		},
		{
			title: "4. Mantecazione e inclusioni",
			points: [
				"Manteca a ≤ 4°C. Overrun tipico ~35% grazie alle proteine della ricotta (creme ~35–40%).",
				"Sotto −4°C l'aria non si incorpora più — non prolungare l'agitazione.",
				"Fichi, gocce di cioccolato o simili (~100 g/kg): a fine mantecatura. Canditi/caramellati apportano zuccheri extra (gelato più morbido).",
			],
		},
	],
} as const;

/**
 * Pure alcohol grams × this = PAC points (per kg mix convention).
 * From INGREDIENT_DATA.alcohol.formula.
 */
export const ALCOHOL_PAC_PER_PURE_GRAM =
	INGREDIENT_DATA.alcohol.formula.pacPerPureGram;

/** Recipe tweaks when alcohol is in the mix (casein is advice only — not auto-dosed). */
export const ALCOHOL_MIX_TWEAKS = {
	stabilizerBump: INGREDIENT_DATA.alcohol.formula.stabilizerBump,
	/** Prefer sucrose (PAC 100); avoid high-PAC sugars (dextrose, invert). */
	preferSucrose: true,
} as const;

/**
 * Pure casein (sodium caseinate spray) — advice only, not an ingredient line.
 * Toggle defaults on with alcohol; chocolate tip lives on flavor rows.
 */
export const CASEIN_ADVICE = {
	gramsPerKg: INGREDIENT_DATA.casein.formula.gramsPerKg,
	alcoholTip:
		"L'alcol disattiva le proteine e ostacola l'overrun; la caseina (caseinati sodici spray) compensa, trattiene l'alcol e mantiene la struttura sollevata.",
	chocolateTip:
		"Consiglio caseina (~20 g/kg): il cacao apporta molti solidi; alleggerisce la struttura e facilita l'aria.",
	acidWarning:
		"La caseina precipita sotto pH 5 (o 4,5). Con frutta acida/agrumi: aggiungi la parte acida solo a freddo o in mantecatura.",
} as const;

/**
 * Lemon juice: displaces milk/water, tiny PAC/POD, acids cut stabilizer power.
 * From INGREDIENT_DATA.lemonJuice.formula.
 */
export const LEMON_MIX_TWEAKS = {
	stabilizerBumpPerStep: INGREDIENT_DATA.lemonJuice.formula.stabilizerBump,
	lemonPercentPerStep:
		INGREDIENT_DATA.lemonJuice.formula.lemonPercentPerXanthanStep,
	typicalGramsPerKg: INGREDIENT_DATA.lemonJuice.formula.typicalGramsPerKg,
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

export type RecipeKind =
	| "fruit_acid"
	| "fruit_sweet"
	| "cream"
	| "yogurt"
	| "ricotta"
	| "sorbet";

export type RicottaMilk = "cow" | "sheep";

/** Salt dose g/kg: sweet ~0.5; savory cream 4 (range 4–8); savory sorbet 8. */
export function saltGramsPerKg(savory: boolean, kind: RecipeKind): number {
	const f = INGREDIENT_DATA.salt.formula;
	if (!savory) return f.gramsPerKgSweet;
	return kind === "sorbet" ? f.gramsPerKgSavorySorbet : f.gramsPerKgSavoryCream;
}

/** Cream / yogurt / ricotta: user sets mix weight; fruit kinds scale from fruit × FRUIT_TO_TOTAL. */
export function usesTotalGrams(kind: RecipeKind): boolean {
	return kind === "cream" || kind === "yogurt" || kind === "ricotta";
}

type KindParams = {
	sugarTotalFactor: number;
	fruitSugarFactor: number;
	pannaFactor: number;
	/** Fixed yogurt fraction of mix (yogurt kind only). */
	yogurtFactor: number;
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
		yogurtFactor: 0,
		lemonPerKg: 0,
		liquid: "milk",
		sucroseShare: 0.8,
	},
	// Frutta pH > 5
	fruit_sweet: {
		sugarTotalFactor: 0.18,
		fruitSugarFactor: 0.15,
		pannaFactor: 0.12,
		yogurtFactor: 0,
		lemonPerKg: INGREDIENT_DATA.lemonJuice.formula.typicalGramsPerKg / 1000,
		liquid: "milk",
		sucroseShare: 0.8,
	},
	// Base bianca (no fruit)
	cream: {
		sugarTotalFactor: 0.18,
		fruitSugarFactor: 0,
		pannaFactor: 0.17,
		yogurtFactor: 0,
		lemonPerKg: 0,
		liquid: "milk",
		sucroseShare: 0.8,
	},
	// Base yogurt — 50% yogurt, panna from yogurt MG, higher neutro, cold-add only
	yogurt: {
		sugarTotalFactor: 0.18,
		fruitSugarFactor: 0,
		/** Fallback if fat inputs missing; normally overridden by yogurt MG. */
		pannaFactor: 0.06,
		yogurtFactor: INGREDIENT_DATA.yogurt.formula.fractionOfMix,
		lemonPerKg: 0,
		liquid: "milk",
		sucroseShare: 0.8,
	},
	// Base ricotta — cheese % + composition drive panna/LMP; neutro 8; cold-add
	ricotta: {
		sugarTotalFactor: 0.18,
		fruitSugarFactor: 0,
		pannaFactor: 0.04,
		yogurtFactor: 0,
		lemonPerKg: 0,
		liquid: "milk",
		sucroseShare: 0.8,
	},
	// Sorbetto
	sorbet: {
		sugarTotalFactor: 0.25,
		fruitSugarFactor: 0.1,
		pannaFactor: 0,
		yogurtFactor: 0,
		lemonPerKg: INGREDIENT_DATA.lemonJuice.formula.typicalGramsPerKg / 1000,
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
		label: "Base bianca",
		hint: "Senza frutta — imposta il peso desiderato della miscela",
	},
	{
		value: "yogurt",
		label: "Base yogurt",
		hint: "50% yogurt a freddo · grassi 4–6% · neutro 8 g/kg",
	},
	{
		value: "ricotta",
		label: "Base formaggio (ricotta)",
		hint: "15–25% ricotta a freddo · grassi ~8% · LMP · neutro 8 g/kg",
	},
	{
		value: "sorbet",
		label: "Sorbetto",
		hint: "Base frutta + acqua, zuccheri più alti",
	},
];

export const INGREDIENT_ROWS = [
	{ key: "fruit", label: "Frutta" },
	{ key: "yogurt", label: "Yogurt" },
	{ key: "ricotta", label: "Ricotta" },
	{ key: "milk", label: "Latte" },
	{ key: "skimMilkPowder", label: "Latte magro in polvere" },
	{ key: "sucrose", label: "Saccarosio" },
	{ key: "dextrose", label: "Destrosio" },
	{ key: "invertedSugar", label: "Zucchero invertito (sciroppo)" },
	{ key: "honey", label: "Miele" },
	{ key: "panna", label: "Panna (35%)" },
	{ key: "eggYolk", label: "Tuorlo d'uovo" },
	{ key: "water", label: "Acqua" },
	{ key: "lemonJuice", label: "Succo di limone" },
	{ key: "neutro", label: "Neutro" },
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
		key: "catalanaCaramel",
		label: "Caramello crema catalana",
		note: "Con base emulsionata al tuorlo; aggiungi pezzi a fine mantecatura",
	},
	{
		key: "sugaryInclusionSugarCut",
		label: "Riduzione zuccheri (inclusioni dolci)",
		note: "Riduci gli zuccheri di base con canditi / uvetta / caramello",
	},
];

export const fieldClass =
	"mt-1 w-full border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25";

export const labelClass = "block text-sm font-medium text-foreground";
