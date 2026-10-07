// The only local Pi extension entry point. Neovim loads it explicitly for web chat.
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { registerWebFetch } from './tools/webfetch.js';

export default function (pi: ExtensionAPI) {
  registerWebFetch(pi);
}
