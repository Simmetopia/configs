return {
  s('adt', {
    t({ 'export const ' }),
    i(1, 'addTodo'),
    t({ ' = createServerFn()' }),
    t({ '', '\t.validator(' }),
    t({ '', '\t\tz.object({' }),
    t({ '', '\t\t\ttitle: z.string().min(1),' }),
    t({ '', '\t\t\tpriority: priority.optional(),' }),
    t({ '', '\t\t}),' }),
    t({ '', '\t)' }),
    t({ '', '\t.handler(async (ctx) => {' }),
    t({ '', '\t\treturn await prisma.todo.create({' }),
    t({ '', '\t\t\tdata: {' }),
    t({ '', '\t\t\t\ttitle: ctx.data.title,' }),
    t({ '', '\t\t\t\tpriority: ctx.data.priority ?? "' }), i(2, 'normal'), t({ '",' }),
    t({ '', '\t\t\t\tcompleted: false,' }),
    t({ '', '\t\t\t\tsortOrder: await nextSortOrder(),' }),
    t({ '', '\t\t\t},' }),
    t({ '', '\t\t});' }),
    t({ '', '\t});' }),
    i(0),
  }, { desc = 'export const addTodo server fn' })
}
