import { DurationOptions } from './adapter.js';
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
export declare function snapToDurationOption<T extends string | number | undefined>(seconds: number, options: DurationOptions<T>): T | undefined;
