local ls = require('luasnip')
local s = ls.snippet
local t = ls.text_node
local i = ls.insert_node

return {
  s("lth", {
    t({
      "/**",
      " * Local time hook",
      ' * @type {import("phoenix_live_view").ViewHook}',
      " */",
      "export default {",
      "  mounted() {",
      "    ",
    }),
    i(0),
    t({
      "  },",
      "};",
    }),
  }),
}
