//#region src/activities/chat/stream/strategies.ts
/**
* Immediate Strategy - emit on every chunk (default behavior)
*/
var ImmediateStrategy = class {
	shouldEmit(_chunk, _accumulated) {
		return true;
	}
};
/**
* Punctuation Strategy - emit when chunk contains punctuation
* Useful for natural text flow in UI
*/
var PunctuationStrategy = class {
	punctuation = /[.,!?;:\n]/;
	shouldEmit(chunk, _accumulated) {
		return this.punctuation.test(chunk);
	}
};
/**
* Batch Strategy - emit every N chunks
* Useful for reducing UI update frequency
*/
var BatchStrategy = class {
	batchSize;
	chunkCount = 0;
	constructor(batchSize = 5) {
		this.batchSize = batchSize;
	}
	shouldEmit(_chunk, _accumulated) {
		this.chunkCount++;
		if (this.chunkCount >= this.batchSize) {
			this.chunkCount = 0;
			return true;
		}
		return false;
	}
	reset() {
		this.chunkCount = 0;
	}
};
/**
* Word Boundary Strategy - emit at word boundaries
* Prevents cutting words in half
*/
var WordBoundaryStrategy = class {
	shouldEmit(chunk, _accumulated) {
		return /\s$/.test(chunk);
	}
};
/**
* Composite Strategy - combine multiple strategies (OR logic)
* Emits if ANY strategy says to emit
*/
var CompositeStrategy = class {
	strategies;
	constructor(strategies) {
		this.strategies = strategies;
	}
	shouldEmit(chunk, accumulated) {
		return this.strategies.some((s) => s.shouldEmit(chunk, accumulated));
	}
	reset() {
		this.strategies.forEach((s) => s.reset?.());
	}
};
//#endregion
export { BatchStrategy, CompositeStrategy, ImmediateStrategy, PunctuationStrategy, WordBoundaryStrategy };

//# sourceMappingURL=strategies.js.map