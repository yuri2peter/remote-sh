const Koa = require('koa');
const app = new Koa();
const views = require('koa-views');
const json = require('koa-json');
const onerror = require('koa-onerror');
const bodyparser = require('koa-bodyparser');
const logger = require('koa-logger');
const cors = require('koa2-cors');
const YlMemCache = require('yl-mem-cache');

const index = require('./routes/index');
const blackList = new YlMemCache('blackList'); // ip 黑名单

const getUserIp = ({ req }) => {
  return (
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress
  );
};

// error handler
onerror(app);

// middlewares
app.use(cors());
app.use(
  bodyparser({
    enableTypes: ['json', 'form', 'text'],
  }),
);
app.use(json());
app.use(logger());
app.use(require('koa-static')(__dirname + '/public'));

app.use(
  views(__dirname + '/views', {
    extension: 'pug',
  }),
);
app.use(async (ctx, next) => {
  const ip = getUserIp(ctx);
  if (blackList.has(ip)) {
    console.log(ip + 'has been blocked.');
    ctx.body = {
      error: 'Your IP has been blocked.',
    };
    return;
  }
  await next();
});
// routes
app.use(index.routes(), index.allowedMethods());

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx);
});

module.exports = app;
