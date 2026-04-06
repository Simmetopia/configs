local ls = require("luasnip")
-- some shorthands...
local s = ls.snippet
local sn = ls.snippet_node
local t = ls.text_node
local i = ls.insert_node
local f = ls.function_node
local c = ls.choice_node
local d = ls.dynamic_node
local r = ls.restore_node
local l = require("luasnip.extras").lambda
local rep = require("luasnip.extras").rep
local p = require("luasnip.extras").partial
local m = require("luasnip.extras").match
local n = require("luasnip.extras").nonempty
local dl = require("luasnip.extras").dynamic_lambda
local fmt = require("luasnip.extras.fmt").fmt
local fmta = require("luasnip.extras.fmt").fmta
local types = require("luasnip.util.types")
local conds = require("luasnip.extras.conditions")
local conds_expand = require("luasnip.extras.conditions.expand")

local function copy(args)
	return args[1]
end

local Snippets = {}

return {
	s({ trig = "package", name = "A new lazy.nvim package start" }, {
		t({ "local M = {", "" }),
		t('\t"'),
		i(1, "package name"),
		t('",'),
		t({ "", "\topts = {", "\t}" }),
		t({ "", "}" }),
		t({ "", "M.config = function(_, opts) ", "" }),
		t({ "\t" }),
		i(2, "config"),
		t({ "", "end" }),
		t({ "", "-- return the module" }),
		t({ "", "return M" }),
	}),
	s(
		{ trig = "req", name = "Requires a new luasnip" },
		fmt(
			[[
      local {} = require("{}")
    ]],
			{ i(1, "default"), rep(1) }
		)
	),
}
