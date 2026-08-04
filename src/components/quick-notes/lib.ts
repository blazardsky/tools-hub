import { type Editor, Extension, type JSONContent, Mark } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import {
	AUTOSAVE_MS,
	EMPTY_DOC,
	SLASH_ITEMS,
	type SlashId,
	type SlashItem,
	STORAGE_KEY,
} from "./const";

export const Small = Mark.create({
	name: "small",
	parseHTML() {
		return [{ tag: "small" }];
	},
	renderHTML({ HTMLAttributes }) {
		return ["small", HTMLAttributes, 0];
	},
	addCommands() {
		return {
			toggleSmall:
				() =>
				({ commands }) =>
					commands.toggleMark(this.name),
		};
	},
});

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		small: {
			toggleSmall: () => ReturnType;
		};
	}
}

export function parseStoredDoc(raw: string | null): JSONContent {
	if (!raw) return EMPTY_DOC;
	try {
		const parsed = JSON.parse(raw) as JSONContent;
		if (parsed?.type === "doc" && Array.isArray(parsed.content)) return parsed;
	} catch {
		/* ignore */
	}
	return EMPTY_DOC;
}

export function serializeDoc(doc: JSONContent): string {
	return JSON.stringify(doc);
}

export function loadDoc(): JSONContent {
	if (typeof localStorage === "undefined") return EMPTY_DOC;
	return parseStoredDoc(localStorage.getItem(STORAGE_KEY));
}

export function saveDoc(doc: JSONContent): void {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(STORAGE_KEY, serializeDoc(doc));
}

export function saveStatusText(dirty: boolean, secondsLeft: number): string {
	if (!dirty) return "All changes saved";
	return `Next save in ${secondsLeft}s`;
}

export function secondsUntil(deadlineMs: number, nowMs: number): number {
	return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function nextAutosaveDeadline(nowMs = Date.now()): number {
	return nowMs + AUTOSAVE_MS;
}

export function filterSlashItems(query: string): SlashItem[] {
	const q = query.toLowerCase().trim();
	if (!q) return SLASH_ITEMS;
	return SLASH_ITEMS.filter(
		(item) =>
			item.label.toLowerCase().includes(q) ||
			item.id.includes(q) ||
			item.description.toLowerCase().includes(q),
	);
}

export function runSlashCommand(
	editor: Editor,
	range: { from: number; to: number },
	id: SlashId,
): void {
	const chain = editor.chain().focus().deleteRange(range);
	switch (id) {
		case "paragraph":
			chain.setParagraph().run();
			break;
		case "h1":
			chain.setHeading({ level: 1 }).run();
			break;
		case "h2":
			chain.setHeading({ level: 2 }).run();
			break;
		case "h3":
			chain.setHeading({ level: 3 }).run();
			break;
		case "bullet":
			chain.toggleBulletList().run();
			break;
		case "ordered":
			chain.toggleOrderedList().run();
			break;
		case "task":
			chain.toggleTaskList().run();
			break;
		case "footnote":
			chain.addFootnote().run();
			break;
	}
}

function positionSlashMenu(
	el: HTMLElement,
	clientRect: (() => DOMRect | null) | null | undefined,
) {
	const rect = clientRect?.();
	if (!rect) return;
	el.style.left = `${Math.min(rect.left, window.innerWidth - 260)}px`;
	el.style.top = `${rect.bottom + 6}px`;
}

function renderSlashMenu(
	el: HTMLElement,
	items: SlashItem[],
	selected: number,
	onPick: (item: SlashItem) => void,
) {
	el.replaceChildren();
	if (items.length === 0) {
		const empty = document.createElement("div");
		empty.className = "qn-slash-empty";
		empty.textContent = "No matches";
		el.append(empty);
		return;
	}
	for (const [i, item] of items.entries()) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = `qn-slash-item${i === selected ? " is-selected" : ""}`;
		btn.innerHTML = `<span class="qn-slash-label">${item.label}</span><span class="qn-slash-desc">${item.description}</span>`;
		btn.addEventListener("mousedown", (e) => {
			e.preventDefault();
			onPick(item);
		});
		el.append(btn);
	}
}

export function slashCommandExtension() {
	return Extension.create({
		name: "slashCommand",
		addOptions() {
			return {
				suggestion: {
					char: "/",
					pluginKey: new PluginKey("quickNotesSlash"),
					allowSpaces: false,
					items: ({ query }: { query: string }) => filterSlashItems(query),
					command: ({
						editor,
						range,
						props,
					}: {
						editor: Editor;
						range: { from: number; to: number };
						props: SlashItem;
					}) => {
						runSlashCommand(editor, range, props.id);
					},
					render: () => {
						let el: HTMLDivElement | null = null;
						let selected = 0;
						let latest: SuggestionProps<SlashItem> | null = null;

						const refresh = () => {
							if (!el || !latest) return;
							const items = latest.items;
							selected = Math.min(selected, Math.max(0, items.length - 1));
							renderSlashMenu(el, items, selected, (item) => {
								latest?.command(item);
							});
							positionSlashMenu(el, latest.clientRect);
						};

						return {
							onStart: (props: SuggestionProps<SlashItem>) => {
								latest = props;
								selected = 0;
								el = document.createElement("div");
								el.className = "qn-slash";
								document.body.append(el);
								refresh();
							},
							onUpdate: (props: SuggestionProps<SlashItem>) => {
								latest = props;
								refresh();
							},
							onKeyDown: ({ event }: { event: KeyboardEvent }) => {
								if (!latest || !el) return false;
								const items = latest.items;
								if (event.key === "ArrowDown") {
									event.preventDefault();
									selected = items.length ? (selected + 1) % items.length : 0;
									refresh();
									return true;
								}
								if (event.key === "ArrowUp") {
									event.preventDefault();
									selected = items.length
										? (selected - 1 + items.length) % items.length
										: 0;
									refresh();
									return true;
								}
								if (event.key === "Enter") {
									event.preventDefault();
									const item = items[selected];
									if (item) latest.command(item);
									return true;
								}
								if (event.key === "Escape") {
									return true;
								}
								return false;
							},
							onExit: () => {
								el?.remove();
								el = null;
								latest = null;
							},
						};
					},
				},
			};
		},
		addProseMirrorPlugins() {
			return [
				Suggestion({
					editor: this.editor,
					...this.options.suggestion,
				}),
			];
		},
	});
}

/** Self-check — run: npx tsx -e "import { __selfCheck } from './src/components/quick-notes/lib.ts'; __selfCheck()" */
export function __selfCheck() {
	const assert = (ok: boolean, msg: string) => {
		if (!ok) throw new Error(msg);
	};

	assert(saveStatusText(false, 12) === "All changes saved", "clean status");
	assert(saveStatusText(true, 45) === "Next save in 45s", "dirty status");
	assert(secondsUntil(1_000_000, 940_000) === 60, "60s left");
	assert(secondsUntil(1_000_000, 1_000_500) === 0, "past deadline");

	const roundTrip = parseStoredDoc(
		serializeDoc({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [{ type: "text", text: "hello" }],
				},
			],
		}),
	);
	assert(roundTrip.type === "doc", "round-trip type");
	assert(
		(roundTrip.content?.[0] as { content?: { text?: string }[] })?.content?.[0]
			?.text === "hello",
		"round-trip text",
	);
	assert(parseStoredDoc(null).type === "doc", "null → empty doc");
	assert(parseStoredDoc("{not json").type === "doc", "bad json → empty");
	assert(parseStoredDoc('{"type":"x"}').type === "doc", "bad shape → empty");

	assert(filterSlashItems("").length === SLASH_ITEMS.length, "all items");
	assert(
		filterSlashItems("head").some((i) => i.id === "h1"),
		"filter h1",
	);
	assert(filterSlashItems("zzz").length === 0, "no matches");
	assert(filterSlashItems("foot")[0]?.id === "footnote", "filter footnote");

	const deadline = nextAutosaveDeadline(0);
	assert(deadline === AUTOSAVE_MS, "autosave deadline");

	console.log("quick-notes self-check ok");
}
