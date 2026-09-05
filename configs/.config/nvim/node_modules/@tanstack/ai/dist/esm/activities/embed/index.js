import { resolveDebugOption } from "../../logger/resolve.js";
import { createGenerationContext, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import { countEmbeddingInputModalities } from "../../utilities/embedding-input.js";
import "./adapter.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/embed/index.ts
/**
* Embed Activity
*
* Generates embedding vectors from text and (for multimodal models) image
* inputs. This is a self-contained module with implementation, types, and JSDoc.
*/
/** The adapter kind this activity handles */
var kind = "embedding";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
* Embed activity - generates embedding vectors from text and image inputs.
*
* Accepts a single item or an array of items; the result always carries an
* `embeddings` array with one vector per input item, in input order.
*
* @example Embed a single text
* ```ts
* import { embed } from '@tanstack/ai'
* import { openaiEmbedding } from '@tanstack/ai-openai'
*
* const result = await embed({
*   adapter: openaiEmbedding('text-embedding-3-small'),
*   input: 'a red guitar',
* })
*
* console.log(result.embeddings[0].vector)
* ```
*
* @example Batch with requested dimensions
* ```ts
* const result = await embed({
*   adapter: openaiEmbedding('text-embedding-3-large'),
*   input: ['a red guitar', 'a blue drum kit'],
*   dimensions: 1024,
* })
* ```
*
* @example Multimodal embedding (text + image fused into one vector)
* ```ts
* import { cohereEmbedding } from '@tanstack/ai-cohere'
*
* // A nested array of parts fuses them into a single vector. The outer array
* // is the item list, so this embeds one fused item into one vector.
* const result = await embed({
*   adapter: cohereEmbedding('embed-v4.0'),
*   input: [
*     [
*       { type: 'text', content: 'product photo' },
*       { type: 'image', source: { type: 'data', value: base64, mimeType: 'image/png' } },
*     ],
*   ],
*   modelOptions: { inputType: 'search_document' },
* })
* ```
*/
async function embed(options) {
	const { adapter, middleware } = options;
	const model = adapter.model;
	const requestId = createId("embedding");
	const startTime = Date.now();
	const logger = resolveDebugOption(options.debug);
	const modelOptions = options.modelOptions;
	const inputItems = Array.isArray(options.input) ? options.input : [options.input];
	const { textInputCount, imageInputCount } = countEmbeddingInputModalities(inputItems);
	const mwCtx = createGenerationContext({
		requestId,
		activity: "embedding",
		provider: adapter.name,
		model,
		modelOptions,
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	aiEventClient.emit("embedding:request:started", {
		requestId,
		provider: adapter.name,
		model,
		inputCount: inputItems.length,
		textInputCount,
		imageInputCount,
		dimensions: options.dimensions,
		modelOptions,
		timestamp: startTime
	});
	logger.request(`activity=embed provider=${adapter.name} model=${model}`, {
		provider: adapter.name,
		model
	});
	try {
		const result = await adapter.createEmbeddings({
			model,
			input: inputItems,
			dimensions: options.dimensions,
			modelOptions,
			logger
		});
		const duration = Date.now() - startTime;
		aiEventClient.emit("embedding:request:completed", {
			requestId,
			provider: adapter.name,
			model,
			embeddingCount: result.embeddings.length,
			dimensions: result.embeddings[0]?.vector.length,
			duration,
			modelOptions,
			timestamp: Date.now()
		});
		logger.output(`activity=embed count=${result.embeddings.length}`, { embeddingCount: result.embeddings.length });
		if (result.usage) {
			aiEventClient.emit("embedding:usage", {
				requestId,
				model,
				usage: result.usage,
				timestamp: Date.now()
			});
			await runGenerationUsage(middleware, mwCtx, result.usage);
		}
		await runGenerationFinish(middleware, mwCtx, {
			duration,
			usage: result.usage
		});
		return result;
	} catch (error) {
		const duration = Date.now() - startTime;
		const err = error;
		aiEventClient.emit("embedding:request:error", {
			requestId,
			provider: adapter.name,
			model,
			error: {
				message: err.message,
				name: err.name
			},
			duration,
			modelOptions,
			timestamp: Date.now()
		});
		await runGenerationError(middleware, mwCtx, {
			error,
			duration
		});
		logger.errors("embed activity failed", {
			error,
			source: "embed"
		});
		throw error;
	}
}
/**
* Create typed options for the embed() function without executing.
*/
function createEmbedOptions(options) {
	return options;
}
//#endregion
export { createEmbedOptions, embed, kind };

//# sourceMappingURL=index.js.map