import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { ActionsBar } from "@/components/ActionsBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Level, type Verdict, verify } from "./lib";

const TONE: Record<Level, { border: string; mark: string }> = {
	green: { border: "border-emerald-600", mark: "✓" },
	amber: { border: "border-amber-500", mark: "⚠" },
	red: { border: "border-destructive", mark: "✕" },
	grey: { border: "border-border", mark: "○" },
};

export default function App() {
	const [verdict, setVerdict] = useState<Verdict | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [pasted, setPasted] = useState("");
	const [busy, setBusy] = useState(false);

	const typed = pasted.trim();
	const input: File | string | null = file ?? (typed || null);

	const stage = (next: File | null) => {
		setFile(next);
		setVerdict(null);
		setError(null);
	};

	const clear = () => {
		setFile(null);
		setPasted("");
		setVerdict(null);
		setError(null);
		// The native input keeps the old file otherwise, and re-picking the same
		// one would fire no change event.
		if (inputRef.current) inputRef.current.value = "";
	};

	const check = async () => {
		if (!input) return;
		setBusy(true);
		setError(null);
		setVerdict(null);
		try {
			setVerdict(await verify(input));
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setBusy(false);
		}
	};

	const { getRootProps, getInputProps, isDragActive, inputRef } = useDropzone({
		multiple: false,
		accept: {
			"image/png": [".png"],
			"image/jpeg": [".jpg", ".jpeg"],
			"image/svg+xml": [".svg"],
			"application/jwt": [".jwt"],
			"application/json": [".json"],
		},
		onDrop: (files) => {
			if (files[0]) stage(files[0]);
		},
		// Without this a filtered-out file would vanish silently.
		onDropRejected: (rejections) =>
			setError(
				`${rejections[0]?.file.name ?? "That file"} is not a badge image, a .jwt or a .json file.`,
			),
	});

	return (
		<div className="space-y-6">
			<div aria-live="polite">
				{error && (
					<p
						className="border-l-4 border-destructive pl-4 text-sm"
						role="alert"
					>
						{error}
					</p>
				)}
				{verdict && <Panel verdict={verdict} />}
			</div>

			{/* One input at a time: a staged file hides the text box, and text hides the drop zone. */}
			{!typed && (
				<div
					{...getRootProps({
						className: cn(
							"cursor-pointer border border-dashed px-4 py-8 text-center transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25",
							isDragActive ? "border-primary bg-muted" : "border-border",
						),
					})}
				>
					<input {...getInputProps({ "aria-label": "Badge file" })} />
					{file ? (
						<p className="text-sm">
							{file.name}{" "}
							<span className="text-muted-foreground">
								— ready to verify. Drop another to replace it.
							</span>
						</p>
					) : (
						<p className="text-sm text-muted-foreground">
							{isDragActive
								? "Drop it here."
								: "Drop a badge here, or click to choose one."}
						</p>
					)}
					<p className="mt-3 text-xs text-muted-foreground">
						A badge image or a <code>.jwt</code> file. Credentials are baked
						into PNG and SVG; other images are searched anyway. Nothing is
						uploaded — the check runs in this tab.
					</p>
				</div>
			)}

			{!file && (
				<div className="space-y-2">
					<label
						className="block text-sm font-medium text-foreground"
						htmlFor="jwt"
					>
						Or paste the badge’s JWT, or its URL
					</label>
					<textarea
						id="jwt"
						rows={3}
						value={pasted}
						onChange={(e) => {
							setPasted(e.target.value);
							setVerdict(null);
							setError(null);
						}}
						placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6…  or  https://issuer.example/badge/ABC123"
						className="w-full border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
					/>
				</div>
			)}

			<ActionsBar>
				<span className="text-muted-foreground">
					{busy ? "Checking…" : input ? "Ready to verify" : "Nothing to verify"}
				</span>
				<div className="flex items-center gap-1.5">
					<Button
						type="button"
						variant="ghost"
						size="xs"
						disabled={busy || (!input && !verdict && !error)}
						onClick={clear}
					>
						Clear
					</Button>
					<Button
						type="button"
						size="xs"
						disabled={busy || !input}
						onClick={check}
					>
						Verify
					</Button>
				</div>
			</ActionsBar>
		</div>
	);
}

function Panel({ verdict }: { verdict: Verdict }) {
	const tone = TONE[verdict.level];

	return (
		<div className={cn("border-l-4 pl-4", tone.border)}>
			<p className="font-semibold">
				<span aria-hidden="true">{tone.mark}</span> {verdict.headline}
			</p>

			{verdict.achievement && <p className="mt-2">{verdict.achievement}</p>}

			<dl className="mt-2 space-y-1 text-sm">
				{verdict.awardedTo && <Row label="Awarded to">{verdict.awardedTo}</Row>}
				{verdict.awardedOn && <Row label="Awarded on">{verdict.awardedOn}</Row>}
				{verdict.issuer && (
					<Row label="Issuer">
						{verdict.issuer.url ? (
							<a href={verdict.issuer.url} rel="noreferrer noopener nofollow">
								{verdict.issuer.name}
							</a>
						) : (
							verdict.issuer.name
						)}
					</Row>
				)}
			</dl>

			{verdict.problems.length > 0 && (
				<ul className="mt-3 space-y-1 text-sm">
					{verdict.problems.map((p) => (
						<li key={p}>
							<span aria-hidden="true">⚠</span> {p}
						</li>
					))}
				</ul>
			)}

			{verdict.notes.length > 0 && (
				<ul className="mt-3 space-y-1 text-xs text-muted-foreground">
					{verdict.notes.map((n) => (
						<li key={n}>{n}</li>
					))}
				</ul>
			)}
		</div>
	);
}

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex gap-2">
			<dt className="text-muted-foreground">{label}</dt>
			<dd>{children}</dd>
		</div>
	);
}
