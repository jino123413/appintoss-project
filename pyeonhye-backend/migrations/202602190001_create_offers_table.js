exports.up = async function up(knex) {
  await knex.raw("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await knex.raw("CREATE EXTENSION IF NOT EXISTS pg_trgm");

  const exists = await knex.schema.hasTable("offers");
  if (!exists) {
    await knex.schema.createTable("offers", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("brand", 20).notNullable();
      table.string("promo_type", 40).notNullable();
      table.string("title", 255).notNullable();
      table.text("description");
      table.integer("price");
      table.integer("original_price");
      table.string("image_url", 2048);
      table.string("source_url", 1024).notNullable();
      table.string("source_offer_id", 255);
      table.date("valid_from");
      table.date("valid_to");
      table.timestamp("scraped_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.unique(["brand", "promo_type", "title", "source_url"], {
        indexName: "ux_offers_dedupe"
      });
    });
  }

  await knex.raw("CREATE INDEX IF NOT EXISTS idx_offers_brand ON offers (brand)");
  await knex.raw("CREATE INDEX IF NOT EXISTS idx_offers_promo_type ON offers (promo_type)");
  await knex.raw("CREATE INDEX IF NOT EXISTS idx_offers_price ON offers (price)");
  await knex.raw("CREATE INDEX IF NOT EXISTS idx_offers_scraped_at ON offers (scraped_at DESC)");
  await knex.raw(
    "CREATE INDEX IF NOT EXISTS idx_offers_brand_promo_scraped ON offers (brand, promo_type, scraped_at DESC)"
  );
  await knex.raw("CREATE INDEX IF NOT EXISTS idx_offers_title_trgm ON offers USING gin (title gin_trgm_ops)");
  await knex.raw(
    "CREATE INDEX IF NOT EXISTS idx_offers_desc_trgm ON offers USING gin (coalesce(description, '') gin_trgm_ops)"
  );
};

exports.down = async function down(knex) {
  await knex.raw("DROP INDEX IF EXISTS idx_offers_desc_trgm");
  await knex.raw("DROP INDEX IF EXISTS idx_offers_title_trgm");
  await knex.raw("DROP INDEX IF EXISTS idx_offers_brand_promo_scraped");
  await knex.raw("DROP INDEX IF EXISTS idx_offers_scraped_at");
  await knex.raw("DROP INDEX IF EXISTS idx_offers_price");
  await knex.raw("DROP INDEX IF EXISTS idx_offers_promo_type");
  await knex.raw("DROP INDEX IF EXISTS idx_offers_brand");
  await knex.schema.dropTableIfExists("offers");
};
