//#region src/activities/chat/middleware/types.ts
var INTERRUPT_BOUNDARY_PHASES = [
	"beforeModel",
	"afterModel",
	"beforeTools",
	"afterTools"
];
var INTERRUPT_TOOL_RESUMES = [
	"continue",
	"cancel",
	"stop"
];
//#endregion
export { INTERRUPT_BOUNDARY_PHASES, INTERRUPT_TOOL_RESUMES };

//# sourceMappingURL=types.js.map