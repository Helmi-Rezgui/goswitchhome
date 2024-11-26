const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "User API",
      version: "1.0.0",
      description: "API documentation for user management",
    },
    servers: [
      {
        url: "http://localhost:3000/api/v1", // Update based on your server setup
      },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT", // Optional, but helps document the format
            },
        },
    },
  },
  apis: [
    path.join(__dirname, "./routes/users.js"),
    path.join(__dirname, "./routes/homes.js"), // Add the home route here
],
}

const specs = swaggerJsdoc(options);
console.log(specs.paths);


module.exports = { swaggerUi, specs };
