const mysql = require('mysql');

let connection = null;

function handleDisconnect() {
  const newConnection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: process.env.DB_CHARSET,
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
