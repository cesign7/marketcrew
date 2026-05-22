/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/*": [
      "./db/workflow-store.sql",
      "./scripts/postgres-workflow-bridge.mjs",
      "./node_modules/pg/**/*",
      "./node_modules/pg-cloudflare/**/*",
      "./node_modules/pg-connection-string/**/*",
      "./node_modules/pg-int8/**/*",
      "./node_modules/pg-pool/**/*",
      "./node_modules/pg-protocol/**/*",
      "./node_modules/pg-types/**/*",
      "./node_modules/pgpass/**/*",
      "./node_modules/postgres-array/**/*",
      "./node_modules/postgres-bytea/**/*",
      "./node_modules/postgres-date/**/*",
      "./node_modules/postgres-interval/**/*",
      "./node_modules/split2/**/*",
      "./node_modules/xtend/**/*",
    ],
  },
};

export default nextConfig;
