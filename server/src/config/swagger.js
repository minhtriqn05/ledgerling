import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ledgerling API",
      version: "1.0.0",
      description: [
        "REST API for the Ledgerling personal expense tracker.",
        "",
        "**How to try the routes that need a login (the lock icon):**",
        "1. Call `POST /auth/register` or `POST /auth/login` and copy the `token` from the response.",
        "2. Click **Authorize** (top right), paste the token (without the word `Bearer`) and confirm.",
        "3. Every protected request now sends `Authorization: Bearer <token>`.",
        "",
        "Success: `{ \"success\": true, \"data\": ... }`. Error: `{ \"success\": false, \"message\": \"...\" }`.",
        "Every route can also answer 500 (server error). A body that is not valid JSON gets 400 `Invalid JSON body`.",
      ].join("\n"),
    },
    servers: [{ url: "/api" }],
    tags: [
      { name: "Health", description: "Is the server running?" },
      { name: "Auth", description: "Register, log in and read the current user" },
      { name: "Categories", description: "Income and expense categories of the signed-in user" },
      { name: "Transactions", description: "Income and expense records of the signed-in user" },
      { name: "Stats", description: "Numbers for the dashboard charts" },
      { name: "Budgets", description: "Monthly spending limits per expense category of the signed-in user" },
      { name: "Tags", description: "Tags the signed-in user put on transactions" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "The token returned by /auth/register or /auth/login",
        },
      },
      // Answers repeated on many routes; route comments point to them with $ref
      responses: {
        Unauthorized: {
          description: "Token missing, invalid or expired",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              examples: {
                missing: { summary: "No Authorization header", value: { success: false, message: "Not authorized, token missing" } },
                invalid: { summary: "Wrong, malformed or expired token", value: { success: false, message: "Not authorized, invalid token" } },
              },
            },
          },
        },
        ServerError: {
          description: "Unexpected server error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { success: false, message: "Internal server error" },
            },
          },
        },
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
        Transaction: {
          type: "object",
          properties: {
            _id: { type: "string", example: "6720c1b2c3d4e5f601234569" },
            category: {
              type: "object",
              properties: {
                _id: { type: "string", example: "6720b1b2c3d4e5f601234568" },
                name: { type: "string", example: "Food" },
                color: { type: "string", example: "#FF7043" },
              },
            },
            type: { type: "string", enum: ["income", "expense"], example: "expense" },
            amount: { type: "number", example: 45000 },
            currency: { type: "string", example: "VND" },
            note: { type: "string", example: "Lunch" },
            tags: {
              type: "array",
              maxItems: 5,
              description: "Lower case, 1-20 letters, digits or hyphens each",
              items: { type: "string" },
              example: ["work", "team-lunch"],
            },
            date: { type: "string", format: "date-time", example: "2026-10-27T05:30:00.000Z" },
            createdAt: { type: "string", format: "date-time", example: "2026-10-27T05:31:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2026-10-27T05:31:00.000Z" },
          },
        },
        Budget: {
          type: "object",
          properties: {
            _id: { type: "string", example: "6720d1b2c3d4e5f601234581" },
            category: {
              type: "object",
              properties: {
                _id: { type: "string", example: "6720b1b2c3d4e5f601234568" },
                name: { type: "string", example: "Food" },
                color: { type: "string", example: "#F07D62" },
              },
            },
            month: { type: "string", example: "2026-10" },
            amount: { type: "number", description: "Spending limit in VND", example: 5000000 },
            spent: { type: "number", description: "VND expense of the category in the month", example: 4250000 },
            remaining: { type: "number", description: "amount - spent, negative when over budget", example: 750000 },
            percent: { type: "number", description: "spent / amount in %, rounded to 1 decimal", example: 85 },
            status: {
              type: "string",
              enum: ["ok", "warning", "over"],
              description: "ok below 80%, warning from 80%, over from 100%",
              example: "warning",
            },
            createdAt: { type: "string", format: "date-time", example: "2026-10-01T02:01:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2026-10-01T02:01:00.000Z" },
          },
        },
        // Sent next to `data` by paginated list endpoints (data stays an array: one page)
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", description: "Items matching the filters, on all pages", example: 47 },
            totalPages: { type: "integer", description: "Math.ceil(total / limit), 0 when nothing matches", example: 3 },
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

const spec = swaggerJsdoc(options);

// Every route can fail with a 500, so add it here instead of repeating it in every comment
for (const pathItem of Object.values(spec.paths)) {
  for (const operation of Object.values(pathItem)) {
    operation.responses["500"] = { $ref: "#/components/responses/ServerError" };
  }
}

export default spec;
