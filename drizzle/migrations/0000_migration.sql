-- ===== Roles =====
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ===== Profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  track text,
  specialty text,
  sep text,
  gender text not null default 'مؤنث',
  school_context text,
  voice_sample text,
  grade_m1 numeric,
  grade_m2 numeric,
  grade_m3 numeric,
  domain_names text[],
  responsible_use_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Read own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Subscriptions =====
create table public.subscriptions (
  user_id uuid primary key,
  access_until timestamptz not null,
  suspended boolean not null default false,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "Read own subscription or admin" on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admin insert subscriptions" on public.subscriptions for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin update subscriptions" on public.subscriptions for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin delete subscriptions" on public.subscriptions for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.has_active_access(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin') or exists (
    select 1 from public.subscriptions s
    where s.user_id = _user_id and s.access_until > now() and not s.suspended
  )
$$;

-- ===== Access codes =====
create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  code_key text generated always as (regexp_replace(upper(code), '[^A-Z0-9]', '', 'g')) stored unique,
  batch_label text,
  duration_days integer,
  fixed_until timestamptz,
  redeem_before timestamptz,
  revoked boolean not null default false,
  sold_at timestamptz,
  note text,
  redeemed_by uuid,
  redeemed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint access_codes_term check (duration_days is not null or fixed_until is not null),
  constraint access_codes_days_positive check (duration_days is null or duration_days > 0)
);
create index access_codes_redeemed_by_idx on public.access_codes(redeemed_by);
grant select, update, delete on public.access_codes to authenticated;
grant all on public.access_codes to service_role;
alter table public.access_codes enable row level security;
create policy "Admin or owner read codes" on public.access_codes for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or redeemed_by = auth.uid());
create policy "Admin update codes" on public.access_codes for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin delete unused codes" on public.access_codes for delete to authenticated
  using (public.has_role(auth.uid(), 'admin') and redeemed_by is null);

-- burned codes can never be un-burned or edited back to usable
create or replace function public.protect_burned_codes()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.redeemed_by is not null then
    if new.redeemed_by is distinct from old.redeemed_by or new.redeemed_at is distinct from old.redeemed_at
       or new.code is distinct from old.code then
      raise exception 'BURNED_CODE_IMMUTABLE';
    end if;
  end if;
  return new;
end; $$;
create trigger access_codes_protect_burned before update on public.access_codes
  for each row execute function public.protect_burned_codes();

create table public.redeem_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  success boolean not null,
  created_at timestamptz not null default now()
);
grant all on public.redeem_attempts to service_role;
alter table public.redeem_attempts enable row level security;

create or replace function public.redeem_access_code(_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_key text := regexp_replace(upper(coalesce(_code, '')), '[^A-Z0-9]', '', 'g');
  v_row public.access_codes%rowtype;
  v_fails int;
  v_cur timestamptz;
  v_new timestamptz;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED'); end if;
  select count(*) into v_fails from public.redeem_attempts
    where user_id = v_uid and not success and created_at > now() - interval '1 hour';
  if v_fails >= 8 then return jsonb_build_object('ok', false, 'error', 'TOO_MANY_ATTEMPTS'); end if;

  select * into v_row from public.access_codes where code_key = v_key for update;
  if not found then
    insert into public.redeem_attempts(user_id, success) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'INVALID_CODE');
  end if;
  if v_row.redeemed_by is not null then
    insert into public.redeem_attempts(user_id, success) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'ALREADY_USED');
  end if;
  if v_row.revoked then
    insert into public.redeem_attempts(user_id, success) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'REVOKED');
  end if;
  if v_row.redeem_before is not null and v_row.redeem_before < now() then
    insert into public.redeem_attempts(user_id, success) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'EXPIRED');
  end if;
  if v_row.fixed_until is not null and v_row.fixed_until <= now() then
    insert into public.redeem_attempts(user_id, success) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'EXPIRED');
  end if;

  select access_until into v_cur from public.subscriptions where user_id = v_uid for update;
  if v_row.fixed_until is not null then
    v_new := greatest(coalesce(v_cur, now()), v_row.fixed_until);
  else
    v_new := greatest(coalesce(v_cur, now()), now()) + make_interval(days => v_row.duration_days);
  end if;

  update public.access_codes set redeemed_by = v_uid, redeemed_at = now()
    where id = v_row.id and redeemed_by is null;

  insert into public.subscriptions(user_id, access_until, suspended, updated_at)
    values (v_uid, v_new, false, now())
    on conflict (user_id) do update set access_until = excluded.access_until, updated_at = now();

  insert into public.redeem_attempts(user_id, success) values (v_uid, true);
  return jsonb_build_object('ok', true, 'access_until', v_new);
end; $$;
revoke all on function public.redeem_access_code(text) from public, anon;
grant execute on function public.redeem_access_code(text) to authenticated;

create or replace function public.admin_generate_codes(
  _count int, _duration_days int, _fixed_until timestamptz, _redeem_before timestamptz, _label text, _note text)
returns setof public.access_codes language plpgsql security definer set search_path = public, extensions as $$
declare
  v_alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_raw text;
  i int; j int;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  if _count is null or _count < 1 or _count > 500 then raise exception 'BAD_COUNT'; end if;
  if _duration_days is null and _fixed_until is null then raise exception 'TERM_REQUIRED'; end if;
  for i in 1.._count loop
    loop
      v_bytes := extensions.gen_random_bytes(12);
      v_raw := '';
      for j in 0..11 loop
        v_raw := v_raw || substr(v_alpha, (get_byte(v_bytes, j) % 32) + 1, 1);
      end loop;
      begin
        return query insert into public.access_codes(code, batch_label, duration_days, fixed_until, redeem_before, note, created_by)
          values ('RFQ-' || substr(v_raw,1,4) || '-' || substr(v_raw,5,4) || '-' || substr(v_raw,9,4),
                  nullif(trim(_label), ''), _duration_days, _fixed_until, _redeem_before, nullif(trim(_note), ''), auth.uid())
          returning *;
        exit;
      exception when unique_violation then
        -- extremely unlikely collision: try again
      end;
    end loop;
  end loop;
end; $$;
revoke all on function public.admin_generate_codes(int, int, timestamptz, timestamptz, text, text) from public, anon;
grant execute on function public.admin_generate_codes(int, int, timestamptz, timestamptz, text, text) to authenticated;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to authenticated;

create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  perform pg_advisory_xact_lock(424242);
  if exists (select 1 from public.user_roles where role = 'admin') then return false; end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'admin');
  return true;
end; $$;
revoke all on function public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;

-- ===== App settings (public: contact & price shown on landing page) =====
create table public.app_settings (
  id integer primary key default 1,
  whatsapp text,
  price_text text,
  contact_note text,
  daily_ai_limit integer not null default 40,
  updated_at timestamptz not null default now(),
  constraint app_settings_single check (id = 1)
);
grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "Anyone reads settings" on public.app_settings for select to anon, authenticated using (true);
create policy "Admin updates settings" on public.app_settings for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.app_settings(id, whatsapp, price_text, contact_note, daily_ai_limit)
values (1, null, 'اشتراك فصلي — اسأل عن السعر الحالي', 'اطلب كود التفعيل، وسيصلك كود يُستخدم مرة واحدة فقط.', 40);

-- ===== Student workspace tables =====
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  lecture text,
  title text not null,
  kind text not null default 'قبلية',
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null default 'تأمل جديد',
  context_label text,
  what text, so text, impact text, now_step text, feedback text, changed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.self_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  criterion text not null,
  self_level smallint,
  assessor_level smallint,
  updated_at timestamptz not null default now(),
  unique (user_id, criterion)
);
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  kind text,
  standard text,
  evidence text,
  link text,
  created_at timestamptz not null default now()
);
create table public.sep_requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  sep text not null,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.writing_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null default 'مهمة جديدة',
  doc_type text not null default 'مقال تأملي',
  module text,
  brief text,
  notes text,
  content text,
  word_target integer,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.doc_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  doc_id uuid not null references public.writing_docs(id) on delete cascade,
  content text not null,
  label text,
  created_at timestamptz not null default now()
);
create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  doc_id uuid references public.writing_docs(id) on delete cascade,
  mode text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index assistant_messages_doc_idx on public.assistant_messages(doc_id, created_at);
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  mode text not null,
  created_at timestamptz not null default now()
);
create index ai_usage_user_time_idx on public.ai_usage(user_id, created_at);

do $$
declare t text;
begin
  foreach t in array array['tasks','reflections','self_assessments','portfolio_items','sep_requirements','writing_docs','doc_versions','assistant_messages'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Owner reads" on public.%I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "Subscriber inserts" on public.%I for insert to authenticated with check (user_id = auth.uid() and public.has_active_access(auth.uid()))', t);
    execute format('create policy "Subscriber updates" on public.%I for update to authenticated using (user_id = auth.uid() and public.has_active_access(auth.uid())) with check (user_id = auth.uid())', t);
    execute format('create policy "Owner deletes" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

grant select, insert on public.ai_usage to authenticated;
grant all on public.ai_usage to service_role;
alter table public.ai_usage enable row level security;
create policy "Owner or admin reads usage" on public.ai_usage for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Subscriber logs usage" on public.ai_usage for insert to authenticated
  with check (user_id = auth.uid() and public.has_active_access(auth.uid()));

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger reflections_touch before update on public.reflections for each row execute function public.touch_updated_at();
create trigger writing_docs_touch before update on public.writing_docs for each row execute function public.touch_updated_at();
create trigger self_assessments_touch before update on public.self_assessments for each row execute function public.touch_updated_at();