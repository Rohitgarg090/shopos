create or replace function decrement_stock(p_sku text, p_qty integer)
returns void language plpgsql security definer as $$
begin update products set qty = greatest(0, qty - p_qty) where sku = p_sku; end; $$;

create or replace function increment_stock(p_sku text, p_qty integer)
returns void language plpgsql security definer as $$
begin update products set qty = qty + p_qty where sku = p_sku; end; $$;

create or replace function get_next_invoice_number(p_user_id text, p_firm_id uuid)
returns text language plpgsql security definer as $$
declare v_seq integer; v_prefix text; v_year integer;
begin
  v_year := extract(year from now());
  select invoice_seq, invoice_prefix into v_seq, v_prefix
  from firm_settings where user_id = p_user_id and firm_id = p_firm_id;
  if v_seq is null then v_seq := 1; v_prefix := 'INV'; end if;
  update firm_settings set invoice_seq = v_seq + 1 where user_id = p_user_id and firm_id = p_firm_id;
  return coalesce(v_prefix, 'INV') || '/' || v_year || '/' || lpad(v_seq::text, 4, '0');
end; $$;
