import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ledgerling API",
      version: "1.0.0",
      description: "REST API for the Ledgerling personal expense tracker",
    },
    servers: [{ url: "/api" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  // Swagger comments live next to the routes
  apis: ["./src/routes/*.js"],
};

export default swaggerJsdoc(options);
