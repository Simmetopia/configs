import { Type } from '@earendil-works/pi-ai';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

// Neovim reads the arguments from the tool_execution events and applies them to the live buffer.
// This tool deliberately touches nothing on disk.
export function registerReplaceSelection(pi: ExtensionAPI) {
  pi.registerTool({
    name: 'replace_selection',
    label: 'Replace selection',
    description: 'Propose the complete replacement text for the Neovim selection of a job. The editor applies it to the live buffer (merging with any edits the user made meanwhile). Call at most once per job, as your final action.',
    promptSnippet: 'Return the replacement text for the selected region in the Neovim buffer',
    promptGuidelines: [
      'Call replace_selection with the exact job id and the full new text for the selection, not a diff and without code fences.',
      'After calling replace_selection, do not emit another assistant response.',
    ],
    parameters: Type.Object({
      job: Type.String({ description: 'Job id from the request', maxLength: 64 }),
      text: Type.String({ description: 'Complete text that replaces the selected text verbatim', maxLength: 1_000_000 }),
    }),
    async execute(_id, { job }) {
      return {
        content: [{ type: 'text', text: `Replacement recorded for job ${job}; the editor will apply it.` }],
        details: { job },
        terminate: true,
      };
    },
  });
}
