exports.up = async function up(knex) {
  const hasOffers = await knex.schema.hasTable("offers");
  if (!hasOffers) {
    return;
  }

  const hasPrice = await knex.schema.hasColumn("offers", "price");
  if (!hasPrice) {
    await knex.schema.alterTable("offers", (table) => {
      table.integer("price");
    });
  }

  const hasOriginalPrice = await knex.schema.hasColumn("offers", "original_price");
  if (!hasOriginalPrice) {
    await knex.schema.alterTable("offers", (table) => {
      table.integer("original_price");
    });
  }

  const hasImageUrl = await knex.schema.hasColumn("offers", "image_url");
  if (!hasImageUrl) {
    await knex.schema.alterTable("offers", (table) => {
      table.string("image_url", 2048);
    });
  }

  await knex.raw("CREATE INDEX IF NOT EXISTS idx_offers_price ON offers (price)");
};

exports.down = async function down(knex) {
  const hasOffers = await knex.schema.hasTable("offers");
  if (!hasOffers) {
    return;
  }

  await knex.raw("DROP INDEX IF EXISTS idx_offers_price");

  const hasImageUrl = await knex.schema.hasColumn("offers", "image_url");
  if (hasImageUrl) {
    await knex.schema.alterTable("offers", (table) => {
      table.dropColumn("image_url");
    });
  }

  const hasOriginalPrice = await knex.schema.hasColumn("offers", "original_price");
  if (hasOriginalPrice) {
    await knex.schema.alterTable("offers", (table) => {
      table.dropColumn("original_price");
    });
  }

  const hasPrice = await knex.schema.hasColumn("offers", "price");
  if (hasPrice) {
    await knex.schema.alterTable("offers", (table) => {
      table.dropColumn("price");
    });
  }
};
