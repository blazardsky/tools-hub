import type { JSONContent } from "@tiptap/core";

export const STORAGE_KEY = "tools-hub:quick-notes";
export const AUTOSAVE_MS = 60_000;
export const FOCUS_CLASS = "quick-notes-focus";

export const EMPTY_DOC: JSONContent = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

export type SlashId =
	| "paragraph"
	| "h1"
	| "h2"
	| "h3"
	| "bullet"
	| "ordered"
	| "task"
	| "footnote";

export type SlashItem = {
	id: SlashId;
	label: string;
	description: string;
};

export const SLASH_ITEMS: SlashItem[] = [
	{ id: "paragraph", label: "Text", description: "Plain paragraph" },
	{ id: "h1", label: "Heading 1", description: "Large section heading" },
	{ id: "h2", label: "Heading 2", description: "Medium section heading" },
	{ id: "h3", label: "Heading 3", description: "Small section heading" },
	{ id: "bullet", label: "Bullet list", description: "Unordered list" },
	{ id: "ordered", label: "Numbered list", description: "Ordered list" },
	{ id: "task", label: "To-do list", description: "Checklist with checkboxes" },
	{
		id: "footnote",
		label: "Footnote",
		description: "Add a footnote reference",
	},
];
