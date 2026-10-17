-- Merge duplicate catalog products into one, all or nothing.
-- • stock of the duplicates is added to the kept product
-- • old invoice and return lines are re-pointed to the kept product (cancelling an old bill or
--   recording a return then restores stock to the right place)
-- • the duplicates' barcodes are remembered in custom_attributes.skuAliases, so stickers that were
--   already printed still scan
-- Runs with owner rights so invoice/return lines are always re-pointed, but only after checking the caller
-- belongs to the firm, and every statement is limited to that firm. Safe to run more than once.

create or replace function public.merge_products(p_firm_id uuid, p_keep uuid, p_merge uuid[])
returns setof public.products
language plpgsql security definer set search_path = public as $$
declare
  k public.products;
  add_qty numeric;
  aliases text[];
begin
  if not public.is_firm_member(p_firm_id) then
    raise exception 'You are not a member of this firm' using errcode = '42501';
  end if;
  p_merge := array_remove(coalesce(p_merge, '{}'), p_keep);
  if coalesce(array_length(p_merge, 1), 0) = 0 then
    raise exception 'Choose at least one duplicate to merge' using errcode = 'P0001';
  end if;

  select * into k from products where id = p_keep and firm_id = p_firm_id for update;
  if not found then
    raise exception 'Product to keep not found' using errcode = 'P0002';
  end if;
  perform 1 from products where id = any(p_merge) and firm_id = p_firm_id for update;
  if (select count(*) from products where id = any(p_merge) and firm_id = p_firm_id) <> array_length(p_merge, 1) then
    raise exception 'Some products to merge were not found in this firm' using errcode = 'P0002';
  end if;

  select coalesce(sum(greatest(qty, 0)), 0) into add_qty from products where id = any(p_merge) and firm_id = p_firm_id;

  -- every barcode that should now mean the kept product
  select coalesce(array_agg(distinct a), '{}') into aliases from (
    select sku as a from products where id = any(p_merge) and firm_id = p_firm_id
    union
    select jsonb_array_elements_text(coalesce(custom_attributes -> 'skuAliases', '[]'::jsonb))
      from products where (id = p_keep or id = any(p_merge)) and firm_id = p_firm_id
  ) t where a is not null and a <> '' and a <> k.sku;

  update bill_items i set product_sku = k.sku
    from bills b
   where i.bill_id = b.id and b.firm_id = p_firm_id and i.product_sku = any(aliases);
  update return_items ri set product_sku = k.sku
    from returns r
   where ri.return_id = r.id and r.firm_id = p_firm_id and ri.product_sku = any(aliases);

  delete from products where id = any(p_merge) and firm_id = p_firm_id;

  return query
    update products
       set qty = greatest(qty, 0) + add_qty,
           custom_attributes = coalesce(custom_attributes, '{}'::jsonb) || jsonb_build_object('skuAliases', to_jsonb(aliases))
     where id = p_keep and firm_id = p_firm_id
     returning *;
end $$;

revoke all on function public.merge_products(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.merge_products(uuid, uuid, uuid[]) to authenticated, service_role;

notify pgrst, 'reload schema';
