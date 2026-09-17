const { defineConfig } = require("prisma/config");
const databaseUrl = process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy";
module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: databaseUrl },
});
