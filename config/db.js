const mysql = require('mysql');

let connection = null;

function handleDisconnect() {
  const newConnection = mysql.createConnection({
    host: process.env.DB_HOST_DEVELOPEMENT,
    port: process.env.DB_PORT_DEVELOPEMENT,
    user: process.env.DB_USER_DEVELOPEMENT,
    password: process.env.DB_PASSWORD_DEVELOPEMENT,
    database: process.env.DB_NAME_DEVELOPEMENT,
    charset: process.env.DB_CHARSET_DEVELOPEMENT,
    timezone: 'Z',
    typeCast: (field, next) => (field.type === 'JSON' ? JSON.parse(field.string()) : next()),
  });

  newConnection.connect(err => {
    if (err) {
      console.error('Error connecting to DB:', err.code, err.message);
      setTimeout(handleDisconnect, 2000);
      return;
    }
    console.log('Database connection established. Thread ID:', newConnection.threadId);
  });

  newConnection.on('error', err => {
    console.error('DB error', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      console.log('DB disconnected. Reconnecting...');
      handleDisconnect();
    }
  });
  connection = newConnection;
}

handleDisconnect();

module.exports = {
  get connection() {
    return connection;
  },
};
