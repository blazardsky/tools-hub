/**
 * Open Badges 3.0 verification, entirely in the browser.
 *
 * Scope and its reasons are recorded in docs/adr/0001-browser-only-vc-jwt-verification.md.
 * The short version: we verify the VC-JWT envelope only, and a cryptographically
 * valid signature is *not* enough for a green verdict — the key must be served by
 * the host the credential names as its issuer, or the signature proves nothing
 * about that issuer.
 */

/** VC-DM 2.0 base context — MUST be `@context[0]`. */
const VC_CONTEXT = "https://www.w3.org/ns/credentials/v2";

/** OB 3.0 context — MUST be `@context[1]` and match this shape. */
const OB_CONTEXT_RE =
	/^https:\/\/purl\.imsglobal\.org\/spec\/ob\/v3p0\/context(-3\.\d\.\d)*\.json$/;

/** PNG iTXt keywords that carry a baked credential. OB 3.0 uses the first. */
const BAKE_KEYWORDS = ["openbadgecredential", "openbadges"];

/** SVG baking namespace (STANDARD.md §7). */
const OB_SVG_NS = "https://purl.imsglobal.org/ob/v3p0";

/**
 * JOSE `alg` → WebCrypto params. RS256 is the spec's required minimum; the
 * others are permitted. An `alg` absent here yields "unsupported algorithm"
 * rather than a false failure.
 */
const ALGS: Record<string, { name: string; hash?: string }> = {
	RS256: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
	PS256: { name: "RSA-PSS", hash: "SHA-256" },
	ES256: { name: "ECDSA", hash: "SHA-256" },
	EdDSA: { name: "Ed25519" },
};

export type Level = "green" | "amber" | "red" | "grey";

export type Verdict = {
	level: Level;
	headline: string;
	/** Reasons the verdict is not green. */
	problems: string[];
	/** Context that doesn't change the verdict. */
	notes: string[];
	awardedTo: string | null;
	achievement: string | null;
	awardedOn: string | null;
	issuer: { name: string; url: string | null } | null;
};

/** A string that is either a plain string or a VC-DM language value object. */
function text(value: unknown): string | null {
	if (typeof value === "string") return value;
	if (value && typeof value === "object" && "@value" in value) {
		const v = (value as { "@value": unknown })["@value"];
		return typeof v === "string" ? v : null;
	}
	return null;
}

function bytes(b64url: string): Uint8Array<ArrayBuffer> {
	const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
	const out = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
	return out;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
	const stream = new Blob([data as BlobPart])
		.stream()
		.pipeThrough(new DecompressionStream("deflate"));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Pull the credential out of a PNG's `iTXt` chunk.
 *
 * Chunk data is `keyword \0 compressionFlag compressionMethod languageTag \0
 * translatedKeyword \0 text`. OB mandates uncompressed, but the flag exists so
 * we honour it.
 */
async function fromPng(buf: Uint8Array): Promise<string> {
	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	const ascii = (from: number, len: number) =>
		String.fromCharCode(...buf.subarray(from, from + len));

	for (let pos = 8; pos + 12 <= buf.length; ) {
		const len = view.getUint32(pos);
		const type = ascii(pos + 4, 4);
		const data = buf.subarray(pos + 8, pos + 8 + len);
		pos += 12 + len;
		if (type !== "iTXt") continue;

		const nul = data.indexOf(0);
		const keyword = String.fromCharCode(...data.subarray(0, nul));
		if (!BAKE_KEYWORDS.includes(keyword)) continue;

		const compressed = data[nul + 1] === 1;
		// Skip the two flag bytes, then the language and translated-keyword strings.
		let cursor = nul + 3;
		for (let skipped = 0; skipped < 2; skipped++)
			cursor = data.indexOf(0, cursor) + 1;
		const payload = data.subarray(cursor);
		return new TextDecoder().decode(
			compressed ? await inflate(payload) : payload,
		);
	}
	return null;
}

/** STANDARD.md §7: `<openbadges:credential>`, JWT in `verify` or JSON in a CDATA child. */
function fromSvg(source: string): string | null {
	if (typeof DOMParser === "undefined") return null;
	const doc = new DOMParser().parseFromString(source, "image/svg+xml");
	const el = doc.getElementsByTagNameNS(OB_SVG_NS, "credential")[0];
	return el?.getAttribute("verify") || el?.textContent?.trim() || null;
}

const JWT_RE = /^[\w-]+\.[\w-]+\.[\w-]+$/;

/**
 * Last resort: find a JWT anywhere in the raw bytes.
 *
 * A JOSE header always begins `{"`, so a compact JWS always begins `eyJ`. This
 * catches a credential parked somewhere we don't parse — a PNG `tEXt` chunk, a
 * JPEG comment segment, an editor's re-wrap — at the cost of nothing, since a
 * false positive fails the signature check a moment later.
 */
function scanForJwt(buf: Uint8Array): string | null {
	// latin1 never throws on arbitrary bytes, and base64url is ASCII anyway.
	const raw = new TextDecoder("latin1").decode(buf);
	return raw.match(/eyJ[\w-]{8,}\.[\w-]{16,}\.[\w-]{16,}/)?.[0] ?? null;
}

type Container = "png" | "jpeg" | "svg" | "other";

function sniff(buf: Uint8Array, head: string): Container {
	if (head.startsWith("\x89PNG\r\n\x1a\n")) return "png";
	if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
	if (/^\s*(<\?xml|<svg|<!doctype svg)/i.test(head)) return "svg";
	return "other";
}

const NOT_FOUND: Record<Container, string> = {
	png: "No Open Badge found in this PNG. It may be a plain image, or an editor may have re-saved it and dropped the badge data.",
	jpeg: "No Open Badge found in this JPEG. No Open Badges specification defines baking into JPEG — only PNG and SVG — so it most likely never carried one. Ask the issuer for the PNG.",
	svg: "No Open Badge found in this SVG. A baked SVG carries an <openbadges:credential> element.",
	other:
		"This holds neither a signed badge (JWT) nor a credential in JSON. Try the badge image, its .jwt file, or its URL.",
};

/**
 * Ask the issuer for the credential itself.
 *
 * `application/jwt` is what makes a badge URL serve the signed JWS rather than
 * the human badge page; without it a conforming issuer answers with JSON-LD,
 * which this tool cannot verify yet. `Accept` is CORS-safelisted, so naming it
 * costs no preflight.
 */
async function fetchBadge(url: string): Promise<File> {
	let res: Response;
	try {
		res = await fetch(url, {
			headers: { Accept: "application/jwt, application/vc+ld+json;q=0.9" },
		});
	} catch {
		throw new Error(
			`Could not reach ${url}. The site may be down, or may not allow other websites to read it.`,
		);
	}
	if (!res.ok) throw new Error(`${url} answered with HTTP ${res.status}.`);
	return new File([await res.blob()], "badge");
}

/** Locate the credential and say which form it took. */
export async function extract(
	input: File | string,
): Promise<{ jwt: string } | { json: string }> {
	if (typeof input === "string") {
		const source = input.trim();
		if (/^https?:\/\//i.test(source)) return extract(await fetchBadge(source));
		return classify(source, NOT_FOUND.other);
	}

	const buf = new Uint8Array(await input.arrayBuffer());
	const head = String.fromCharCode(...buf.subarray(0, 64));
	const container = sniff(buf, head);
	const asText = () => new TextDecoder().decode(buf).trim();

	const found =
		(container === "png" ? await fromPng(buf) : null) ??
		(container === "svg" ? fromSvg(asText()) : null) ??
		// A bare .jwt / .json file. Binary never matches, so this is safe for any
		// container, and falling through to the scan is what makes JPEG worth trying.
		credentialOrNull(asText()) ??
		scanForJwt(buf);

	if (!found) throw new Error(NOT_FOUND[container]);
	return classify(found.trim(), NOT_FOUND[container]);
}

function credentialOrNull(source: string): string | null {
	return JWT_RE.test(source) || source.startsWith("{") ? source : null;
}

function classify(
	source: string,
	notFound: string,
): { jwt: string } | { json: string } {
	if (JWT_RE.test(source)) return { jwt: source };
	if (source.startsWith("{")) return { json: source };
	throw new Error(notFound);
}

type Jwt = {
	header: { alg?: string; kid?: string; jwk?: JsonWebKey };
	payload: Record<string, unknown>;
	signed: Uint8Array<ArrayBuffer>;
	signature: Uint8Array<ArrayBuffer>;
};

function decodeJwt(jwt: string): Jwt {
	const [h, p, s] = jwt.split(".");
	try {
		return {
			header: JSON.parse(new TextDecoder().decode(bytes(h))),
			payload: JSON.parse(new TextDecoder().decode(bytes(p))),
			signed: new TextEncoder().encode(`${h}.${p}`),
			signature: bytes(s),
		};
	} catch {
		throw new Error(
			"This badge is not a readable JWT — its header or payload is corrupt.",
		);
	}
}

/** Keep only key material: a stray `key_ops` or `alg` makes WebCrypto reject the import. */
function cleanJwk(jwk: JsonWebKey): JsonWebKey {
	const { kty, n, e, crv, x, y } = jwk;
	if (kty === "RSA") return { kty, n, e };
	if (kty === "EC") return { kty, crv, x, y };
	return { kty, crv, x };
}

async function verifySignature(jwt: Jwt, jwk: JsonWebKey): Promise<boolean> {
	const spec = ALGS[jwt.header.alg ?? ""];
	if (!spec)
		throw new Error(`Unsupported signing algorithm "${jwt.header.alg}".`);

	const importParams =
		spec.name === "ECDSA"
			? { name: spec.name, namedCurve: jwk.crv ?? "P-256" }
			: { name: spec.name, hash: spec.hash };
	const verifyParams =
		spec.name === "RSA-PSS"
			? { name: spec.name, saltLength: 32 }
			: spec.name === "ECDSA"
				? { name: spec.name, hash: spec.hash }
				: { name: spec.name };

	const key = await crypto.subtle.importKey(
		"jwk",
		cleanJwk(jwk),
		importParams,
		false,
		["verify"],
	);
	return crypto.subtle.verify(verifyParams, key, jwt.signature, jwt.signed);
}

/** The OB 3.0 shape rules a signed payload must still satisfy (VC-SPEC.md §18 step 3). */
function conformanceProblems(p: Record<string, unknown>): string[] {
	const out: string[] = [];
	const ctx = p["@context"];
	if (!Array.isArray(ctx) || ctx[0] !== VC_CONTEXT) {
		out.push(
			"@context does not start with the W3C Verifiable Credentials v2 context.",
		);
	} else if (typeof ctx[1] !== "string" || !OB_CONTEXT_RE.test(ctx[1])) {
		out.push(
			"@context is missing the Open Badges 3.0 context in second position.",
		);
	}

	const types = Array.isArray(p.type) ? p.type : [p.type];
	if (!types.includes("VerifiableCredential"))
		out.push('type is missing "VerifiableCredential".');
	if (
		!types.includes("OpenBadgeCredential") &&
		!types.includes("AchievementCredential")
	) {
		out.push('type is missing "OpenBadgeCredential".');
	}

	if (!p.issuer) out.push("issuer is missing.");
	if (!p.validFrom) out.push("validFrom is missing.");
	const subject = p.credentialSubject as Record<string, unknown> | undefined;
	if (!subject) out.push("credentialSubject is missing.");
	else if (!subject.achievement)
		out.push("credentialSubject.achievement is missing.");

	return out;
}

function issuerOf(p: Record<string, unknown>): Verdict["issuer"] {
	const raw = p.issuer;
	if (typeof raw === "string") return { name: safeHost(raw) ?? raw, url: raw };
	if (!raw || typeof raw !== "object") return null;
	const o = raw as Record<string, unknown>;
	const url = text(o.url) ?? text(o.id);
	return { name: text(o.name) ?? safeHost(url ?? "") ?? "Unknown issuer", url };
}

function safeHost(url: string): string | null {
	try {
		return new URL(url).host;
	} catch {
		return null;
	}
}

function issuerId(p: Record<string, unknown>): string | null {
	const raw = p.issuer;
	if (typeof raw === "string") return raw;
	if (raw && typeof raw === "object")
		return text((raw as Record<string, unknown>).id);
	return null;
}

/** Decide the verdict from an already-decoded, already-signature-checked badge. */
export function assess(
	jwt: Jwt,
	signatureValid: boolean,
	keySource: { kid: string | null; fromHeader: boolean },
	now = new Date(),
): Verdict {
	const p = jwt.payload;
	const subject = (p.credentialSubject ?? {}) as Record<string, unknown>;
	const achievement = (subject.achievement ?? {}) as Record<string, unknown>;
	const identifier = Array.isArray(subject.identifier)
		? subject.identifier[0]
		: null;

	const shell: Verdict = {
		level: "red",
		headline: "",
		problems: [],
		notes: [],
		awardedTo: text(subject.name),
		achievement: text(achievement.name),
		awardedOn: formatDate(text(p.awardedDate) ?? text(p.validFrom) ?? ""),
		issuer: issuerOf(p),
	};

	if (!signatureValid) {
		return {
			...shell,
			headline: "Tampered or signed by a different key",
			problems: [
				"The signature does not match the badge contents. Either the badge was edited after it was issued, or it was not signed by the key it points to.",
			],
		};
	}

	const problems = conformanceProblems(p);

	const claimedHost = safeHost(issuerId(p) ?? "");
	const keyHost = keySource.kid ? safeHost(keySource.kid) : null;
	if (keySource.fromHeader) {
		problems.push(
			"The badge carries its own public key instead of pointing to one on the issuer's website. Anyone can do that, so this proves nothing about who issued it.",
		);
	} else if (!claimedHost || !keyHost) {
		problems.push(
			"The issuer or its key is not identified by an https address.",
		);
	} else if (claimedHost !== keyHost) {
		problems.push(
			`Signed with a key from ${keyHost}, but the badge claims to be issued by ${claimedHost}. This does not prove ${claimedHost} issued it.`,
		);
	}

	const validUntil = text(p.validUntil);
	const validFrom = text(p.validFrom);
	if (validUntil && new Date(validUntil) < now) {
		problems.push(`This badge expired on ${formatDate(validUntil)}.`);
	}
	if (validFrom && new Date(validFrom) > now) {
		problems.push(`This badge is not valid until ${formatDate(validFrom)}.`);
	}

	const notes: string[] = [];
	if (!shell.awardedTo && identifier && typeof identifier === "object") {
		const id = identifier as Record<string, unknown>;
		notes.push(
			id.hashed
				? "The recipient is identified only by a hashed email address, so this badge carries no name."
				: `Recipient identified as ${text(id.identityHash) ?? "unknown"}.`,
		);
	}
	if (p.credentialStatus) {
		notes.push(
			"This badge supports revocation. This tool does not check revocation lists, so it could have been withdrawn by its issuer.",
		);
	}
	if (p.proof) {
		notes.push(
			"It also carries an embedded Data Integrity proof, which this tool does not check. The signature verified above is the JWT envelope.",
		);
	}

	return {
		...shell,
		level: problems.length ? "amber" : "green",
		headline: problems.length
			? "Signature valid, but the issuer is unproven"
			: "Valid — signed by its issuer, unaltered",
		problems,
		notes,
	};
}

function formatDate(value: string): string | null {
	if (!value) return null;
	const d = new Date(value);
	return Number.isNaN(d.getTime())
		? value
		: d.toLocaleDateString(undefined, {
				day: "numeric",
				month: "long",
				year: "numeric",
			});
}

const grey = (headline: string, problems: string[]): Verdict => ({
	level: "grey",
	headline,
	problems,
	notes: [],
	awardedTo: null,
	achievement: null,
	awardedOn: null,
	issuer: null,
});

/** Read a badge and say whether it is what it claims to be. */
export async function verify(
	input: File | string,
	now = new Date(),
): Promise<Verdict> {
	const found = await extract(input);

	if ("json" in found) {
		return grey("Unsigned JSON — not verified yet", [
			"This is a credential in JSON form. Checking its embedded proof needs machinery this tool does not have yet, so nothing here is verified. Upload the badge image or its .jwt file for a real answer.",
		]);
	}

	const jwt = decodeJwt(found.jwt);
	const { kid, jwk } = jwt.header;

	if (!kid && !jwk) {
		return grey("Cannot check this badge", [
			"It does not say which key signed it, so the signature cannot be checked.",
		]);
	}
	if (!jwk && kid && !/^https:/i.test(kid)) {
		return grey("Cannot check this badge", [
			`Its key is published as "${kid}". This tool can only fetch keys from https addresses.`,
		]);
	}

	let key = jwk;
	if (!key && kid) {
		try {
			const res = await fetch(kid);
			if (!res.ok) throw new Error(String(res.status));
			key = await res.json();
		} catch {
			return grey("Signature not checked — issuer key unreachable", [
				`Could not fetch the public key from ${kid}. The issuer's site may be down, or may not allow other websites to read its key. The badge is not necessarily invalid.`,
			]);
		}
	}

	try {
		const valid = await verifySignature(jwt, key as JsonWebKey);
		return assess(jwt, valid, { kid: kid ?? null, fromHeader: !!jwk }, now);
	} catch (err) {
		return grey("Cannot check this badge", [(err as Error).message]);
	}
}
