const moment = require('moment-timezone');

function getTimestamp() {
  return new Date().getTime();
}

function updateObjectTime(obj) {
  Object.assign(obj, {
    _updated: getTimestamp(),
    _updatedString: getTimeString(),
  });
}

const getTimeString = (date = new Date()) => {
  return moment
    .tz(date.toUTCString(), 'Asia/Shanghai')
    .format('YYYY-MM-DD HH:mm:ss Z');
};

const objToArray = obj => {
  return Object.keys(obj).map(k => obj[k]);
};

const getSocketIp = socket => {
  return (
    socket.handshake.headers['x-forwarded-for'] || socket.handshake.address
  );
};

class StoreSockets {
  constructor() {
    this.clients = {};
  }

  connect(socket) {
    const socketId = socket.id;
    console.log(`[${getTimeString()}] [connected] client: ${socketId}.`);
    const data = {
      socketId,
    };
    this.clients[socketId] = {
      socket,
      data,
      _ip: getSocketIp(socket),
      _created: getTimestamp(),
      _createdString: getTimeString(),
      _updated: getTimestamp(),
      _updatedString: getTimeString(),
    };
  }

  disconnect(socket) {
    const socketId = socket.id;
    const current = this.clients[socketId];
    if (current) {
      console.log(`[${getTimeString()}] [disconnected] client: ${socketId}`);
      delete this.clients[socketId];
    }
  }

  ping(socket, data) {
    const socketId = socket.id;
    const current = this.clients[socketId];
    updateObjectTime(current);
    return {
      type: 'pong',
      data,
    };
  }

  sendToAllClients({ type, data }) {
    const clients = objToArray(this.clients);
    clients.forEach(client => {
      client.socket.send({ type, data }, () => {});
    });
    return {
      sendCount: clients.length,
    };
  }
}

module.exports = StoreSockets;
