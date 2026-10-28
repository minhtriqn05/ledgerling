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
      // Shapes shared by several endpoints; route comments point to them with $ref
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string", example: "6720a1b2c3d4e5f601234567" },
            name: { type: "string", example: "Minh Tri" },
            email: { type: "string", example: "tri@example.com" },
            createdAt: { type: "string", format: "date-time", example: "2026-10-27T03:00:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2026-10-27T03:00:00.000Z" },
          },
        },
        Category: {
          type: "object",
          properties: {
            _id: { type: "string", example: "6720b1b2c3d4e5f601234568" },
            name: { type: "string", example: "Food" },
            type: { type: "string", enum: ["income", "expense"], example: "expense" },
            color: { type: "string", example: "#FF7043" },
            createdAt: { type: "string", format: "date-time", example: "2026-10-27T03:05:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2026-10-27T03:05:00.000Z" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                token: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
                user: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Email is invalid" },
          },
        },
      },
    },
  },
  // Swagger comments live next to the routes
  apis: ["./src/routes/*.js"],
};

export default swaggerJsdoc(options);
