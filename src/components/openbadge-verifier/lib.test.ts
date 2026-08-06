/**
 * Run with: node --test src/components/openbadge-verifier/lib.test.ts
 *
 * Signs real RS256 badges and checks the verdicts that matter — untouched,
 * edited after signing, key on the wrong host, expired — plus the three ways a
 * credential arrives: baked image, raw JWT, and a URL.
 */

import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { verify } from "./lib.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
	modulusLength: 2048,
});
const jwk = publicKey.export({ format: "jwk" });

const ISSUER_HOST = "issuer.example";
const KID = `https://${ISSUER_HOST}/openbadge/keys/abc`;
const BADGE_URL = `https://${ISSUER_HOST}/badge/ABC123`;
const NOW = new Date("2026-06-01T00:00:00Z");

/** What the badge URL serves, and what the last request asked for. */
let served = "";
let lastAccept: string | null = null;

// A forger serves their own copy of a key, so any other URL answers with the key.
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
	if (String(url) === BADGE_URL) {
		lastAccept = new Headers(init?.headers).get("accept");
		return new Response(served, { headers: { "content-type": "text/plain" } });
	}
	return new Response(JSON.stringify(jwk));
}) as typeof fetch;

const credential = (extra: Record<string, unknown> = {}) => ({
	"@context": [
		"https://www.w3.org/ns/credentials/v2",
		"https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
	],
	id: `https://${ISSUER_HOST}/badge/ABC123`,
	type: ["VerifiableCredential", "OpenBadgeCredential"],
	issuer: {
		id: `https://${ISSUER_HOST}/`,
		type: ["Profile"],
		name: "Opencom",
		url: `https://${ISSUER_HOST}/`,
	},
	validFrom: "2026-03-12T10:00:00Z",
	credentialSubject: {
		id: "urn:uuid:0b1a7f3e-1111-5222-8333-444455556666",
		type: ["AchievementSubject"],
		name: "Mario Rossi",
		identifier: [
			{
				type: "IdentityObject",
				hashed: true,
				salt: "pepper",
				identityType: "emailAddress",
				identityHash: "sha256$deadbeef",
			},
		],
		achievement: {
			id: `https://${ISSUER_HOST}/courses/pasticceria`,
			type: ["Achievement"],
			name: "Corso di Pasticceria",
			description: "Fondamenti di pasticceria.",
			criteria: { narrative: "Complete all lessons and pass all quizzes." },
		},
		result: [{ type: ["Result"], status: "Completed" }],
	},
	...extra,
});

const b64url = (input: string) => Buffer.from(input).toString("base64url");

function makeJwt(body: object, kid = KID): string {
	const header = b64url(JSON.stringify({ alg: "RS256", kid }));
	const payload = b64url(JSON.stringify(body));
	const signature = sign(
		"sha256",
		Buffer.from(`${header}.${payload}`),
		privateKey,
	);
	return `${header}.${payload}.${signature.toString("base64url")}`;
}

/** Wrap a credential in the smallest PNG our reader will walk: an iTXt chunk. */
function bake(jwt: string): File {
	const keyword = Buffer.from("openbadgecredential");
	// keyword \0 compressionFlag compressionMethod languageTag \0 translatedKeyword \0 text
	const data = Buffer.concat([keyword, Buffer.alloc(5), Buffer.from(jwt)]);
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const png = Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		length,
		Buffer.from("iTXt"),
		data,
		Buffer.alloc(4), // CRC — unchecked by the reader
	]);
	return new File([png], "badge.png", { type: "image/png" });
}

test("a baked, untouched badge from its own issuer is valid", async () => {
	const verdict = await verify(bake(makeJwt(credential())), NOW);
	assert.equal(verdict.level, "green");
	assert.deepEqual(verdict.problems, []);
	assert.equal(verdict.awardedTo, "Mario Rossi");
	assert.equal(verdict.achievement, "Corso di Pasticceria");
	assert.equal(verdict.issuer?.name, "Opencom");
	// A date a person can read, not the raw timestamp.
	assert.doesNotMatch(verdict.awardedOn ?? "", /T\d\d:/);
});

test("editing the payload after signing reads as tampered", async () => {
	const [header, , signature] = makeJwt(credential()).split(".");
	const edited = credential();
	edited.credentialSubject.name = "Someone Else";
	const forged = `${header}.${b64url(JSON.stringify(edited))}.${signature}`;

	const verdict = await verify(bake(forged), NOW);
	assert.equal(verdict.level, "red");
	assert.match(verdict.headline, /Tampered/);
});

test("a valid signature from a key on another host is not green", async () => {
	const jwt = makeJwt(credential(), "https://evil.example/key");
	const verdict = await verify(bake(jwt), NOW);
	assert.equal(verdict.level, "amber");
	assert.match(verdict.problems.join(" "), /evil\.example/);
	assert.match(verdict.problems.join(" "), new RegExp(ISSUER_HOST));
});

test("an expired badge is not green", async () => {
	const jwt = makeJwt(credential({ validUntil: "2026-04-01T00:00:00Z" }));
	const verdict = await verify(bake(jwt), NOW);
	assert.equal(verdict.level, "amber");
	assert.match(verdict.problems.join(" "), /expired/);
});

test("a raw JWT string verifies without an image", async () => {
	const verdict = await verify(makeJwt(credential()), NOW);
	assert.equal(verdict.level, "green");
});

test("a badge URL is fetched as a credential, not as a web page", async () => {
	served = makeJwt(credential());
	const verdict = await verify(BADGE_URL, NOW);
	assert.equal(verdict.level, "green");
	// Without this the issuer serves the badge card or JSON-LD instead.
	assert.match(lastAccept ?? "", /application\/jwt/);
});

test("a JPEG carrying a credential is still read", async () => {
	// A JPEG comment segment, which no OB spec defines — so we scan rather than parse.
	const jpeg = new File(
		[
			Buffer.concat([
				Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
				Buffer.from(makeJwt(credential())),
				Buffer.from([0xff, 0xd9]),
			]),
		],
		"badge.jpg",
	);
	const verdict = await verify(jpeg, NOW);
	assert.equal(verdict.level, "green");
});

test("a JPEG with no credential says why it probably has none", async () => {
	const jpeg = new File(
		[Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
		"badge.jpg",
	);
	await assert.rejects(verify(jpeg, NOW), /only PNG and SVG/);
});

test("a PNG that kept the credential outside an iTXt chunk is still read", async () => {
	const jwt = makeJwt(credential());
	const png = Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		Buffer.from(jwt), // no chunk framing at all
	]);
	const verdict = await verify(new File([png], "badge.png"), NOW);
	assert.equal(verdict.level, "green");
});
