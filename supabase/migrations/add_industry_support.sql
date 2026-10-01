-- Add industry type and custom fields support to firms
-- This enables the app to work for ANY type of business

-- Add industry_type column to firm_settings
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS industry_type text DEFAULT 'general';

-- Add custom_product_fields (JSON) to store user-defined fields
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS custom_product_fields jsonb DEFAULT '[]'::jsonb;

-- Add user-defined categories to firm_settings
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS product_categories jsonb DEFAULT '[]'::jsonb;

-- Add UOM (Unit of Measure) support to products
ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS unit_of_measure text DEFAULT 'Piece';

-- Add custom_attributes (JSON) to store industry-specific data on products
ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS custom_attributes jsonb DEFAULT '{}'::jsonb;

-- Remove the hardcoded category constraint if it exists
-- Products table stores category as text, so this is flexible

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_firm_settings_industry ON firm_settings(industry_type);

-- Industry templates (as reference, stored in application code)
-- This is just documentation of what templates are available
COMMENT ON COLUMN firm_settings.industry_type IS
'Industry type: clothing, electronics, jewelry, spices, home_decor, tiles, pharmacy, general, custom';

COMMENT ON COLUMN firm_settings.custom_product_fields IS
'JSON array of custom field definitions: [{"name": "weight", "type": "number", "label": "Weight (gm)", "required": false}]';

COMMENT ON COLUMN firm_settings.product_categories IS
'JSON array of user-defined product categories: ["Category1", "Category2"]';

COMMENT ON COLUMN products.custom_attributes IS
'JSON object storing industry-specific data: {"weight": 5, "purity": "22K", "warranty": 12}';
