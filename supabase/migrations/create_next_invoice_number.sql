-- RPC function to get next invoice number per firm
create or replace function get_next_invoice_number(p_user_id uuid, p_firm_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_next_num bigint;
  v_prefix text;
begin
  -- Get firm's invoice prefix
  select coalesce(invoicePrefix, 'INV') into v_prefix
  from firm_settings
  where firm_id = p_firm_id;
  
  -- Get max invoice number for this firm
  select coalesce(max(cast(regexp_replace(invoiceNo, '\D+', '', 'g') as bigint)), 0) + 1
  into v_next_num
  from bills
  where firm_id = p_firm_id and invoiceNo is not null;
  
  return v_prefix || '-' || to_char(v_next_num, 'FM00000');
end;
$$;
