const context = require('./context');
const Store = require('./services/ws/store');

const store = new Store();

const appWs = function(server) {
  const io = require('socket.io')(server);

  io.of('main').on('connection', socket => {
    store.connect(socket);

    socket.on('message', ({ type, data }, fn) => {
      try {
        const safeFn = fn || (() => {});
        switch (type) {
          case 'ping':
            safeFn(store.ping(socket, data));
            break;
          default:
            break;
        }
      } catch (e) {
        console.error(e);
      }
    });
    socket.on('disconnect', () => {
      store.disconnect(socket);
    });
  });

  context.sendToAllClients = ({ type, data }) => {
    return store.sendToAllClients({ type, data });
  };
};

module.exports = appWs;
