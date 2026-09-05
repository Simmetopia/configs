return {
  s('sfn', {
    t({ 'export const ' }),
    i(1, 'getTodos'),
    t({ ' = createServerFn().handler(async () => {' }),
    t({ '', '\tconsole.log("' }),
    i(2, 'Hello todos from server'),
    t({ '");' }),
    t({ '', '\treturn await ' }),
    i(3, 'prisma.todo.findMany()'),
    t({ ';', '});' }),
  }, { desc = 'Server function boilerplate' }),
}
