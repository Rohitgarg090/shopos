import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

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

export async function POST(req) {
  try {
    const { user, org, supabase: sb } = await ctx(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const csvFile = formData.get('file');
    const import_type = formData.get('import_type');
    const mapping = JSON.parse(formData.get('mapping') || '{}');

    if (!csvFile || !import_type) {
      return Response.json(
        { error: 'File and import_type required' },
        { status: 400 }
      );
    }

    // Read CSV file
    const csvText = await csvFile.text();
    let records;
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
      });
    } catch (e) {
      return Response.json({ error: 'Invalid CSV format: ' + e.message }, { status: 400 });
    }

    // Start migration record
    const { data: migration } = await sb
      .from('data_migrations')
      .insert({
        organization_id: org.id,
        source_system: 'csv',
        import_type,
        status: 'in_progress',
        file_name: csvFile.name,
        file_size: csvFile.size,
        total_records: records.length,
      })
      .select()
      .single();

    // Process based on import type
    let imported = 0,
      duplicates = 0,
      errors = 0;
    const errorDetails = [];

    if (import_type === 'customers') {
      for (const record of records) {
        try {
          // Map fields
          const mapped = {};
          for (const [csvField, dbField] of Object.entries(mapping)) {
            if (record[csvField]) {
              mapped[dbField] = record[csvField];
            }
          }

          // Validate required fields
          if (!mapped.name || !mapped.phone) {
            errors++;
            errorDetails.push(`Row: ${record.name || 'Unknown'} - Missing name or phone`);
            continue;
          }

          // Check for duplicates
          const { data: existing } = await sb
            .from('customers')
            .select('id')
            .eq('organization_id', org.id)
            .eq('phone', mapped.phone)
            .single();

          if (existing) {
            duplicates++;
            continue;
          }

          // Insert customer
          await sb.from('customers').insert({
            organization_id: org.id,
            name: mapped.name,
            phone: mapped.phone,
            email: mapped.email || null,
            gstin: mapped.gstin || null,
            address: mapped.address || null,
            city: mapped.city || null,
            state: mapped.state || null,
            pincode: mapped.pincode || null,
            opening_balance: parseFloat(mapped.opening_balance) || 0,
            notes: mapped.notes || null,
          });

          imported++;
        } catch (e) {
          errors++;
          errorDetails.push(`Row: ${record.name || 'Unknown'} - ${e.message}`);
        }
      }
    }

    if (import_type === 'products') {
      for (const record of records) {
        try {
          const mapped = {};
          for (const [csvField, dbField] of Object.entries(mapping)) {
            if (record[csvField]) {
              mapped[dbField] = record[csvField];
            }
          }

          if (!mapped.name || !mapped.price) {
            errors++;
            errorDetails.push(`Row: ${record.name || 'Unknown'} - Missing name or price`);
            continue;
          }

          // Check duplicate SKU
          if (mapped.sku) {
            const { data: existing } = await sb
              .from('products')
              .select('id')
              .eq('organization_id', org.id)
              .eq('sku', mapped.sku)
              .single();

            if (existing) {
              duplicates++;
              continue;
            }
          }

          await sb.from('products').insert({
            organization_id: org.id,
            name: mapped.name,
            price: parseFloat(mapped.price),
            sku: mapped.sku || `SKU_${Date.now()}`,
            hsn: mapped.hsn || null,
            gst: parseInt(mapped.gst) || 5,
            category: mapped.category || 'Others',
            qty: parseInt(mapped.quantity) || 0,
            article_no: mapped.article_no || null,
            color: mapped.color || null,
            size: mapped.size || 'Free Size',
          });

          imported++;
        } catch (e) {
          errors++;
          errorDetails.push(`Row: ${record.name || 'Unknown'} - ${e.message}`);
        }
      }
    }

    // Update migration status
    await sb
      .from('data_migrations')
      .update({
        status: 'completed',
        imported_count: imported,
        duplicate_count: duplicates,
        error_records: errors,
        validation_errors: errorDetails.length > 0 ? errorDetails : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', migration.id);

    return Response.json({
      success: true,
      migration_id: migration.id,
      import_type,
      total_records: records.length,
      imported,
      duplicates,
      errors,
      error_details: errorDetails.slice(0, 10), // First 10 errors
      message: `Imported ${imported} records, ${duplicates} duplicates, ${errors} errors`,
    });
  } catch (error) {
    console.error('Import execution error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
