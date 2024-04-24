local ls = require("luasnip")
-- some shorthands...
local s = ls.snippet
local t = ls.text_node
local i = ls.insert_node
local c = ls.choice_node
local fmt = require("luasnip.extras.fmt").fmt

return {
  s("trig", t("loaded!!")),

  s("todo", fmt("{}:(Simon)", { c(1, { t "TODO", t "FIXME", t "BUG", i(nil, "XXX") }) })),
}
