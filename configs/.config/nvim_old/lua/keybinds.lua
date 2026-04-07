-- greatest remap ever
vim.keymap.set("x", "<leader>p", [["_dP]])

-- next greatest remap ever : asbjornHaland
vim.keymap.set({ "n", "v" }, "<leader>y", [["+y]])
vim.keymap.set("n", "<leader>Y", [["+Y]])

local function create_test_file()
	local relative_path = vim.fn.expand("%p")

	-- Extract the first part of the path and substitute it with "/test"
	local parts = {}
	for part in string.gmatch(relative_path, "[^/]+") do
		table.insert(parts, part)
	end
	parts[1] = "test"

	-- Append "_test" to the filename
	local filename = parts[#parts]
	local test_filename = filename:gsub("%..+$", "") .. "_test" .. filename:match("%..+$")
	parts[#parts] = test_filename

	local test_path = table.concat(parts, "/")

	-- Create directories if they don't exist
	local dirs = {}
	for part_index = 1, #parts - 1 do
		table.insert(dirs, table.concat(parts, "/", 1, part_index))
	end
	for _, dir in ipairs(dirs) do
		vim.fn.mkdir(dir, "p")
	end

	-- Create the test file. Write it with absolute pathing
	local test_file = test_path .. "s"
	vim.cmd("edit " .. test_file)
end

vim.keymap.set("n", "<Leader>et", create_test_file, { silent = true })
