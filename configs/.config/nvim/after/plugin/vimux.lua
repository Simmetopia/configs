-- Define a function to run the Vimux command based on the current buffer type
local function run_vimux_command()
	local filetype = vim.bo.filetype

	if filetype == "elixir" then
		-- Run an Elixir-specific command
		vim.cmd("VimuxRunCommand('mix test " .. vim.fn.expand("%") .. " --stale --trace')")
	elseif filetype == "typescript" then
		-- Run a TypeScript-specific command
		vim.cmd("VimuxRunCommand npm test")
	else
		-- Run a generic command
		vim.cmd('VimuxRunCommand echo "Hello world!"')
	end
end

vim.keymap.set("n", "<leader>'", run_vimux_command, { noremap = true, silent = true })
