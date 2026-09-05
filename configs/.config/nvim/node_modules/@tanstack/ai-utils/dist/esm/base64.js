//#region src/base64.ts
/**
* Encode an `ArrayBuffer` as a base64 string.
*
* Note: callers should be cautious about feeding large buffers (more than a
* few megabytes) on serverless / Workers runtimes — converting big media to
* base64 multiplies its memory footprint by ~1.33× and frequently OOMs the
* isolate.
*/
function arrayBufferToBase64(buffer) {
	const bytes = new Uint8Array(buffer);
	const fast = bytes.toBase64;
	if (typeof fast === "function") return fast.call(bytes);
	if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") return Buffer.from(buffer).toString("base64");
	if (typeof btoa === "function") {
		let binary = "";
		const chunkSize = 32768;
		for (let i = 0; i < bytes.length; i += chunkSize) {
			const chunk = bytes.subarray(i, i + chunkSize);
			binary += String.fromCharCode.apply(null, chunk);
		}
		return btoa(binary);
	}
	throw new Error("No base64 encoder available in this environment.");
}
/**
* Decode a base64 string into a `Uint8Array`.
*/
function base64ToUint8Array(base64) {
	return new Uint8Array(base64ToArrayBuffer(base64));
}
/**
* Decode a base64 string into an `ArrayBuffer`.
*/
function base64ToArrayBuffer(base64) {
	const fast = Uint8Array.fromBase64;
	if (typeof fast === "function") return fast(base64).buffer;
	if (typeof atob === "function") {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return bytes.buffer;
	}
	if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
		const buf = Buffer.from(base64, "base64");
		return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
	}
	throw new Error("No base64 decoder available in this environment.");
}
//#endregion
export { arrayBufferToBase64, base64ToArrayBuffer, base64ToUint8Array };

//# sourceMappingURL=base64.js.map