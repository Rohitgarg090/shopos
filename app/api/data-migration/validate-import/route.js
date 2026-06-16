export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ctx(req) {
  const token = req.headers.get('authorization')?.split('Bearer ')[1];
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) return { error: 'Unauthorized', status: 401 };

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  return { user, org, supabase };
}

// Field mapping templates for different POS systems
const IMPORT_TEMPLATES = {
  customers: {
    required: ['name', 'phone', 'email'],
    optional: ['gstin', 'address', 'city', 'state', 'pincode', 'opening_balance', 'notes'],
    samples: {
      tally: {
        name: 'Party Name',
        phone: 'Mobile',
        email: 'Email',
        address: 'Address',
      },
      quickbooks: {
        name: 'Name',
        phone: 'Phone',
        email: 'Email',
        opening_balance: 'OpeningBalance',
      },
      custom_csv: {
        name: 'Customer Name',
        phone: 'Phone Number',
        email: 'Email Address',
      },
    },
  },
  products: {
    required: ['name', 'price'],
    optional: ['sku', 'hsn', 'gst', 'category', 'quantity', 'article_no', 'color', 'size'],
    samples: {
      tally: {
        name: 'Item Name',
        price: 'Selling Price',
        sku: 'Item Code',
        hsn: 'HSN/SAC',
        gst: 'Tax Rate',
      },
      custom_csv: {
        name: 'Product Name',
        price: 'Unit Price',
        sku: 'SKU',
        quantity: 'Stock Quantity',
      },
    },
  },
  bills: {
    required: ['customer_name', 'total', 'date'],
    optional: ['invoice_no', 'items', 'notes', 'status'],
  },
};

export async function POST(req) {
  try {
    const { user, org, supabase: sb } = await ctx(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { import_type, source_system, csv_headers } = await req.json();

    if (!import_type || !csv_headers || !Array.isArray(csv_headers)) {
      return Response.json(
        { error: 'import_type and csv_headers array required' },
        { status: 400 }
      );
    }

    const template = IMPORT_TEMPLATES[import_type];
    if (!template) {
      return Response.json(
        { error: `Import type '${import_type}' not supported` },
        { status: 400 }
      );
    }

    // Check required fields
    const missingRequired = template.required.filter(
      (field) => !csv_headers.some((h) => h.toLowerCase().includes(field))
    );

    if (missingRequired.length > 0) {
      return Response.json({
        valid: false,
        errors: [`Missing required fields: ${missingRequired.join(', ')}`],
        template,
        required_fields: template.required,
        optional_fields: template.optional,
        suggested_mapping: template.samples[source_system] || template.samples.custom_csv,
      });
    }

    // Create mapping suggestions
    const suggested_mapping = {};
    csv_headers.forEach((header) => {
      const lowerHeader = header.toLowerCase();

      // Try to match with template fields
      for (const field of [...template.required, ...template.optional]) {
        if (
          lowerHeader.includes(field.replace('_', ' ')) ||
          lowerHeader.includes(field)
        ) {
          suggested_mapping[header] = field;
          break;
        }
      }
    });

    return Response.json({
      valid: true,
      import_type,
      source_system,
      csv_headers: csv_headers.length,
      template_required: template.required,
      template_optional: template.optional,
      suggested_mapping,
      message: 'CSV validation passed. Proceed with mapping and import.',
    });
  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
