import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fieldClass, labelClass, MEASURE_OPTIONS } from "./const";
import { type Ingredient, scaleRecipe } from "./lib";

type Row = { id: number; name: string; quantity: string; measure: string };

let nextId = 1;
const emptyRow = (): Row => ({
	id: nextId++,
	name: "",
	quantity: "",
	measure: "g",
});

export default function App() {
	const [fromPeople, setFromPeople] = useState("4");
	const [toPeople, setToPeople] = useState("2");
	const [toGrams, setToGrams] = useState(false);
	const [rows, setRows] = useState<Row[]>([emptyRow()]);
	const [result, setResult] = useState<Ingredient[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	const updateRow = (id: number, patch: Partial<Row>) => {
		setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
		setResult(null);
	};

	const generate = () => {
		setError(null);
		const from = Number(fromPeople);
		const to = Number(toPeople);
		if (
			!Number.isFinite(from) ||
			from <= 0 ||
			!Number.isFinite(to) ||
			to <= 0
		) {
			setError("Enter positive numbers of people.");
			setResult(null);
			return;
		}
		const ingredients = rows
			.map((r) => ({
				name: r.name,
				quantity: Number(r.quantity),
				measure: r.measure,
			}))
			.filter(
				(i) => i.name.trim() && Number.isFinite(i.quantity) && i.quantity > 0,
			);
		if (ingredients.length === 0) {
			setError("Add at least one ingredient with a name and quantity.");
			setResult(null);
			return;
		}
		try {
			setResult(
				scaleRecipe({ fromPeople: from, toPeople: to, ingredients, toGrams }),
			);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Conversion failed.");
			setResult(null);
		}
	};

	return (
		<div className="space-y-8">
			<form
				className="space-y-6"
				onSubmit={(e) => {
					e.preventDefault();
					generate();
				}}
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<label htmlFor="fromPeople" className={labelClass}>
							Recipe serves
						</label>
						<input
							id="fromPeople"
							type="number"
							inputMode="numeric"
							min={1}
							step={1}
							value={fromPeople}
							onChange={(e) => {
								setFromPeople(e.target.value);
								setResult(null);
							}}
							className={fieldClass}
						/>
					</div>
					<div>
						<label htmlFor="toPeople" className={labelClass}>
							Desired servings
						</label>
						<input
							id="toPeople"
							type="number"
							inputMode="numeric"
							min={1}
							step={1}
							value={toPeople}
							onChange={(e) => {
								setToPeople(e.target.value);
								setResult(null);
							}}
							className={fieldClass}
						/>
					</div>
				</div>

				<fieldset className="space-y-3">
					<legend className={labelClass}>Ingredients</legend>
					<ul className="space-y-3">
						{rows.map((row, i) => (
							<li
								key={row.id}
								className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem_auto] sm:items-end"
							>
								<div>
									{i === 0 ? (
										<label htmlFor={`name-${row.id}`} className={labelClass}>
											Name
										</label>
									) : null}
									<input
										id={`name-${row.id}`}
										type="text"
										value={row.name}
										placeholder="e.g. flour"
										onChange={(e) =>
											updateRow(row.id, { name: e.target.value })
										}
										className={cn(fieldClass, i > 0 && "mt-0")}
									/>
								</div>
								<div>
									{i === 0 ? (
										<label htmlFor={`qty-${row.id}`} className={labelClass}>
											Qty
										</label>
									) : null}
									<input
										id={`qty-${row.id}`}
										type="number"
										inputMode="decimal"
										min={0}
										step="any"
										value={row.quantity}
										onChange={(e) =>
											updateRow(row.id, { quantity: e.target.value })
										}
										className={cn(fieldClass, i > 0 && "mt-0")}
									/>
								</div>
								<div>
									{i === 0 ? (
										<label htmlFor={`unit-${row.id}`} className={labelClass}>
											Measure
										</label>
									) : null}
									<select
										id={`unit-${row.id}`}
										value={row.measure}
										onChange={(e) =>
											updateRow(row.id, { measure: e.target.value })
										}
										className={cn(fieldClass, i > 0 && "mt-0")}
									>
										{MEASURE_OPTIONS.map((o) => (
											<option key={o.value} value={o.value}>
												{o.label}
											</option>
										))}
									</select>
								</div>
								<div className="flex gap-1">
									{rows.length > 1 ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											aria-label="Remove ingredient"
											onClick={() => {
												setRows((prev) => prev.filter((r) => r.id !== row.id));
												setResult(null);
											}}
										>
											Remove
										</Button>
									) : null}
								</div>
							</li>
						))}
					</ul>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => {
							setRows((prev) => [...prev, emptyRow()]);
							setResult(null);
						}}
					>
						Add ingredient
					</Button>
				</fieldset>

				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={toGrams}
						onChange={(e) => {
							setToGrams(e.target.checked);
							setResult(null);
						}}
					/>
					Convert all measures to grams
					<span className="text-muted-foreground">
						(volume uses water density ≈ 1 g/ml)
					</span>
				</label>

				<div className="flex gap-2">
					<Button type="submit">Generate</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setFromPeople("4");
							setToPeople("2");
							setToGrams(false);
							setRows([emptyRow()]);
							setResult(null);
							setError(null);
						}}
					>
						Reset
					</Button>
				</div>
			</form>

			<section aria-live="polite" className="space-y-3">
				{error ? <p className="text-destructive text-sm">{error}</p> : null}
				{result ? (
					<>
						<h2 className="text-xl font-semibold text-foreground">
							Scaled recipe
						</h2>
						<table className="w-full border-collapse text-left text-base">
							<thead>
								<tr className="border-b border-border">
									<th className="py-2 pr-4 font-medium">Ingredient</th>
									<th className="py-2 pr-4 font-medium">Quantity</th>
									<th className="py-2 font-medium">Measure</th>
								</tr>
							</thead>
							<tbody>
								{result.map((item, i) => (
									<tr key={i} className="border-b border-border">
										<td className="py-2 pr-4">{item.name}</td>
										<td className="py-2 pr-4 tabular-nums">{item.quantity}</td>
										<td className="py-2">{item.measure}</td>
									</tr>
								))}
							</tbody>
						</table>
					</>
				) : !error ? (
					<p className="text-muted-foreground text-sm">
						Add ingredients and click Generate to scale the recipe.
					</p>
				) : null}
			</section>
		</div>
	);
}
