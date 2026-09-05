//#region src/middlewares/content-guard.ts
/**
* Apply all rules to a string, returning the transformed result.
*/
function applyRules(text, rules) {
	let result = text;
	for (const rule of rules) if ("pattern" in rule) result = result.replace(rule.pattern, rule.replacement);
	else result = rule.fn(result);
	return result;
}
/**
* Creates a middleware that filters or transforms streamed text content.
*
* @example
* ```ts
* import { contentGuardMiddleware } from '@tanstack/ai/middlewares'
*
* const guard = contentGuardMiddleware({
*   rules: [
*     { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN REDACTED]' },
*   ],
*   strategy: 'buffered',
* })
* ```
*/
function contentGuardMiddleware(options) {
	const { rules, strategy = "buffered", bufferSize = 50, blockOnMatch = false, onFiltered } = options;
	if (strategy === "delta") return createDeltaStrategy(rules, blockOnMatch, onFiltered);
	return createBufferedStrategy(rules, bufferSize, blockOnMatch, onFiltered);
}
function createDeltaStrategy(rules, blockOnMatch, onFiltered) {
	return {
		name: "content-guard",
		onChunk(_ctx, chunk) {
			if (chunk.type !== "TEXT_MESSAGE_CONTENT") return;
			const original = chunk.delta;
			const filtered = applyRules(original, rules);
			if (filtered === original) return;
			if (onFiltered) onFiltered({
				messageId: chunk.messageId,
				original,
				filtered,
				strategy: "delta"
			});
			if (blockOnMatch) return null;
			const { content: _strippedContent, ...rest } = chunk;
			return {
				...rest,
				delta: filtered
			};
		}
	};
}
function createBufferedStrategy(rules, bufferSize, blockOnMatch, onFiltered) {
	let rawAccumulated = "";
	let emittedFilteredLength = 0;
	let lastMessageId = "";
	function resetState() {
		rawAccumulated = "";
		emittedFilteredLength = 0;
		lastMessageId = "";
	}
	function flushBuffer() {
		if (rawAccumulated.length === 0) return null;
		const filtered = applyRules(rawAccumulated, rules);
		if (blockOnMatch && filtered !== rawAccumulated) {
			if (onFiltered) onFiltered({
				messageId: lastMessageId,
				original: rawAccumulated,
				filtered,
				strategy: "buffered"
			});
			resetState();
			return null;
		}
		const remaining = filtered.slice(emittedFilteredLength);
		if (remaining.length > 0) {
			if (filtered !== rawAccumulated && onFiltered) onFiltered({
				messageId: lastMessageId,
				original: rawAccumulated,
				filtered,
				strategy: "buffered"
			});
			const flushed = {
				type: "TEXT_MESSAGE_CONTENT",
				messageId: lastMessageId,
				delta: remaining,
				content: filtered,
				timestamp: Date.now()
			};
			resetState();
			return flushed;
		}
		resetState();
		return null;
	}
	return {
		name: "content-guard",
		onStart() {
			resetState();
		},
		onChunk(_ctx, chunk) {
			if (chunk.type === "TEXT_MESSAGE_END" || chunk.type === "RUN_FINISHED") {
				const flushed = flushBuffer();
				if (flushed) return [flushed, chunk];
				return;
			}
			if (chunk.type !== "TEXT_MESSAGE_CONTENT") return;
			const pending = [];
			if (lastMessageId && chunk.messageId !== lastMessageId) {
				const flushed = flushBuffer();
				if (flushed) pending.push(flushed);
			}
			rawAccumulated += chunk.delta;
			lastMessageId = chunk.messageId;
			const filtered = applyRules(rawAccumulated, rules);
			const safeFilteredEnd = Math.max(0, filtered.length - bufferSize);
			if (safeFilteredEnd <= emittedFilteredLength) return pending.length > 0 ? pending : null;
			if (blockOnMatch && filtered !== rawAccumulated) {
				if (onFiltered) onFiltered({
					messageId: chunk.messageId,
					original: rawAccumulated,
					filtered,
					strategy: "buffered"
				});
				return pending.length > 0 ? pending : null;
			}
			const newDelta = filtered.slice(emittedFilteredLength, safeFilteredEnd);
			if (filtered !== rawAccumulated && onFiltered) onFiltered({
				messageId: chunk.messageId,
				original: rawAccumulated,
				filtered,
				strategy: "buffered"
			});
			emittedFilteredLength = safeFilteredEnd;
			const emitChunk = {
				...chunk,
				delta: newDelta,
				content: filtered.slice(0, safeFilteredEnd)
			};
			const wasEmpty = pending.length === 0;
			pending.push(emitChunk);
			return wasEmpty ? emitChunk : pending;
		}
	};
}
//#endregion
export { contentGuardMiddleware };

//# sourceMappingURL=content-guard.js.map