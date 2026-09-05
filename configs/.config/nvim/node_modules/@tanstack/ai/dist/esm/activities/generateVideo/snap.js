//#region src/activities/generateVideo/snap.ts
/**
* Extract a numeric seconds value from a `DurationOptions` entry. Returns
* `null` for entries that don't parse as a number — e.g. `'auto'`.
*
* Handles the keyword-with-unit form FAL uses for Luma/Veo (`'8s'`, `'9s'`)
* by stripping a trailing `s`. Pure-numeric strings (`'5'`, `'10'`) parse via
* Number(). Numbers pass through.
*/
function entryToSeconds(entry) {
	if (typeof entry === "number") return Number.isFinite(entry) ? entry : null;
	const stripped = entry.endsWith("s") ? entry.slice(0, -1) : entry;
	const parsed = Number(stripped);
	return Number.isFinite(parsed) ? parsed : null;
}
/**
* Snap a raw seconds value to the closest valid duration for a model's
* `DurationOptions`.
*
* - `none`            → `undefined`
* - `discrete`        → closest numeric-parseable entry; if none parse,
*                       returns `values[0]` (keyword-only models like 'auto')
* - `range`           → clamped to [min, max] and rounded to `step` (default 1)
* - `mixed`           → closest of (discrete numerics ∪ range values)
*
* @experimental Video generation is an experimental feature and may change.
*/
function snapToDurationOption(seconds, options) {
	switch (options.kind) {
		case "none": return;
		case "discrete": return pickClosestDiscrete(seconds, options.values);
		case "range": {
			const step = options.step ?? 1;
			const clamped = Math.min(options.max, Math.max(options.min, seconds));
			const snapped = Math.round((clamped - options.min) / step) * step + options.min;
			return Math.min(options.max, Math.max(options.min, snapped));
		}
		case "mixed": {
			const discreteCandidate = pickClosestDiscrete(seconds, options.values);
			if (!options.range) return discreteCandidate;
			const { min, max, step = 1 } = options.range;
			const rangeValue = Math.min(max, Math.max(min, Math.round((Math.min(max, Math.max(min, seconds)) - min) / step) * step + min));
			const discreteSeconds = typeof discreteCandidate === "number" ? discreteCandidate : discreteCandidate !== void 0 ? entryToSeconds(discreteCandidate) ?? Infinity : Infinity;
			return Math.abs(discreteSeconds - seconds) <= Math.abs(rangeValue - seconds) ? discreteCandidate : rangeValue;
		}
	}
}
function pickClosestDiscrete(seconds, values) {
	if (values.length === 0) return void 0;
	let best;
	let bestDistance = Infinity;
	for (const value of values) {
		const v = entryToSeconds(value);
		if (v === null) continue;
		const distance = Math.abs(v - seconds);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = value;
		}
	}
	return best ?? values[0];
}
//#endregion
export { snapToDurationOption };

//# sourceMappingURL=snap.js.map