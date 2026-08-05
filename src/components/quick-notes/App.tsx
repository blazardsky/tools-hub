import Document from "@tiptap/extension-document";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { Footnote, FootnoteReference, Footnotes } from "tiptap-footnotes";
import { ActionsBar } from "@/components/ActionsBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EMPTY_DOC, FOCUS_CLASS } from "./const";
import {
	loadDoc,
	nextAutosaveDeadline,
	Small,
	saveDoc,
	saveStatusText,
	secondsUntil,
	slashCommandExtension,
} from "./lib";
import "./styles.css";

export default function App() {
	const [dirty, setDirty] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(60);
	const [focusMode, setFocusMode] = useState(false);
	const dirtyRef = useRef(false);
	const deadlineRef = useRef<number | null>(null);

	const markDirty = useCallback(() => {
		if (!dirtyRef.current) {
			dirtyRef.current = true;
			deadlineRef.current = nextAutosaveDeadline();
			setDirty(true);
			setSecondsLeft(60);
		}
	}, []);

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				document: false,
				blockquote: false,
				code: false,
				codeBlock: false,
				horizontalRule: false,
				strike: false,
				underline: false,
				link: false,
			}),
			Document.extend({
				content: "block+ footnotes?",
			}),
			Highlight.configure({ multicolor: false }),
			Link.configure({
				openOnClick: false,
				autolink: true,
				defaultProtocol: "https",
				HTMLAttributes: { rel: "noopener noreferrer nofollow" },
			}),
			TaskList,
			TaskItem.configure({ nested: true }),
			Placeholder.configure({
				placeholder: "Type / for commands…",
			}),
			Small,
			Footnotes,
			Footnote,
			FootnoteReference,
			slashCommandExtension(),
		],
		content: loadDoc(),
		editorProps: {
			attributes: {
				class: "tiptap",
				spellcheck: "true",
			},
		},
		onUpdate: () => {
			markDirty();
		},
	});

	const persist = useCallback(() => {
		if (!editor) return;
		saveDoc(editor.getJSON());
		dirtyRef.current = false;
		deadlineRef.current = null;
		setDirty(false);
	}, [editor]);

	useEffect(() => {
		if (!dirty) return;
		const id = window.setInterval(() => {
			const deadline = deadlineRef.current;
			if (deadline == null) return;
			const left = secondsUntil(deadline, Date.now());
			setSecondsLeft(left);
			if (left <= 0) persist();
		}, 250);
		return () => window.clearInterval(id);
	}, [dirty, persist]);

	useEffect(() => {
		const flush = () => {
			if (dirtyRef.current) persist();
		};
		const onVisibility = () => {
			if (document.visibilityState === "hidden") flush();
		};
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("pagehide", flush);
		return () => {
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("pagehide", flush);
		};
	}, [persist]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				persist();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [persist]);

	useEffect(() => {
		document.documentElement.classList.toggle(FOCUS_CLASS, focusMode);
		return () => {
			document.documentElement.classList.remove(FOCUS_CLASS);
		};
	}, [focusMode]);

	useEffect(() => {
		if (!focusMode) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setFocusMode(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [focusMode]);

	const clearNotes = () => {
		if (!editor) return;
		if (!window.confirm("Clear all notes? This cannot be undone.")) return;
		editor.commands.setContent(EMPTY_DOC);
		saveDoc(EMPTY_DOC);
		dirtyRef.current = false;
		deadlineRef.current = null;
		setDirty(false);
	};

	if (!editor) return null;

	return (
		<div className="qn-root">
			<div className="qn-editor-wrap qn-editor">
				{editor && (
					<BubbleMenu
						editor={editor}
						options={{ placement: "top" }}
						shouldShow={({ editor: ed, from, to }) =>
							from !== to && !ed.state.selection.empty
						}
					>
						<div className="qn-bubble">
							<button
								type="button"
								className={cn(editor.isActive("bold") && "is-active")}
								onClick={() => editor.chain().focus().toggleBold().run()}
								aria-label="Bold"
							>
								B
							</button>
							<button
								type="button"
								className={cn(editor.isActive("italic") && "is-active")}
								onClick={() => editor.chain().focus().toggleItalic().run()}
								aria-label="Italic"
							>
								<em>I</em>
							</button>
							<button
								type="button"
								className={cn(editor.isActive("highlight") && "is-active")}
								onClick={() => editor.chain().focus().toggleHighlight().run()}
								aria-label="Highlight"
							>
								HL
							</button>
							<button
								type="button"
								className={cn(editor.isActive("small") && "is-active")}
								onClick={() => editor.chain().focus().toggleSmall().run()}
								aria-label="Small text"
							>
								Aa
							</button>
						</div>
					</BubbleMenu>
				)}
				<EditorContent editor={editor} />
			</div>

			<ActionsBar role="status">
				<div className="flex items-center gap-1.5">
					<Button type="button" variant="ghost" size="xs" onClick={clearNotes}>
						Clear
					</Button>
					<span
						className="select-none text-muted-foreground"
						aria-hidden="true"
					>
						·
					</span>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						onClick={() => setFocusMode((v) => !v)}
						aria-pressed={focusMode}
					>
						{focusMode ? "Exit fullscreen" : "Fullscreen"}
					</Button>
				</div>
				<span className="text-right text-muted-foreground">
					{saveStatusText(dirty, secondsLeft)}
				</span>
			</ActionsBar>
		</div>
	);
}
