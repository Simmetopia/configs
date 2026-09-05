import { InternalLogger } from './internal-logger.js';
import { DebugOption } from './types.js';
/**
 * Normalize a `DebugOption` into an `InternalLogger` ready to be threaded
 * through the library's activities and adapters. See the `DebugOption`
 * resolution table in the spec for the complete rules.
 *
 * - `undefined`: only the `errors` category is enabled; default `ConsoleLogger`.
 * - `true`: all categories enabled; default `ConsoleLogger`.
 * - `false`: all categories disabled (including `errors`); default `ConsoleLogger`.
 * - `DebugConfig`: each unspecified category defaults to `true`; an optional
 *   `logger` replaces the default `ConsoleLogger`.
 */
export declare function resolveDebugOption(debug: DebugOption | undefined): InternalLogger;
