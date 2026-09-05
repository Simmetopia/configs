//#region src/interrupt-serialization.ts
var SHA256_K = new Uint32Array([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
function rotr(x, n) {
	return x >>> n | x << 32 - n;
}
function sha256Hex(input) {
	const msg = new TextEncoder().encode(input);
	const bitLen = msg.length * 8;
	const withOne = msg.length + 1;
	const total = withOne + (56 - withOne % 64 + 64) % 64 + 8;
	const bytes = new Uint8Array(total);
	bytes.set(msg);
	bytes[msg.length] = 128;
	const view = new DataView(bytes.buffer);
	view.setUint32(total - 8, Math.floor(bitLen / 4294967296));
	view.setUint32(total - 4, bitLen >>> 0);
	let h0 = 1779033703;
	let h1 = 3144134277;
	let h2 = 1013904242;
	let h3 = 2773480762;
	let h4 = 1359893119;
	let h5 = 2600822924;
	let h6 = 528734635;
	let h7 = 1541459225;
	const w = /* @__PURE__ */ new Uint32Array(64);
	for (let offset = 0; offset < total; offset += 64) {
		for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
		for (let i = 16; i < 64; i++) {
			const x15 = w[i - 15] ?? 0;
			const x2 = w[i - 2] ?? 0;
			const s0 = rotr(x15, 7) ^ rotr(x15, 18) ^ x15 >>> 3;
			const s1 = rotr(x2, 17) ^ rotr(x2, 19) ^ x2 >>> 10;
			w[i] = (w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1 >>> 0;
		}
		let a = h0;
		let b = h1;
		let c = h2;
		let d = h3;
		let e = h4;
		let f = h5;
		let g = h6;
		let hh = h7;
		for (let i = 0; i < 64; i++) {
			const bigS1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
			const ch = e & f ^ ~e & g;
			const t1 = hh + bigS1 + ch + (SHA256_K[i] ?? 0) + (w[i] ?? 0) >>> 0;
			const t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c) >>> 0;
			hh = g;
			g = f;
			f = e;
			e = d + t1 >>> 0;
			d = c;
			c = b;
			b = a;
			a = t1 + t2 >>> 0;
		}
		h0 = h0 + a >>> 0;
		h1 = h1 + b >>> 0;
		h2 = h2 + c >>> 0;
		h3 = h3 + d >>> 0;
		h4 = h4 + e >>> 0;
		h5 = h5 + f >>> 0;
		h6 = h6 + g >>> 0;
		h7 = h7 + hh >>> 0;
	}
	const hex = (n) => (n >>> 0).toString(16).padStart(8, "0");
	return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7);
}
/** The built-in default: SHA-256, prefixed so the algorithm is self-describing. */
function defaultInterruptHash(canonicalJson) {
	return `sha256:${sha256Hex(canonicalJson)}`;
}
function canonical(value, active) {
	if (value === null) return "null";
	if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
	if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
	if (typeof value !== "object") throw new TypeError("Interrupt values must be JSON-compatible.");
	if (active.has(value)) throw new TypeError("Interrupt values must not cycle.");
	if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError("Interrupt values must use plain JSON objects.");
	active.add(value);
	let encoded;
	if (Array.isArray(value)) {
		const items = [];
		for (let index = 0; index < value.length; index++) items.push(canonical(value[index], active));
		encoded = `[${items.join(",")}]`;
	} else {
		const record = value;
		encoded = `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key], active)}`).join(",")}}`;
	}
	active.delete(value);
	return encoded;
}
function canonicalInterruptJson(value) {
	return canonical(value, /* @__PURE__ */ new WeakSet());
}
function digestInterruptJson(canonicalJson, hash = defaultInterruptHash) {
	if (typeof canonicalJson !== "string") throw new TypeError("Interrupt digests require canonical JSON text.");
	return hash(canonicalJson);
}
function freezeTree(value) {
	if (value === null || typeof value !== "object" || Object.isFrozen(value)) return;
	Object.values(value).forEach(freezeTree);
	Object.freeze(value);
}
function cloneAndDeepFreezeJson(value) {
	const clone = JSON.parse(canonicalInterruptJson(value));
	freezeTree(clone);
	return clone;
}
//#endregion
export { canonicalInterruptJson, cloneAndDeepFreezeJson, defaultInterruptHash, digestInterruptJson };

//# sourceMappingURL=interrupt-serialization.js.map