/** convert-units → lodash expects Node's `global` (absent in Cloudflare Workers). */
(globalThis as typeof globalThis & { global?: typeof globalThis }).global ??=
	globalThis;
