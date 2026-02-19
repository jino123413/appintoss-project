require("dotenv").config();

module.exports = {
  client: "pg",
  connection: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/pyeonhye",
  migrations: {
    directory: "./migrations"
  }
};
