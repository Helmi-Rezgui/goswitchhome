const express = require('express');
const http = require('http');

const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const webSocket = require('ws');


const server = http.createServer(app);
const wss = new webSocket.Server({ server }); 
const clients = require('./Backend/routes/clients');

require('dotenv/config');
const authJwt = require('./Backend/helpers/jwt');

const api= process.env.API_URL;


//Routes

const usersRouter = require('./Backend/routes/users');
const homesRouter = require('./Backend/routes/homes');
const messagesRouter = require('./Backend/routes/messages');
const requestsRouter = require('./Backend/routes/requests');




//middleware
app.use(bodyParser.json());
app.use(authJwt());
// app.use(errorHandler);
// app.use('/public/uploads', express.static(__dirname + '/public/uploads'));




app.use(`${api}/users`, usersRouter);
app.use(`${api}/homes`, homesRouter);
app.use(`${api}/messages`, messagesRouter);
app.use(`${api}/requests`, requestsRouter);





mongoose.connect('mongodb://localhost:27017/goswitchhome')
.then(() => {
    console.log('DB connection is ready...');
})
.catch(err => {
    console.log(err);
})



//const clients = new Map();
//Websocket protocol
wss.on('connection', (ws) => {
  console.log('A new client connected');

  ws.on('message', (data) => {
      try {
          const message = JSON.parse(data);

          if (message.type === 'register') {
              const userId = message.userId;
              console.log(`Registering user: ${userId}`);
              
              // Store the connection in the `clients` map
              clients.set(userId, ws);
              console.log('Clients:', clients); // Debugging: Log the Map
          } else {
              console.log('Received message:', message);
          }
      } catch (error) {
          console.error('Error processing message:', error.message);
      }
  });

  ws.on('close', () => {
      console.log('Client disconnected');
      // Optional: Remove user from `clients` map on disconnection
      for (const [key, value] of clients.entries()) {
          if (value === ws) {
              clients.delete(key);
              console.log(`Removed client: ${key}`);
              break;
          }
      }
  });
});
  



server.listen(3000, () => {
    console.log(api);
    console.log('Server is running on port 3000');
});
// module.exports.clients = clients;