// Server-side membership check for routes that must use the service-role key
// (e.g. reading owner-only firm_settings on behalf of staff).
import { createClient } from '@supabase/supabase-js';

export const adminDb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function isFirmMember(userId, firmId) {
  if (!userId || !firmId) return false;
  const db = adminDb();
  const { data: firm } = await db.from('firms').select('owner_id').eq('id', firmId).maybeSingle();
  if (!firm) return false;
  if (firm.owner_id === userId) return true;
  const { data: m } = await db.from('firm_members').select('status').eq('firm_id', firmId).eq('user_id', userId).maybeSingle();
  return m?.status === 'active';
}
