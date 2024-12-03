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

local function to_pascal_case(str)
  return str:gsub("(%l)(%w*)", function(a, b)
    return a:upper() .. b
  end)
end

local function snake_to_pascal_case(str)
  return str:gsub("_([%w])", function(a)
    return a:upper()
  end)
end

local function derive_module_name_from_path()
  local filepath = vim.fn.expand("%:p")
  local app_name = filepath:match("/([^/]+)/lib/")
  app_name = app_name and to_pascal_case(app_name) or "MyApp"
  local module_path = filepath:gsub(".+lib/", ""):gsub("/", "."):gsub(".ex$", ""):gsub("([%w_]+)", function(str)
    return to_pascal_case(snake_to_pascal_case(str))
  end)

  return app_name .. "." .. module_path
end

local function get_root_module_name()
  local filepath = vim.fn.expand("%:p")
  local app_name = filepath:match("/([^/]+)/lib/")
  app_name = app_name and to_pascal_case(app_name) or "MyApp"
  return app_name
end

local function handle_params_or_event()
  c(1, {
    sn(nil, {
      t({ "  @impl true" }),
      t({ "  def handle_params(_params, _url, socket) do", "" }),
      t({ "    {:noreply, socket}" }),
      t({ "  end" }),
      t({ "" }),
    }),
    sn(nil, {
      t({ "  @impl true", "" }),
      t({ '  def handle_event("' }),
      i(1, "event"),
      t({ '", value, socket) do', "" }),
      t({ "    {:noreply, socket}", "" }),
      t({ "  end" }),
      t({ "" }),
    }),
  })
end

local function liveview_snippet()
  return s("liveview", {
    t({ "defmodule " }),
    f(derive_module_name_from_path, {}),
    t({ " do", "" }),
    t({ "  use " }),
    f(get_root_module_name, {}),
    t({ " :live_view", "", "" }),
    t({ "  @impl true" }),
    t({ "  def mount(_params, _session, socket) do", "" }),
    t({ "    {:ok, assign(socket, %{some_assign: :value})}", "" }),
    t({ "  end", "", "" }),
    f(handle_params_or_event, {}),
    i(0),
    t({ "  @impl true" }),
    t({ "  def render(assigns) do", "" }),
    t({ '    ~H"""', "" }),
    t({ "      yo", "" }),
    t({ '    """', "" }),
    t({ "  end", "" }),
    t({ "end" }),
  })
end

local function lv_mount()
  return s(
    { trig = "lvm", desc = "A standard liveview mount for use in an elixir app" },
    fmt(
      [[
        @impl true
        def mount(_params, _session, socket) do
          {{:ok, {}}}
        end
    ]],
      { c(1, { t("socket"), t("socket |> assign(%{val: val})") }) }
    )
  )
end

local function lv_event()
  return s(
    { trig = "lve", desc = "A standard liveview handle_event/2 for use in an elixir app" },
    fmt(
      [[
        @impl true
        def handle_event("{}", {}, socket) do
          {{:noreply, socket}}
        end
    ]],
      { i(1, "event"), c(2, { t("%{{}}"), t("_params") }) }
    )
  )
end

local function lv_info()
  return s(
    { trig = "lvi", desc = "A standard liveview handle_info/2 for use in an elixir app" },
    fmt(
      [[
        @impl true
        def handle_info({{:{}, _}}, socket) do
          {{:ok, socket}}
        end
    ]],
      { i(1, "event") }
    )
  )
end

local function lv_render()
  return s(
    { trig = "lvr", desc = "A standard liveview handle_event/2 for use in an elixir app" },
    fmt(
      [[
        @impl true
        def render(assigns) do
          ~H"""
            <div>
              <h1>Yo from {}</h1>
            </div>
          """
        end
    ]],
      { f(derive_module_name_from_path, {}) }
    )
  )
end

return {
  s({ trig = "gs", desc = "A standard genserver for use in an elixir app" }, {
    t({ "defmodule " }),
    f(derive_module_name_from_path, {}),
    t({ " do", "  use GenServer", "", "  # Client API", "" }),
    t({ "  def start_link(_) do" }),
    t({ "", "    GenServer.start_link(__MODULE__, :ok, name: __MODULE__)" }),
    t({ "", "  end", "", "  # Server Callbacks", "" }),
    t({ "", "  @impl true" }),
    t({ "  def init(:ok) do" }),
    t({ "", "    {:ok, %{}}" }),
    t({ "", "  end", "", "end" }),
  }),
  liveview_snippet(),
  lv_mount(),
  lv_event(),
  lv_info(),
  lv_render(),
}
