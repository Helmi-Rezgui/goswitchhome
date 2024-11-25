const { expressjwt: jwt } = require("express-jwt");


function authJwt() {
  const secret = process.env.secret;
  const api = process.env.API_URL;
  return jwt({
    secret,
    algorithms: ["HS256"],
    isRevoked: isRevoked,
  }).unless({
    path: [
    
      `${api}/users/login`,
      `${api}/users/register`,
      `${api}/users/verify-email`,
      `${api}/users/reset-password`,
      `${api}/users/forgot-password`,
      //`${api}/homes/home`,
      // "/"
      
      
      

    ],
  });
}

async function isRevoked(req, jwt) {
  const payload = jwt.payload;
  
  if (payload.role === "Admin") {
    
    return false;
  }

 
}

module.exports = authJwt;
