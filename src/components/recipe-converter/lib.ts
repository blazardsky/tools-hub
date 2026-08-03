import "./global-polyfill";
import convert from "convert-units";
import {
	CULINARY_ML,
	type CulinaryUnit,
	MEASURE_ALIASES,
	WATER_G_PER_ML,
} from "./const";

export type Ingredient = {
	name: string;
	quantity: number;
	measure: string;
};

export type ConvertInput = {
	fromPeople: number;
	toPeople: number;
	ingredients: Ingredient[];
	toGrams?: boolean;
};

const MASS = new Set(["mcg", "mg", "g", "kg", "mt", "oz", "lb", "t"]);
const VOLUME = new Set([
	"mm3",
	"cm3",
	"ml",
	"cl",
	"dl",
	"l",
	"kl",
	"m3",
	"km3",
	"tsp",
	"Tbs",
	"in3",
	"fl-oz",
	"cup",
	"pnt",
	"qt",
	"gal",
	"ft3",
	"yd3",
]);

const round = (n: number) => {
	if (n === 0) return 0;
	if (Math.abs(n) >= 100) return Math.round(n * 10) / 10;
	if (Math.abs(n) >= 1) return Math.round(n * 100) / 100;
	return Math.round(n * 1000) / 1000;
};

function culinaryKey(measure: string): CulinaryUnit | null {
	return MEASURE_ALIASES[measure.trim().toLowerCase()] ?? null;
}

/** Volume in ml for a culinary or convert-units volume measure. */
export function toMl(quantity: number, measure: string): number {
	const key = culinaryKey(measure);
	if (key) return quantity * CULINARY_ML[key];

	const abbr = measure.trim();
	if (VOLUME.has(abbr))
		return convert(quantity)
			.from(abbr as "ml")
			.to("ml");
	// convert-units uses Tbs / tsp; accept common casing
	const lower = abbr.toLowerCase();
	if (lower === "tbsp" || lower === "tbs")
		return convert(quantity).from("Tbs").to("ml");
	if (lower === "tsp") return convert(quantity).from("tsp").to("ml");
	throw new Error(`Unknown volume measure: ${measure}`);
}

export function toGrams(quantity: number, measure: string): number {
	const abbr = measure.trim();
	if (MASS.has(abbr))
		return convert(quantity)
			.from(abbr as "g")
			.to("g");

	const key = culinaryKey(measure);
	if (key) return quantity * CULINARY_ML[key] * WATER_G_PER_ML;

	if (VOLUME.has(abbr) || ["tbsp", "tbs", "tsp"].includes(abbr.toLowerCase())) {
		return toMl(quantity, measure) * WATER_G_PER_ML;
	}

	throw new Error(`Cannot convert measure to grams: ${measure}`);
}

export function scaleRecipe({
	fromPeople,
	toPeople,
	ingredients,
	toGrams: asGrams = false,
}: ConvertInput): Ingredient[] {
	if (fromPeople <= 0 || toPeople <= 0) {
		throw new Error("People counts must be positive");
	}
	const factor = toPeople / fromPeople;

	return ingredients
		.filter(
			(i) => i.name.trim() && Number.isFinite(i.quantity) && i.quantity > 0,
		)
		.map((i) => {
			const qty = i.quantity * factor;
			if (!asGrams) {
				return {
					name: i.name.trim(),
					quantity: round(qty),
					measure: i.measure,
				};
			}
			return {
				name: i.name.trim(),
				quantity: round(toGrams(qty, i.measure)),
				measure: "g",
			};
		});
}

/** Self-check — run: npx tsx -e "import { __selfCheck } from './src/components/recipe-converter/lib.ts'; __selfCheck()" */
export function __selfCheck() {
	const assert = (ok: boolean, msg: string) => {
		if (!ok) throw new Error(msg);
	};
	assert(toMl(1, "cup") === 240, "cup → 240 ml");
	assert(toMl(1, "spoon") === 15, "spoon → 15 ml");
	assert(toMl(1, "teaspoon") === 5, "tsp → 5 ml");
	assert(toMl(1, "pinch") === 0.3, "pinch → 0.3 ml");
	assert(toGrams(1, "cup") === 240, "cup water → 240 g");
	assert(toGrams(2, "kg") === 2000, "2 kg → 2000 g");
	const out = scaleRecipe({
		fromPeople: 2,
		toPeople: 4,
		ingredients: [{ name: "flour", quantity: 1, measure: "cup" }],
		toGrams: true,
	});
	assert(
		out[0]?.quantity === 480 && out[0].measure === "g",
		"scale 2→4 + grams",
	);
	const scaled = scaleRecipe({
		fromPeople: 4,
		toPeople: 2,
		ingredients: [{ name: "salt", quantity: 2, measure: "teaspoon" }],
	});
	assert(
		scaled[0]?.quantity === 1 && scaled[0].measure === "teaspoon",
		"halve tsp",
	);
	console.log("recipe-converter self-check ok");
}
