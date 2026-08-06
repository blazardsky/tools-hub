# The OpenBadge verifier checks the VC-JWT envelope in the browser, and a valid signature alone is not enough

Date: 2026-08-06.

The tool answers one question for a person holding a badge image: is this still
the credential its issuer signed, or has it been altered? It is deliberately not
a conformance suite — 1EdTech already runs one at vc.1ed.tech, and the
[digital-credentials-public-validator](https://github.com/1EdTech/digital-credentials-public-validator)
is the thing to reach for when the question is "does this pass certification".

## Verification runs entirely in the page

No server route, no proxy. The badge never leaves the tab, which is worth
something for a document carrying a person's name and a hash of their email.

The cost is CORS: the public key lives at the `kid` URL on the issuer's own
domain, and an issuer who never set `Access-Control-Allow-Origin` cannot be
reached from a browser. That is not treated as failure. It produces a fourth,
grey verdict — *"signature not checked — issuer key unreachable"* — because
"we could not look" and "this badge is forged" are different facts and
collapsing them would be a lie in one direction or the other.

Rejected: a Cloudflare server endpoint proxying the key fetch. It would work on
every issuer, and it would turn a local tool into one that sees every badge
anyone checks, plus an SSRF allowlist to maintain.

## A badge URL is fetched with `Accept: application/jwt`

A URL is accepted alongside a file, and the request names the credential form it
wants. This matters: a badge URL served to a default `Accept` gives back the
human badge page, or — from the issuing plugin — `application/vc+ld+json`, which
lands in the unverifiable bucket below. Asking for `application/jwt` by name is
what the issuer's content negotiation looks for.

`Accept` is a CORS-safelisted request header and `application/jwt` contains no
CORS-unsafe bytes, so naming it costs no preflight and needs no `OPTIONS`
handler on the issuer's side. The response is then handed to the same reader a
dropped file goes through, so a URL pointing at a baked PNG works as well as one
pointing at a JWS.

## Only the JWT envelope is verified

Open Badges 3.0 permits two securing mechanisms. Verifying the embedded
`DataIntegrityProof` (`eddsa-rdfc-2022`) means JSON-LD 1.1 expansion and
RDFC-1.0 canonicalization — `jsonld.js` plus `rdf-canonize` plus bundled
contexts, several hundred kilobytes, to re-derive bytes the JWT signature
already covers for the credentials this tool was built for.

So: a JWT gets a real verdict. A bare JSON-LD credential gets a grey
*"not verified yet"* and says plainly that nothing was checked, rather than
showing its contents in a frame that implies approval. When a badge carries
both mechanisms, the note says which one was checked. Verifying embedded proofs
is the obvious next step if JSON-LD input turns out to matter.

## A cryptographically valid signature is capped at amber unless the key is on the issuer's host

This is the rule that looks arbitrary without the reasoning, so:

Anyone can generate a keypair, mint a credential claiming
`issuer.id: "https://opencom-italy.org/"`, sign it, and publish the public key
on their own server. Every signature check passes. The maths says nothing about
who issued it — the only thing a forger cannot produce is content served from
the issuer's own domain, which is exactly why the issuing plugin publishes keys
at `https://<issuer-host>/openbadge/keys/<thumbprint>` and refuses to put a
`jwk` in the JOSE header (its ADR 0003).

A verifier that skips the host comparison therefore hands out green checkmarks
to forgeries. So green requires `new URL(kid).host === new URL(issuer.id).host`.
A mismatch is not red — nothing was tampered with, the key is simply unvouched —
so it reads amber: *"signature valid, but the issuer is unproven"*, naming both
hosts.

A `jwk` embedded in the header is accepted for the signature maths and can never
reach green: there is no host to compare, which is the point.

Also capped at amber, per the same logic that a verdict should never overstate:
a payload that fails the OB 3.0 shape rules (VC-DM 2.0 §7.1 step 3 requires
this), an expired badge, and one whose `validFrom` is in the future.

`credentialStatus` is a note, not a downgrade — the badge supports revocation
and this tool does not fetch revocation lists, so it says so. Downgrading every
revocable badge would make amber meaningless.

## Consequences

- Green means: signed, unaltered, key served by the host named as issuer, shape
  conformant, inside its validity window. It is a strong claim, and narrower
  than "this signature verifies".
- Amber is the busiest state and its text has to carry the explanation, since
  the colour alone tells the reader nothing actionable.
- Every input is searched, whatever its container. PNG `iTXt` and the SVG
  `<openbadges:credential>` element are parsed properly, because those are the
  two forms the standard defines. Everything else — a JPEG, a re-saved PNG whose
  chunk was stripped, a credential in a `tEXt` chunk we don't parse — falls back
  to scanning the raw bytes for a compact JWS, which always begins `eyJ`.
  A false positive costs nothing: it fails the signature check a moment later.
  When nothing is found in a JPEG the message says no Open Badges specification
  defines JPEG baking, so the file most likely never carried one — more useful
  than refusing to look, which was this ADR's first answer.
- `credentialSubject.name` is displayed as "awarded to". The issuing plugin
  documents it as a label rather than an identity claim, the verifiable identity
  being a salted hash of an email. It is inside the signed payload, so it is
  tamper-evident; it is not proof of who the person is. Where it is absent, the
  panel says the badge carries no name instead of leaving the field blank.
