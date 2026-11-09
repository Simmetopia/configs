// The only local Pi extension entry point. Neovim loads it explicitly for web chat and selection jobs;
// each session's --tools allowlist decides which of these tools are active.
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { registerWebFetch } from './tools/webfetch.js';
import { registerReplaceSelection } from './tools/replace_selection.js';

export default function (pi: ExtensionAPI) {
  registerWebFetch(pi);
  registerReplaceSelection(pi);
  pi.registerCommand('nvim_ai_capabilities', {
    description: 'Report the active tools to the Neovim RPC client without adding transcript text',
    handler: (_args, ctx) => {
      ctx.ui.setStatus('nvim-ai-capabilities', JSON.stringify({ tools: [...pi.getActiveTools()].sort() }));
    },
  });
}
