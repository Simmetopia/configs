import { parse } from "partial-json";
//#region src/activities/chat/stream/json-parser.ts
/**
* JSON Parser for partial/incomplete JSON strings
*
* Used during streaming to parse tool call arguments that may be incomplete.
*/
/**
* Partial JSON Parser implementation using the partial-json library
* This parser can handle incomplete JSON strings during streaming
*/
var PartialJSONParser = class {
	/**
	* Parse a potentially incomplete JSON string
	* @param jsonString - The JSON string to parse (may be incomplete)
	* @returns The parsed object, or undefined if parsing fails
	*/
	parse(jsonString) {
		if (!jsonString || jsonString.trim() === "") return;
		try {
			return parse(jsonString);
		} catch {
			return;
		}
	}
};
/**
* Default parser instance
*/
var defaultJSONParser = new PartialJSONParser();
/**
* Parse partial JSON string (convenience function)
* @param jsonString - The JSON string to parse (may be incomplete)
* @returns The parsed object, or undefined if parsing fails
*/
function parsePartialJSON(jsonString) {
	return defaultJSONParser.parse(jsonString);
}
//#endregion
export { PartialJSONParser, defaultJSONParser, parsePartialJSON };

//# sourceMappingURL=json-parser.js.map