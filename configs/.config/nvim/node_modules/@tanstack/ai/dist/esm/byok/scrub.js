//#region src/byok/scrub.ts
function maskKey(key) {
	if (key.length <= 4) return "••";
	return key.slice(-4);
}
function scrubSecrets(input, secrets) {
	let next = input;
	for (const secret of secrets) {
		if (secret.length === 0) continue;
		next = next.split(secret).join("[redacted]");
	}
	return next;
}
//#endregion
export { maskKey, scrubSecrets };

//# sourceMappingURL=scrub.js.map