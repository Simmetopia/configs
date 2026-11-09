import { appendFileSync } from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type PromptOptions = {
  customPrompt?: string;
  appendSystemPrompt?: unknown;
  appendedText?: unknown;
  contextFiles?: unknown[];
  skills?: unknown[];
};

type Snapshot = {
  stage: string;
  customPrompt: string | null;
  appendedText: unknown;
  contextFiles: unknown[];
  skills: unknown[];
  activeTools: string[];
  commands: Array<{ name: string; source?: string }>;
  themes: Array<{ name: string; path?: string }>;
};

export default function (pi: ExtensionAPI) {
  if (process.env.AI_PI_PROBE_CAPTURE_THEMES === "1") {
    pi.on("session_start", async (_event, ctx) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const output = process.env.AI_PI_PROBE_OUTPUT;
      if (!output) throw new Error("AI_PI_PROBE_OUTPUT must name an owned disposable fixture file");
      const themes = ctx.ui.getAllThemes()
        .map((theme) => ({ name: theme.name, path: theme.path }))
        .sort((a, b) => a.name.localeCompare(b.name));
      appendFileSync(output, `${JSON.stringify({ stage: "theme_control", themes })}\n`, "utf8");
    });
  }

  pi.registerCommand("nvim_probe", {
    description: "Capture model-free Pi resource and tool state for the Neovim compatibility probe",
    handler: async (args, ctx) => {
      const output = process.env.AI_PI_PROBE_OUTPUT;
      if (!output) throw new Error("AI_PI_PROBE_OUTPUT must name an owned disposable fixture file");

      const options = ctx.getSystemPromptOptions() as PromptOptions;
      const snapshot: Snapshot = {
        stage: args.trim(),
        customPrompt: options.customPrompt ?? null,
        appendedText: options.appendSystemPrompt ?? options.appendedText ?? null,
        contextFiles: options.contextFiles ?? [],
        skills: options.skills ?? [],
        activeTools: [...pi.getActiveTools()].sort(),
        commands: pi.getCommands()
          .map((command) => ({ name: command.name, source: command.source }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        themes: ctx.ui.getAllThemes()
          .map((theme) => ({ name: theme.name, path: theme.path }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
      appendFileSync(output, `${JSON.stringify(snapshot)}\n`, "utf8");
    },
  });
}
