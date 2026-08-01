import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	ALCOHOL_MIX_TWEAKS,
	BASE_BIANCA_FLAVORS,
	FLAVOR_ROWS,
	FRUIT_TO_TOTAL,
	fieldClass,
	INGREDIENT_ROWS,
	KIND_OPTIONS,
	LACTOSE_FREE,
	labelClass,
	PAC_INDEX,
	POD_INDEX,
	type RecipeKind,
	SERVICE_TEMP,
	type ServiceTempKey,
	SUGAR_MODES,
	type SugarMode,
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
				<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[rgb(var(--text-muted))]">
					{suffix}
				</span>
			</div>
			{hint ? (
				<p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{hint}</p>
			) : null}
		</div>
	);
}

function parseGrams(raw: string): number {
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

function severityClass(severity: RecipeResult["alerts"][number]["severity"]) {
	if (severity === "high") return "text-[rgb(var(--brand-dark))]";
	if (severity === "warn") return "text-[rgb(var(--brand))]";
	return "text-[rgb(var(--text-muted))]";
}

function flavorDoseLabel(
	key: keyof typeof BASE_BIANCA_FLAVORS,
	mixGrams: number,
): string {
	const entry = BASE_BIANCA_FLAVORS[key];
	if ("minPerKg" in entry && "maxPerKg" in entry) {
		const min = Math.round(doseFor(entry.minPerKg, mixGrams) * 10) / 10;
		const max = Math.round(doseFor(entry.maxPerKg, mixGrams) * 10) / 10;
		return `${min}–${max} pods`;
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
	const [addPanna, setAddPanna] = useState(false);
	const [extraPannaGrams, setExtraPannaGrams] = useState("");
	const [addWater, setAddWater] = useState(false);
	const [extraWaterGrams, setExtraWaterGrams] = useState("");

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
		setAddPanna(false);
		setExtraPannaGrams("");
		setAddWater(false);
		setExtraWaterGrams("");
	};

	return (
		<div className="space-y-8">
			<form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
				<fieldset className="space-y-3">
					<legend className={labelClass}>Recipe type</legend>
					<div className="grid gap-2 sm:grid-cols-2">
						{KIND_OPTIONS.map((opt) => (
							<label
								key={opt.value}
								className={cn(
									"flex cursor-pointer gap-2 border border-[rgb(var(--page-border))] px-3 py-2",
									kind === opt.value &&
										"border-[rgb(var(--brand))] bg-[rgb(var(--neutral-light))]",
								)}
							>
								<input
									type="radio"
									name="kind"
									value={opt.value}
									checked={kind === opt.value}
									onChange={() => setKind(opt.value)}
									className="mt-1"
								/>
								<span>
									<span className="block text-sm font-medium text-[rgb(var(--text-title))]">
										{opt.label}
									</span>
									<span className="block text-sm text-[rgb(var(--text-muted))]">
										{opt.hint}
									</span>
								</span>
							</label>
						))}
					</div>
					{kindMeta ? (
						<p className="text-sm text-[rgb(var(--text-muted))]">
							{isCream
								? `Sugars ${TARGETS.sugarsCream.min}–${TARGETS.sugarsCream.max}% · fats ${TARGETS.fatsCream.min}–${TARGETS.fatsCream.max}%`
								: `Fruit typically ${TARGETS.fruitPercent.min}–${TARGETS.fruitPercent.max}% of mix (×${FRUIT_TO_TOTAL} from fruit weight)`}
							{kind === "sorbet"
								? ` · sugars ${TARGETS.sugarsSorbet.min}–${TARGETS.sugarsSorbet.max}%`
								: null}
						</p>
					) : null}
				</fieldset>

				{isCream ? (
					<NumberField
						id="totalGrams"
						label="Desired mix weight"
						value={totalGrams}
						onChange={setTotalGrams}
						hint="Usually 1000 g for easy dosing"
					/>
				) : (
					<NumberField
						id="fruitGrams"
						label="Fruit weight"
						value={fruitGrams}
						onChange={setFruitGrams}
						hint={
							parseGrams(fruitGrams) > 0
								? `Target mix ≈ ${Math.round(parseGrams(fruitGrams) * FRUIT_TO_TOTAL)} g`
								: undefined
						}
					/>
				)}

				<fieldset className="space-y-3">
					<legend className={labelClass}>Service temperature (PAC)</legend>
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
									"flex cursor-pointer gap-2 border border-[rgb(var(--page-border))] px-3 py-2",
									tempKey === key &&
										"border-[rgb(var(--brand))] bg-[rgb(var(--neutral-light))]",
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
									<span className="block text-sm font-medium text-[rgb(var(--text-title))]">
										{temp.label}
									</span>
									<span className="block text-sm text-[rgb(var(--text-muted))]">
										PAC target ≈ {temp.pacTarget}
									</span>
								</span>
							</label>
						))}
					</div>
					{result ? (
						<p className="text-sm text-[rgb(var(--text-muted))]">
							Sugars scaled to PAC {result.pac.target}: sucrose{" "}
							<span className="tabular-nums text-[rgb(var(--text-title))]">
								{result.ingredients.sucrose} g
							</span>
							{result.ingredients.dextrose > 0 ? (
								<>
									{" · "}
									dextrose{" "}
									<span className="tabular-nums text-[rgb(var(--text-title))]">
										{result.ingredients.dextrose} g
									</span>
								</>
							) : null}
							{result.ingredients.honey > 0 ? (
								<>
									{" · "}
									honey{" "}
									<span className="tabular-nums text-[rgb(var(--text-title))]">
										{result.ingredients.honey} g
									</span>
								</>
							) : null}
							{" · "}
							total PAC{" "}
							<span className="tabular-nums text-[rgb(var(--text-title))]">
								{result.pac.total}
							</span>
							{addAlcohol && result.ingredients.alcohol > 0
								? " (sugars leave room for alcohol)"
								: null}
						</p>
					) : (
						<p className="text-sm text-[rgb(var(--text-muted))]">
							Choosing a temperature rebalances sucrose/dextrose (and
							milk/water) so the mix scoops at that freezer setting.
						</p>
					)}
				</fieldset>

				<fieldset className="space-y-3">
					<legend className={labelClass}>Sugar options</legend>
					<p className="text-sm text-[rgb(var(--text-muted))]">
						Default uses sucrose + dextrose. Pick one alternative if you only
						have kitchen sugar or honey.
					</p>
					<div className="space-y-2">
						<label className="flex items-start gap-2 text-sm">
							<input
								type="checkbox"
								className="mt-1"
								checked={sugarMode === "common"}
								onChange={(e) =>
									setSugarMode(e.target.checked ? "common" : "blend")
								}
							/>
							<span>
								<span className="font-medium text-[rgb(var(--text-title))]">
									Common sugar only
								</span>
								<span className="mt-0.5 block text-[rgb(var(--text-muted))]">
									{SUGAR_MODES.common.note}
								</span>
							</span>
						</label>
						<label className="flex items-start gap-2 text-sm">
							<input
								type="checkbox"
								className="mt-1"
								checked={sugarMode === "honey"}
								onChange={(e) =>
									setSugarMode(e.target.checked ? "honey" : "blend")
								}
							/>
							<span>
								<span className="font-medium text-[rgb(var(--text-title))]">
									Honey
								</span>
								<span className="mt-0.5 block text-[rgb(var(--text-muted))]">
									{SUGAR_MODES.honey.note}
								</span>
							</span>
						</label>
					</div>
				</fieldset>

				<fieldset className="space-y-4">
					<legend className={labelClass}>Optional additives</legend>
					<p className="text-sm text-[rgb(var(--text-muted))]">
						Extra panna/water sit on top of the base. Alcohol displaces
						milk/water and sugars are cut so PAC stays on target.
					</p>

					<div className="space-y-3">
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={addAlcohol}
								onChange={(e) => setAddAlcohol(e.target.checked)}
							/>
							Add alcohol
						</label>
						{addAlcohol ? (
							<div className="grid gap-3 sm:grid-cols-2">
								<NumberField
									id="alcoholGrams"
									label="Alcohol"
									value={alcoholGrams}
									onChange={setAlcoholGrams}
									hint={
										pac
											? alcoholGrams && parseGrams(alcoholGrams) > 0
												? `PAC reserved; ${pac.maxLiquorAtAbv} g more fits @ ${alcoholAbv || 40}%`
												: `Max ≈ ${pac.maxLiquorAtAbv} g at ${alcoholAbv || 40}% for PAC margin`
											: undefined
									}
								/>
								<NumberField
									id="alcoholAbv"
									label="ABV"
									value={alcoholAbv}
									onChange={setAlcoholAbv}
									min={1}
									suffix="%"
									hint={`+${ALCOHOL_MIX_TWEAKS.caseinGramsPerKg} g/kg casein · stabilizer +${ALCOHOL_MIX_TWEAKS.stabilizerBump * 100}% · prefer sucrose`}
								/>
							</div>
						) : null}

						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={addPanna}
								onChange={(e) => setAddPanna(e.target.checked)}
							/>
							Add extra panna
						</label>
						{addPanna ? (
							<NumberField
								id="extraPannaGrams"
								label="Extra panna"
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
							Add extra water
						</label>
						{addWater ? (
							<NumberField
								id="extraWaterGrams"
								label="Extra water"
								value={extraWaterGrams}
								onChange={setExtraWaterGrams}
							/>
						) : null}
					</div>
				</fieldset>

				<div className="flex gap-2">
					<Button type="button" variant="outline" onClick={reset}>
						Reset
					</Button>
				</div>
			</form>

			<section aria-live="polite" className="space-y-3">
				<h2 className="text-xl font-semibold text-[rgb(var(--text-title))]">
					Recipe
				</h2>
				{!result ? (
					<p className="text-[rgb(var(--text-muted))]">
						Enter a {isCream ? "mix" : "fruit"} weight to generate quantities.
					</p>
				) : (
					<>
						<p className="text-sm text-[rgb(var(--text-muted))]">
							Target {result.targetTotal} g · actual {result.actualTotal} g
						</p>
						<table className="w-full border-collapse text-left text-base">
							<thead>
								<tr className="border-b border-[rgb(var(--page-border))]">
									<th className="py-2 pr-4 font-medium">Ingredient</th>
									<th className="py-2 font-medium">g</th>
								</tr>
							</thead>
							<tbody>
								{INGREDIENT_ROWS.filter(
									({ key }) => result.ingredients[key] > 0,
								).map(({ key, label }) => (
									<tr
										key={key}
										className="border-b border-[rgb(var(--page-border))]"
									>
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
									{alert.ingredient}: {alert.percent}% of mix
									{alert.severity !== "ok" ? ` (${alert.severity})` : ""}
								</li>
							))}
						</ul>
						<p className="text-sm text-[rgb(var(--text-muted))]">
							Xanthan max ≈ {TARGETS.xanthanMaxPercent}% of mix — mix dry with
							sugars before liquids.
						</p>

						{pac ? (
							<div className="space-y-2 border border-[rgb(var(--page-border))] p-3">
								<h3 className="text-base font-medium text-[rgb(var(--text-title))]">
									PAC balance @ {pac.celsius}°C
								</h3>
								<ul className="space-y-1 text-sm tabular-nums">
									<li>Target: {pac.target}</li>
									<li>
										Sugars: {pac.fromSucrose} (sucrose)
										{pac.fromDextrose > 0
											? ` + ${pac.fromDextrose} (dextrose)`
											: ""}
										{pac.fromHoney > 0 ? ` + ${pac.fromHoney} (honey)` : ""}
									</li>
									<li>Alcohol: {pac.fromAlcohol}</li>
									<li>
										Total: {pac.total}
										{Math.abs(pac.total - pac.target) <= pac.target * 0.05
											? " — on target"
											: pac.total > pac.target
												? " — above target (softer scoop)"
												: " — below target (firmer)"}
									</li>
									{addAlcohol ? (
										<li>
											Room left: {Math.max(0, pac.remaining)} ≈ max{" "}
											{pac.maxLiquorAtAbv} g more @ {alcoholAbv || 40}%
										</li>
									) : (
										<li>
											Sugars fill the PAC budget — enable alcohol to reserve
											margin (sugars drop automatically).
										</li>
									)}
								</ul>
								<p className="text-sm text-[rgb(var(--text-muted))]">
									Indexes — PAC sucrose {PAC_INDEX.sucrose} / dextrose{" "}
									{PAC_INDEX.dextrose} / honey {PAC_INDEX.honey} / invert{" "}
									{PAC_INDEX.invertedSugar}. POD sucrose {POD_INDEX.sucrose} /
									dextrose {POD_INDEX.dextrose} / honey {POD_INDEX.honey} /
									lactose {POD_INDEX.lactose}. Lactose-free milk raises PAC &
									POD — cut sugars ~{LACTOSE_FREE.sugarCutFraction * 100}% if
									soft or too sweet.
								</p>
							</div>
						) : null}
					</>
				)}
			</section>

			{isCream ? (
				<section className="space-y-3">
					<h2 className="text-xl font-semibold text-[rgb(var(--text-title))]">
						Base bianca flavors
					</h2>
					<p className="text-sm text-[rgb(var(--text-muted))]">
						Doses for {mixForFlavors} g mix. Dissolving flavors: subtract the
						same weight from milk. Inclusions: add during/at end of churn.
					</p>
					<table className="w-full border-collapse text-left text-base">
						<thead>
							<tr className="border-b border-[rgb(var(--page-border))]">
								<th className="py-2 pr-4 font-medium">Flavor</th>
								<th className="py-2 pr-4 font-medium">Dose</th>
								<th className="py-2 font-medium">Notes</th>
							</tr>
						</thead>
						<tbody>
							{FLAVOR_ROWS.map(({ key, label, note }) => {
								const entry = BASE_BIANCA_FLAVORS[key];
								const replaces =
									"replaceMilk" in entry && entry.replaceMilk ? " · −milk" : "";
								return (
									<tr
										key={key}
										className="border-b border-[rgb(var(--page-border))] align-top"
									>
										<td className="py-2 pr-4">{label}</td>
										<td className="py-2 pr-4 whitespace-nowrap tabular-nums">
											{flavorDoseLabel(key, mixForFlavors)}
											{replaces}
										</td>
										<td className="py-2 text-sm text-[rgb(var(--text-muted))]">
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
