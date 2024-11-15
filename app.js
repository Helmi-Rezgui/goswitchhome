const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

require('dotenv/config');
const authJwt = require('./Backend/helpers/jwt');

const api= process.env.API_URL;


//Routes

const usersRouter = require('./Backend/routes/users');




//middleware
app.use(bodyParser.json());
app.use(authJwt());
// app.use(errorHandler);
// app.use('/public/uploads', express.static(__dirname + '/public/uploads'));




app.use(`${api}/users`, usersRouter);





mongoose.connect('mongodb://localhost:27017/goswitchhome')
.then(() => {
    console.log('DB connection is ready...');
})
.catch(err => {
    console.log(err);
})





app.listen(3000, () => {
    console.log(api);
    console.log('Server is running on port 3000');
});
