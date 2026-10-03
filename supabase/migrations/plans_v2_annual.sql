-- Plans v2: Free / 14-day Trial / Business 4 (₹1,499/yr) / Business 10 (₹2,499/yr)
-- Safe to run more than once.

-- 1. Paid plan lives on trial_limits (single source of truth for limits)
alter table trial_limits add column if not exists paid_plan text;
alter table trial_limits add column if not exists paid_until timestamptz;
alter table trial_limits add column if not exists updated_at timestamp default now();

-- 2. Purchasable plans (amounts in paise). Monthly = 0 → not sold monthly.
insert into subscription_plans (id, name, description, price_monthly, price_annual, seats, firms_limit, features) values
  ('business4',  'Business 4',  'Up to 4 firms, all features',  0, 149900, 999, 4,  '{"external": true}'),
  ('business10', 'Business 10', 'Up to 10 firms, all features', 0, 249900, 999, 10, '{"external": true}')
on conflict (id) do update set name = excluded.name, description = excluded.description,
  price_monthly = excluded.price_monthly, price_annual = excluded.price_annual,
  firms_limit = excluded.firms_limit, features = excluded.features;

-- 3. Allow the new plan ids on organizations
alter table organizations drop constraint if exists organizations_plan_check;
alter table organizations add constraint organizations_plan_check
  check (plan in ('starter', 'business', 'pro', 'enterprise', 'business4', 'business10'));

-- 4. Make sure every existing user has a trial_limits row (defaults to Free)
insert into trial_limits (user_id, is_trial, trial_ends_at)
select u.id, false, now() from auth.users u
where not exists (select 1 from trial_limits t where t.user_id = u.id);

-- 5. Existing accounts move to Free (end any running trial)
update trial_limits set trial_ends_at = now(), is_trial = false
where trial_ends_at is null or trial_ends_at > now();

-- 6. Keep anyone who already paid under the old plans (mapped to the new plans)
update trial_limits t set
  paid_plan  = case o.plan when 'pro' then 'business10' when 'enterprise' then 'business10' else 'business4' end,
  paid_until = o.subscription_ends_at
from organizations o
where o.owner_id = t.user_id and o.status = 'active'
  and o.subscription_ends_at is not null and o.subscription_ends_at > now()
  and t.paid_plan is null;

-- 7. Owner account: Business 10
update trial_limits set paid_plan = 'business10', paid_until = '2099-12-31'
where user_id in (select id from auth.users where lower(email) = 'rohitgarg090@gmail.com');

-- Check: one row per user with their effective plan
select u.email, t.paid_plan, t.paid_until, t.trial_ends_at
from trial_limits t join auth.users u on u.id = t.user_id
order by t.paid_plan nulls last, u.email;
