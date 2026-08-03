import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	BASE_BIANCA_FLAVORS,
	CASEIN_ADVICE,
	FLAVOR_ROWS,
	FRUIT_TO_TOTAL,
	fieldClass,
	INGREDIENT_DATA,
	INGREDIENT_ROWS,
	INVERT_SUGAR_HOWTO,
	KIND_OPTIONS,
	LACTOSE_FREE,
	LEMON_MIX_TWEAKS,
	labelClass,
	MIX_PROCEDURE,
	PAC_INDEX,
	POD_INDEX,
	type RecipeKind,
	SERVICE_TEMP,
	type ServiceTempKey,
	SUGAR_MODES,
	type SugarMode,
	saltGramsPerKg,
	TARGETS,
} from "./const";
import { doseFor, generateRecipe, type RecipeResult } from "./lib";

function NumberField({
	id,
	label,
	value,
	onChange,
	min = 0,
	step = 1,
	hint,
	disabled,
	suffix = "g",
}: {
	id: string;
	label: string;
	value: string;
	onChange: (next: string) => void;
	min?: number;
	step?: number;
	hint?: string;
	disabled?: boolean;
	suffix?: string;
}) {
	return (
		<div>
			<label htmlFor={id} className={labelClass}>
				{label}
			</label>
			<div className="relative">
				<input
					id={id}
					type="number"
					inputMode="decimal"
					min={min}
					step={step}
					disabled={disabled}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className={cn(fieldClass, "pr-10", disabled && "opacity-50")}
				/>
				<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
					{suffix}
				</span>
			</div>
			{hint ? (
				<p className="mt-1 text-sm text-muted-foreground">{hint}</p>
			) : null}
		</div>
	);
}

function parseGrams(raw: string): number {
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

function severityClass(severity: RecipeResult["alerts"][number]["severity"]) {
	if (severity === "high") return "text-destructive";
	if (severity === "warn") return "text-primary";
	return "text-muted-foreground";
}

function flavorDoseLabel(
	key: keyof typeof BASE_BIANCA_FLAVORS,
	mixGrams: number,
): string {
	const entry = BASE_BIANCA_FLAVORS[key];
	if ("minPerKg" in entry && "maxPerKg" in entry) {
		const min = Math.round(doseFor(entry.minPerKg, mixGrams) * 10) / 10;
		const max = Math.round(doseFor(entry.maxPerKg, mixGrams) * 10) / 10;
		return `${min}–${max} baccelli`;
	}
	const g = Math.round(doseFor(entry.gramsPerKg, mixGrams) * 10) / 10;
	return `${g} g`;
}

export default function App() {
	const [kind, setKind] = useState<RecipeKind>("fruit_acid");
	const [fruitGrams, setFruitGrams] = useState("500");
	const [totalGrams, setTotalGrams] = useState("1000");
	const [tempKey, setTempKey] = useState<ServiceTempKey>("professional");
	const [sugarMode, setSugarMode] = useState<SugarMode>("blend");
	const [addAlcohol, setAddAlcohol] = useState(false);
	const [alcoholGrams, setAlcoholGrams] = useState("");
	const [alcoholAbv, setAlcoholAbv] = useState("40");
	/** Casein advice — defaults on when alcohol is enabled; user can turn off. */
	const [useCaseinAdvice, setUseCaseinAdvice] = useState(true);
	const [addPanna, setAddPanna] = useState(false);
	const [extraPannaGrams, setExtraPannaGrams] = useState("");
	const [addWater, setAddWater] = useState(false);
	const [extraWaterGrams, setExtraWaterGrams] = useState("");
	const [addLemon, setAddLemon] = useState(false);
	const [extraLemonGrams, setExtraLemonGrams] = useState("");
	const [addEggYolk, setAddEggYolk] = useState(false);
	const [eggYolkGrams, setEggYolkGrams] = useState("");
	const [savory, setSavory] = useState(false);
	const [saltGrams, setSaltGrams] = useState("");

	const isCream = kind === "cream";
	const kindMeta = KIND_OPTIONS.find((o) => o.value === kind);

	const result = useMemo(() => {
		const fruit = parseGrams(fruitGrams);
		const total = parseGrams(totalGrams);
		if (isCream ? total <= 0 : fruit <= 0) return null;
		const abv = Number(alcoholAbv);
		try {
			return generateRecipe({
				kind,
				fruitGrams: isCream ? undefined : fruit,
				totalGrams: isCream ? total : undefined,
				tempKey,
				sugarMode,
				alcoholGrams: addAlcohol ? parseGrams(alcoholGrams) : 0,
				alcoholAbv: addAlcohol && Number.isFinite(abv) && abv > 0 ? abv : 0,
				extraPannaGrams: addPanna ? parseGrams(extraPannaGrams) : 0,
				extraWaterGrams: addWater ? parseGrams(extraWaterGrams) : 0,
				extraLemonGrams: addLemon ? parseGrams(extraLemonGrams) : 0,
				eggYolkGrams: addEggYolk ? parseGrams(eggYolkGrams) : 0,
				savory,
				saltGrams: savory ? parseGrams(saltGrams) : undefined,
			});
		} catch {
			return null;
		}
	}, [
		kind,
		isCream,
		fruitGrams,
		totalGrams,
		tempKey,
		sugarMode,
		addAlcohol,
		alcoholGrams,
		alcoholAbv,
		addPanna,
		extraPannaGrams,
		addWater,
		extraWaterGrams,
		addLemon,
		extraLemonGrams,
		addEggYolk,
		eggYolkGrams,
		savory,
		saltGrams,
	]);

	const pac = result?.pac ?? null;

	const mixForFlavors = isCream
		? parseGrams(totalGrams) || 1000
		: (result?.actualTotal ?? 1000);

	const reset = () => {
		setKind("fruit_acid");
		setFruitGrams("500");
		setTotalGrams("1000");
		setTempKey("professional");
		setSugarMode("blend");
		setAddAlcohol(false);
		setAlcoholGrams("");
		setAlcoholAbv("40");
		setUseCaseinAdvice(true);
		setAddPanna(false);
		setExtraPannaGrams("");
		setAddWater(false);
		setExtraWaterGrams("");
		setAddLemon(false);
		setExtraLemonGrams("");
		setAddEggYolk(false);
		setEggYolkGrams("");
		setSavory(false);
		setSaltGrams("");
	};

	return (
		<div className="space-y-8">
			<form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
				<fieldset className="space-y-3">
					<legend className={labelClass}>Tipo di ricetta</legend>
					<div className="grid gap-2 sm:grid-cols-2">
						{KIND_OPTIONS.map((opt) => (
							<label
								key={opt.value}
								className={cn(
									"flex cursor-pointer gap-2 border border-border px-3 py-2",
									kind === opt.value && "border-primary bg-muted",
								)}
							>
								<input
									type="radio"
									name="kind"
									value={opt.value}
									checked={kind === opt.value}
									onChange={() => {
										setKind(opt.value);
										if (savory) {
											const mix =
												opt.value === "cream"
													? parseGrams(totalGrams) || 1000
													: parseGrams(fruitGrams) * FRUIT_TO_TOTAL || 1000;
											setSaltGrams(
												String(
													Math.round(
														doseFor(saltGramsPerKg(true, opt.value), mix) * 10,
													) / 10,
												),
											);
										}
									}}
									className="mt-1"
								/>
								<span>
									<span className="block text-sm font-medium text-foreground">
										{opt.label}
									</span>
									<span className="block text-sm text-muted-foreground">
										{opt.hint}
									</span>
								</span>
							</label>
						))}
					</div>
					{kindMeta ? (
						<p className="text-sm text-muted-foreground">
							{isCream
								? `Zuccheri ${TARGETS.sugarsCream.min}–${TARGETS.sugarsCream.max}% · grassi ${TARGETS.fatsCream.min}–${TARGETS.fatsCream.max}%`
								: `Frutta tipicamente ${TARGETS.fruitPercent.min}–${TARGETS.fruitPercent.max}% della miscela (×${FRUIT_TO_TOTAL} dal peso frutta)`}
							{kind === "sorbet"
								? ` · zuccheri ${TARGETS.sugarsSorbet.min}–${TARGETS.sugarsSorbet.max}%`
								: null}
						</p>
					) : null}
				</fieldset>

				<fieldset className="space-y-3">
					<legend className={labelClass}>Profilo sale</legend>
					<div className="grid gap-2 sm:grid-cols-2">
						<label
							className={cn(
								"flex cursor-pointer gap-2 border border-border px-3 py-2",
								!savory && "border-primary bg-muted",
							)}
						>
							<input
								type="radio"
								name="savory"
								checked={!savory}
								onChange={() => {
									setSavory(false);
									setSaltGrams("");
								}}
								className="mt-1"
							/>
							<span>
								<span className="block text-sm font-medium text-foreground">
									Dolce (tradizionale)
								</span>
								<span className="block text-sm text-muted-foreground">
									Sale ~{INGREDIENT_DATA.salt.formula.gramsPerKgSweet} g/kg come
									esaltatore (non in tabelle professionali)
								</span>
							</span>
						</label>
						<label
							className={cn(
								"flex cursor-pointer gap-2 border border-border px-3 py-2",
								savory && "border-primary bg-muted",
							)}
						>
							<input
								type="radio"
								name="savory"
								checked={savory}
								onChange={() => {
									setSavory(true);
									const mix = isCream
										? parseGrams(totalGrams) || 1000
										: parseGrams(fruitGrams) * FRUIT_TO_TOTAL || 1000;
									setSaltGrams(
										String(
											Math.round(
												doseFor(saltGramsPerKg(true, kind), mix) * 10,
											) / 10,
										),
									);
								}}
								className="mt-1"
							/>
							<span>
								<span className="block text-sm font-medium text-foreground">
									Salato (gastronomico)
								</span>
								<span className="block text-sm text-muted-foreground">
									Creme 4–8 g/kg · sorbetti tipicamente 8 g/kg — funzionale su
									PAC e struttura
								</span>
							</span>
						</label>
					</div>
					{savory ? (
						<NumberField
							id="saltGrams"
							label="Sale"
							value={saltGrams}
							onChange={setSaltGrams}
							step={0.1}
							hint={
								kind === "sorbet"
									? `Tipico ${INGREDIENT_DATA.salt.formula.gramsPerKgSavorySorbet} g/kg · PAC 100 (= saccarosio)`
									: `Range ${INGREDIENT_DATA.salt.formula.gramsPerKgSavoryCreamMin}–${INGREDIENT_DATA.salt.formula.gramsPerKgSavoryCreamMax} g/kg (es. 4 g Parmigiano/Gorgonzola, fino a 8 g Emmental/caviale) · PAC 100`
							}
						/>
					) : (
						<p className="text-sm text-muted-foreground">
							Il latte porta già ~10 g/L di sali minerali. Acidità della frutta
							non cambia il sale — solo neutro (+25% se acido) e acidi a freddo
							con latte.
						</p>
					)}
				</fieldset>

				{isCream ? (
					<NumberField
						id="totalGrams"
						label="Peso desiderato della miscela"
						value={totalGrams}
						onChange={setTotalGrams}
						hint="Di solito 1000 g per dosare facilmente"
					/>
				) : (
					<NumberField
						id="fruitGrams"
						label="Peso della frutta"
						value={fruitGrams}
						onChange={setFruitGrams}
						hint={
							parseGrams(fruitGrams) > 0
								? `Obiettivo della miscela ≈ ${Math.round(parseGrams(fruitGrams) * FRUIT_TO_TOTAL)} g`
								: undefined
						}
					/>
				)}

				<fieldset className="space-y-3">
					<legend className={labelClass}>Temperatura di servizio (PAC)</legend>
					<div className="grid gap-2 sm:grid-cols-2">
						{(
							Object.entries(SERVICE_TEMP) as [
								ServiceTempKey,
								(typeof SERVICE_TEMP)[ServiceTempKey],
							][]
						).map(([key, temp]) => (
							<label
								key={key}
								className={cn(
									"flex cursor-pointer gap-2 border border-border px-3 py-2",
									tempKey === key && "border-primary bg-muted",
								)}
							>
								<input
									type="radio"
									name="serviceTemp"
									value={key}
									checked={tempKey === key}
									onChange={() => setTempKey(key)}
									className="mt-1"
								/>
								<span>
									<span className="block text-sm font-medium text-foreground">
										{temp.label}
									</span>
									<span className="block text-sm text-muted-foreground">
										PAC target ≈ {temp.pacTarget}
									</span>
								</span>
							</label>
						))}
					</div>
					{result ? (
						<p className="text-sm text-muted-foreground">
							{result.sugarMode === "common"
								? "Dose di saccarosio edibile (non scalata al PAC pieno)"
								: `Zuccheri scalati al PAC ${result.pac.target}`}
							: saccarosio{" "}
							<span className="tabular-nums text-foreground">
								{result.ingredients.sucrose} g
							</span>
							{result.ingredients.dextrose > 0 ? (
								<>
									{" · "}
									destrosio{" "}
									<span className="tabular-nums text-foreground">
										{result.ingredients.dextrose} g
									</span>
								</>
							) : null}
							{result.ingredients.invertedSugar > 0 ? (
								<>
									{" · "}
									invertito{" "}
									<span className="tabular-nums text-foreground">
										{result.ingredients.invertedSugar} g
									</span>
								</>
							) : null}
							{result.ingredients.honey > 0 ? (
								<>
									{" · "}
									miele{" "}
									<span className="tabular-nums text-foreground">
										{result.ingredients.honey} g
									</span>
								</>
							) : null}
							{" · "}
							PAC{" "}
							<span className="tabular-nums text-foreground">
								{result.pac.total}
							</span>
							{" · "}
							POD{" "}
							<span className="tabular-nums text-foreground">
								{result.pod}%
							</span>
							{addAlcohol && result.ingredients.alcohol > 0
								? " (gli zuccheri lasciano spazio all'alcol)"
								: null}
						</p>
					) : (
						<p className="text-sm text-muted-foreground">
							Scegliere una temperatura ribilancia zuccheri (e latte/acqua) così
							la miscela si porziona a quella impostazione del freezer.
						</p>
					)}
				</fieldset>

				<fieldset className="space-y-3">
					<legend className={labelClass}>Opzioni zuccheri</legend>
					<p className="text-sm text-muted-foreground">
						Il default è saccarosio + destrosio. Il solo saccarosio ha PAC:POD =
						1:1 — raggiungere PAC {SERVICE_TEMP.home.pacTarget} (−18°C)
						significherebbe ~41% di zucchero.
					</p>
					<div className="grid gap-2 sm:grid-cols-2">
						{(
							Object.entries(SUGAR_MODES) as [
								SugarMode,
								(typeof SUGAR_MODES)[SugarMode],
							][]
						).map(([key, mode]) => (
							<label
								key={key}
								className={cn(
									"flex cursor-pointer gap-2 border border-border px-3 py-2",
									sugarMode === key && "border-primary bg-muted",
								)}
							>
								<input
									type="radio"
									name="sugarMode"
									value={key}
									checked={sugarMode === key}
									onChange={() => setSugarMode(key)}
									className="mt-1"
								/>
								<span>
									<span className="block text-sm font-medium text-foreground">
										{mode.label}
									</span>
									<span className="block text-sm text-muted-foreground">
										{mode.hint}
									</span>
								</span>
							</label>
						))}
					</div>
					{result?.sucroseAdvisory ? (
						<div className="space-y-2 border border-border p-3 text-sm">
							<p className="font-medium text-foreground">
								Limite solo saccarosio @ {result.pac.celsius}°C
							</p>
							<p className="text-muted-foreground">
								Il PAC target {result.pac.target} con solo saccarosio
								richiederebbe{" "}
								<span className="tabular-nums text-foreground">
									{result.sucroseAdvisory.sucroseGramsForTarget} g
								</span>{" "}
								(POD{" "}
								<span className="tabular-nums text-foreground">
									{result.sucroseAdvisory.podIfSucroseOnly}%
								</span>
								) — stucchevole e soggetto a cristallizzazione. Questa ricetta
								mantiene una dose edibile (POD {result.pod}%) e lascia il PAC
								corto di{" "}
								<span className="tabular-nums text-foreground">
									{result.sucroseAdvisory.pacShortfall}
								</span>
								.
							</p>
							<ul className="list-disc space-y-1 pl-5 text-muted-foreground">
								<li>
									<strong className="font-medium text-foreground">
										Destrosio
									</strong>{" "}
									(migliore): ~{result.sucroseAdvisory.dextroseGramsForTarget} g
									da solo → PAC {result.pac.target}, POD ~
									{result.sucroseAdvisory.podWithDextrose}% (PAC 190 / POD 70).
								</li>
								<li>
									<strong className="font-medium text-foreground">
										Zucchero invertito
									</strong>
									: ~{result.sucroseAdvisory.invertGramsForTarget} g da solo →
									POD ~{result.sucroseAdvisory.podWithInvert}% (PAC 190 / POD
									130) — più dolce del destrosio, comunque molto meglio del 41%
									di saccarosio. Cambia l'opzione zuccheri sopra, oppure
									preparalo in casa:
								</li>
								<li>
									<strong className="font-medium text-foreground">Alcol</strong>
									: +{result.sucroseAdvisory.alcoholToCloseG} g al{" "}
									{alcoholAbv || 40}% vol chiude il gap di PAC senza aggiungere
									dolcezza (regola: 1% alcol puro / kg ≈ 9 PAC). Attiva Aggiungi
									alcol sotto.
								</li>
							</ul>
							<details className="text-muted-foreground">
								<summary className="cursor-pointer font-medium text-foreground">
									Come fare lo zucchero invertito
								</summary>
								<p className="mt-2">{INVERT_SUGAR_HOWTO.summary}</p>
								<ol className="mt-2 list-decimal space-y-1 pl-5">
									{INVERT_SUGAR_HOWTO.steps.map((step) => (
										<li key={step}>{step}</li>
									))}
								</ol>
							</details>
							<p className="text-muted-foreground">
								Il freddo, l'overrun e gli ingredienti amari (cacao) attenuano
								anche la dolcezza percepita rispetto al numero POD.
							</p>
						</div>
					) : null}
					{sugarMode === "inverted" ? (
						<details className="text-sm text-muted-foreground">
							<summary className="cursor-pointer font-medium text-foreground">
								Come fare lo zucchero invertito
							</summary>
							<p className="mt-2">{INVERT_SUGAR_HOWTO.summary}</p>
							<ol className="mt-2 list-decimal space-y-1 pl-5">
								{INVERT_SUGAR_HOWTO.steps.map((step) => (
									<li key={step}>{step}</li>
								))}
							</ol>
						</details>
					) : null}
				</fieldset>

				<fieldset className="space-y-4">
					<legend className={labelClass}>Additivi opzionali</legend>
					<p className="text-sm text-muted-foreground">
						Servono quando vuoi spingere gusto o texture oltre la base
						bilanciata: panna per più cremosità e grasso, acqua per alleggerire
						i solidi, limone per acidità e freschezza, tuorlo per emulsionare
						(legare grassi e acqua), alcol per aroma e per ammorbidire a
						servizio. Ogni aggiunta sposta latte o acqua nella ricetta; alcol e
						limone alzano anche il neutro, il tuorlo lo riduce. Con limone e
						latte aggiungi il succo a freddo; con alcol conviene un po' di
						caseina (opzionale) e preferisci saccarosio tra gli zuccheri.
					</p>

					<div className="space-y-3">
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={addAlcohol}
								onChange={(e) => {
									const on = e.target.checked;
									setAddAlcohol(on);
									if (on) {
										setUseCaseinAdvice(true);
										if (!alcoholGrams.trim()) {
											const suggested =
												result?.sucroseAdvisory?.alcoholToCloseG ?? 0;
											if (suggested > 0) {
												setAlcoholGrams(suggested.toFixed(1));
											}
										}
									}
								}}
							/>
							Aggiungi alcol
						</label>
						{addAlcohol ? (
							<div className="space-y-3">
								<div className="grid gap-3 sm:grid-cols-2">
									<NumberField
										id="alcoholGrams"
										label="Alcol"
										value={alcoholGrams}
										onChange={setAlcoholGrams}
										hint={
											pac
												? alcoholGrams && parseGrams(alcoholGrams) > 0
													? `PAC riservato; altri ${pac.maxLiquorAtAbv} g stanno @ ${alcoholAbv || 40}%`
													: pac.maxLiquorAtAbv > 0
														? `Max ≈ ${pac.maxLiquorAtAbv} g al ${alcoholAbv || 40}% per margine PAC`
														: `Inserisci i grammi — gli zuccheri calano per riservare PAC @ ${alcoholAbv || 40}%`
												: undefined
										}
									/>
									<NumberField
										id="alcoholAbv"
										label="Gradazione"
										value={alcoholAbv}
										onChange={setAlcoholAbv}
										min={1}
										suffix="%"
										hint={`Neutro alcol: ${INGREDIENT_DATA.neutro.formula.alcoholCreamGramsPerKg} g/kg crema/frutta · ×${1 + INGREDIENT_DATA.neutro.formula.alcoholSorbetBump} sorbetto · preferisci saccarosio`}
									/>
								</div>
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={useCaseinAdvice}
										onChange={(e) => setUseCaseinAdvice(e.target.checked)}
									/>
									Consiglia caseina pura (+{CASEIN_ADVICE.gramsPerKg} g/kg)
								</label>
							</div>
						) : null}

						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={addPanna}
								onChange={(e) => setAddPanna(e.target.checked)}
							/>
							Aggiungi panna extra
						</label>
						{addPanna ? (
							<NumberField
								id="extraPannaGrams"
								label="Panna extra"
								value={extraPannaGrams}
								onChange={setExtraPannaGrams}
							/>
						) : null}

						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={addWater}
								onChange={(e) => setAddWater(e.target.checked)}
							/>
							Aggiungi acqua extra
						</label>
						{addWater ? (
							<NumberField
								id="extraWaterGrams"
								label="Acqua extra"
								value={extraWaterGrams}
								onChange={setExtraWaterGrams}
							/>
						) : null}

						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={addLemon}
								onChange={(e) => {
									const on = e.target.checked;
									setAddLemon(on);
									if (on && !extraLemonGrams.trim() && result) {
										setExtraLemonGrams(
											String(
												Math.round(
													doseFor(
														LEMON_MIX_TWEAKS.typicalGramsPerKg,
														result.targetTotal,
													),
												),
											),
										);
									}
								}}
							/>
							Aggiungi succo di limone extra
						</label>
						{addLemon ? (
							<NumberField
								id="extraLemonGrams"
								label="Succo di limone extra"
								value={extraLemonGrams}
								onChange={setExtraLemonGrams}
								hint={`PAC/POD ${PAC_INDEX.lemonJuice} per 100 g · sposta latte/acqua · acido → neutro ×${1 + INGREDIENT_DATA.neutro.formula.acidBump} · tipico ~${LEMON_MIX_TWEAKS.typicalGramsPerKg} g/kg`}
							/>
						) : null}

						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={addEggYolk}
								onChange={(e) => {
									const on = e.target.checked;
									setAddEggYolk(on);
									if (on && !eggYolkGrams.trim() && result) {
										setEggYolkGrams(
											String(
												Math.round(
													doseFor(
														INGREDIENT_DATA.eggYolk.formula.gramsPerKg,
														result.targetTotal,
													),
												),
											),
										);
									}
								}}
							/>
							Aggiungi tuorlo d'uovo (emulsionante)
						</label>
						{addEggYolk ? (
							<NumberField
								id="eggYolkGrams"
								label="Tuorlo d'uovo"
								value={eggYolkGrams}
								onChange={setEggYolkGrams}
								hint={`Neutro creme ${INGREDIENT_DATA.eggYolk.formula.neutroGramsPerKgMin}–${INGREDIENT_DATA.eggYolk.formula.neutroGramsPerKgMax} g/kg · 1 tuorlo ≈ ${INGREDIENT_DATA.eggYolk.formula.yolkGramsEach} g ≈ ${INGREDIENT_DATA.eggYolk.formula.neutroEquivalentPerYolkGrams} g neutro · min emulsione ${INGREDIENT_DATA.eggYolk.formula.minYolksPerKgForEmulsion} tuorli/kg · sposta latte/acqua`}
							/>
						) : null}
					</div>
				</fieldset>

				<div className="flex gap-2">
					<Button type="button" variant="outline" onClick={reset}>
						Reimposta
					</Button>
				</div>
			</form>

			<section aria-live="polite" className="space-y-3">
				<h2 className="text-xl font-semibold text-foreground">Ricetta</h2>
				{!result ? (
					<p className="text-muted-foreground">
						Inserisci un peso di {isCream ? "miscela" : "frutta"} per generare
						le quantità.
					</p>
				) : (
					<>
						<p className="text-sm text-muted-foreground">
							Target {result.targetTotal} g · effettivo {result.actualTotal} g
						</p>
						<table className="w-full border-collapse text-left text-base">
							<thead>
								<tr className="border-b border-border">
									<th className="py-2 pr-4 font-medium">Ingrediente</th>
									<th className="py-2 font-medium">g</th>
								</tr>
							</thead>
							<tbody>
								{INGREDIENT_ROWS.filter(
									({ key }) => result.ingredients[key] > 0,
								).map(({ key, label }) => (
									<tr key={key} className="border-b border-border">
										<td className="py-2 pr-4">{label}</td>
										<td className="py-2 tabular-nums">
											{result.ingredients[key]}
										</td>
									</tr>
								))}
							</tbody>
						</table>

						<ul className="space-y-1 text-sm">
							{result.alerts.map((alert) => (
								<li
									key={alert.ingredient}
									className={severityClass(alert.severity)}
								>
									{
										{
											panna: "Panna",
											alcohol: "Alcol",
											water: "Acqua",
										}[alert.ingredient]
									}
									: {alert.percent}% della miscela
									{alert.severity !== "ok"
										? ` (${alert.severity === "high" ? "alto" : "avviso"})`
										: ""}
								</li>
							))}
						</ul>
						{result.tips.length > 0 ? (
							<ul className="space-y-1 text-sm text-primary">
								{result.tips.map((tip) => (
									<li key={tip}>{tip}</li>
								))}
							</ul>
						) : null}
						{addAlcohol && useCaseinAdvice && result.ingredients.alcohol > 0 ? (
							<div className="space-y-1 border border-border p-3 text-sm">
								<p className="font-medium text-foreground">
									Caseina consigliata:{" "}
									<span className="tabular-nums">
										{Math.round(
											doseFor(CASEIN_ADVICE.gramsPerKg, result.actualTotal) *
												10,
										) / 10}{" "}
										g
									</span>{" "}
									(+{CASEIN_ADVICE.gramsPerKg} g/kg — non in tabella: aggiungi a
									mano)
								</p>
								<p className="text-muted-foreground">
									{CASEIN_ADVICE.alcoholTip}
								</p>
								{kind === "fruit_acid" || result.ingredients.lemonJuice > 0 ? (
									<p className="text-primary">{CASEIN_ADVICE.acidWarning}</p>
								) : null}
							</div>
						) : null}
						<p className="text-sm text-muted-foreground">
							Neutro auto-dosato — mescola a secco con ~10× saccarosio; attiva a
							82–85°C. (Lo xantano domestico ≠ neutro commerciale; non è in
							formula.)
						</p>

						{pac ? (
							<div className="space-y-2 border border-border p-3">
								<h3 className="text-base font-medium text-foreground">
									Bilancio PAC @ {pac.celsius}°C
								</h3>
								<ul className="space-y-1 text-sm tabular-nums">
									<li>Target: {pac.target}</li>
									<li>
										Zuccheri: {pac.fromSucrose} (saccarosio)
										{pac.fromDextrose > 0
											? ` + ${pac.fromDextrose} (destrosio)`
											: ""}
										{pac.fromInverted > 0
											? ` + ${pac.fromInverted} (invertito)`
											: ""}
										{pac.fromHoney > 0 ? ` + ${pac.fromHoney} (miele)` : ""}
									</li>
									{pac.fromLemon > 0 ? <li>Limone: {pac.fromLemon}</li> : null}
									{pac.fromSalt > 0 ? <li>Sale: {pac.fromSalt}</li> : null}
									<li>Alcol: {pac.fromAlcohol}</li>
									<li>
										Totale: {pac.total}
										{Math.abs(pac.total - pac.target) <= pac.target * 0.05
											? " — in target"
											: pac.total > pac.target
												? " — sopra target (scoop più morbido)"
												: " — sotto target (più sodo)"}
									</li>
									<li>POD (dolcezza): {result.pod}%</li>
									{addAlcohol ? (
										<li>
											Margine residuo: {Math.max(0, pac.remaining)} ≈ max altri{" "}
											{pac.maxLiquorAtAbv} g @ {alcoholAbv || 40}%
										</li>
									) : result.sugarMode === "common" ? (
										<li>
											Deficit PAC {Math.max(0, pac.remaining)} — aggiungi alcol
											o passa a destrosio / invertito (vedi Opzioni zuccheri).
										</li>
									) : (
										<li>
											Gli zuccheri riempiono il budget PAC — attiva l'alcol per
											riservare margine (gli zuccheri calano automaticamente).
										</li>
									)}
								</ul>
								<p className="text-sm text-muted-foreground">
									Indici — PAC saccarosio {PAC_INDEX.sucrose} / destrosio{" "}
									{PAC_INDEX.dextrose} / invertito {PAC_INDEX.invertedSugar} /
									miele {PAC_INDEX.honey} / limone {PAC_INDEX.lemonJuice}. POD
									saccarosio {POD_INDEX.sucrose} / destrosio{" "}
									{POD_INDEX.dextrose} / invertito {POD_INDEX.invertedSugar} /
									miele {POD_INDEX.honey} / limone {POD_INDEX.lemonJuice} /
									lattosio {POD_INDEX.lactose}. Il latte senza lattosio alza PAC
									e POD — riduci gli zuccheri di ~
									{LACTOSE_FREE.sugarCutFraction * 100}% se risulta morbido o
									troppo dolce.
								</p>
							</div>
						) : null}

						<div className="space-y-3 border border-border p-3">
							<h3 className="text-base font-medium text-foreground">
								{MIX_PROCEDURE.title}
							</h3>
							{MIX_PROCEDURE.stages.map((stage) => (
								<div key={stage.title} className="space-y-1">
									<p className="text-sm font-medium text-foreground">
										{stage.title}
									</p>
									<ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
										{stage.points.map((point) => (
											<li key={point}>{point}</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</>
				)}
			</section>

			{isCream ? (
				<section className="space-y-3">
					<h2 className="text-xl font-semibold text-foreground">
						Gusti su base bianca
					</h2>
					<p className="text-sm text-muted-foreground">
						Dosi per {mixForFlavors} g di miscela. Gusti che si sciolgono:
						sottrai lo stesso peso dal latte. Inclusioni: aggiungi durante/a
						fine mantecatura. Per il tuorlo (emulsionante/neutro) usa gli
						additivi opzionali.
					</p>
					<table className="w-full border-collapse text-left text-base">
						<thead>
							<tr className="border-b border-border">
								<th className="py-2 pr-4 font-medium">Gusto</th>
								<th className="py-2 pr-4 font-medium">Dose</th>
								<th className="py-2 font-medium">Note</th>
							</tr>
						</thead>
						<tbody>
							{FLAVOR_ROWS.map(({ key, label, note }) => {
								const entry = BASE_BIANCA_FLAVORS[key];
								const replaces =
									"replaceMilk" in entry && entry.replaceMilk
										? " · −latte"
										: "";
								return (
									<tr key={key} className="border-b border-border align-top">
										<td className="py-2 pr-4">{label}</td>
										<td className="py-2 pr-4 whitespace-nowrap tabular-nums">
											{flavorDoseLabel(key, mixForFlavors)}
											{replaces}
										</td>
										<td className="py-2 text-sm text-muted-foreground">
											{note}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</section>
			) : null}
		</div>
	);
}
