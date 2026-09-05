import { isAbortShapedError } from "../error-payload.js";
import { resolveDebugOption } from "../../logger/resolve.js";
import { createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import "./adapter.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/rerank/index.ts
/**
* Rerank Activity
*
* Reorders a set of documents by semantic relevance to a query.
* This is a self-contained module with implementation, types, and JSDoc.
*/
/** The adapter kind this activity handles */
var kind = "rerank";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/** Serialize a document for the provider. Strings pass through untouched. */
function serializeDocument(document) {
	return typeof document === "string" ? document : JSON.stringify(document);
}
function isAbortError(error, signal) {
	if (isAbortShapedError(error)) return true;
	return error instanceof Error ? false : signal?.aborted === true;
}
/**
* Rerank activity - reorders documents by relevance to a query.
*
* @example Basic reranking
* ```ts
* import { rerank } from '@tanstack/ai'
* import { cohereRerank } from '@tanstack/ai-cohere'
*
* const { ranking, rerankedDocuments } = await rerank({
*   adapter: cohereRerank('rerank-v3.5'),
*   query: 'talk about rain',
*   documents: ['sunny day at the beach', 'rainy afternoon in the city'],
*   topN: 2,
* })
*
* console.log(rerankedDocuments[0]) // 'rainy afternoon in the city'
* ```
*
* @example Reranking object documents
* ```ts
* const { ranking } = await rerank({
*   adapter: cohereRerank('rerank-v3.5'),
*   query: 'best laptop for travel',
*   documents: [
*     { id: 1, text: 'A heavy gaming desktop' },
*     { id: 2, text: 'A lightweight ultrabook with all-day battery' },
*   ],
* })
*
* // ranking[0].document is the original object, fully typed.
* console.log(ranking[0].document.id)
* ```
*/
async function rerank(options) {
	const { adapter, query, documents, topN, modelOptions, abortSignal, middleware } = options;
	const model = adapter.model;
	const requestId = createId("rerank");
	const startTime = Date.now();
	const logger = resolveDebugOption(options.debug);
	if (documents.length === 0) throw new Error("rerank() requires at least one document");
	const mwCtx = createGenerationContext({
		requestId,
		activity: "rerank",
		provider: adapter.name,
		model,
		modelOptions,
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	aiEventClient.emit("rerank:request:started", {
		requestId,
		provider: adapter.name,
		model,
		documentCount: documents.length,
		timestamp: startTime
	});
	logger.request(`activity=rerank provider=${adapter.name}`, {
		provider: adapter.name,
		model,
		documentCount: documents.length
	});
	const serialized = documents.map(serializeDocument);
	try {
		const result = await adapter.rerank({
			model,
			query,
			documents: serialized,
			topN,
			modelOptions,
			abortSignal,
			logger
		});
		const ranking = result.ranking.map((r) => {
			const document = documents[r.index];
			if (document === void 0) throw new Error(`rerank(): provider ${adapter.name} returned out-of-range index ${r.index}`);
			return {
				index: r.index,
				score: r.score,
				document
			};
		});
		const rerankedDocuments = ranking.map((r) => r.document);
		const duration = Date.now() - startTime;
		aiEventClient.emit("rerank:request:completed", {
			requestId,
			provider: adapter.name,
			model,
			documentCount: documents.length,
			resultCount: ranking.length,
			duration,
			timestamp: Date.now()
		});
		aiEventClient.emit("rerank:usage", {
			requestId,
			model,
			usage: result.usage,
			timestamp: Date.now()
		});
		logger.output(`activity=rerank results=${ranking.length}`, { resultCount: ranking.length });
		await runGenerationUsage(middleware, mwCtx, result.usage);
		await runGenerationFinish(middleware, mwCtx, {
			duration,
			usage: result.usage
		});
		return {
			id: result.id,
			model,
			ranking,
			rerankedDocuments,
			usage: result.usage
		};
	} catch (error) {
		const duration = Date.now() - startTime;
		if (isAbortError(error, abortSignal)) await runGenerationAbort(middleware, mwCtx, {
			reason: error instanceof Error ? error.message : void 0,
			duration
		});
		else await runGenerationError(middleware, mwCtx, {
			error,
			duration
		});
		logger.errors("rerank activity failed", {
			error,
			source: "rerank"
		});
		throw error;
	}
}
/**
* Create typed options for the rerank() function without executing.
*/
function createRerankOptions(options) {
	return options;
}
//#endregion
export { createRerankOptions, kind, rerank };

//# sourceMappingURL=index.js.map