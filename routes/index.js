const router = require('koa-router')();
// const context = require('../context');

router.get('/', async ctx => {
  await ctx.render('index', {
    title: 'Hello, backendend!',
  });
});

router.post('/ws/send/all_clients', async ctx => {
  const { type, data } = ctx.request.body;
  ctx.body = { type, data };
  // ctx.body = context.sendToAllClients({
  //   type,
  //   data,
  // });
});

module.exports = router;
