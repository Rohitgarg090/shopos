create or replace function decrement_stock(p_sku text, p_qty integer)
returns void language plpgsql security definer as $$
begin update products set qty = greatest(0, qty - p_qty) where sku = p_sku; end; $$;
