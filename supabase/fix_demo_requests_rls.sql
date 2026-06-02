-- Fix demo_requests RLS policies
-- Drop the old incorrect policies
drop policy if exists "allow_admin_select" on demo_requests;
drop policy if exists "allow_admin_update" on demo_requests;

-- Create correct policies for admin access
create policy "allow_admin_select" on demo_requests
  for select using (
    (select email from auth.users where id = auth.uid()) in ('rohitgarg090@gmail.com', 'info@shopos.co.in')
  );

create policy "allow_admin_update" on demo_requests
  for update using (
    (select email from auth.users where id = auth.uid()) in ('rohitgarg090@gmail.com', 'info@shopos.co.in')
  );
