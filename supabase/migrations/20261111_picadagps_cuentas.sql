-- PicadaGPS: cuentas con prueba gratis, planes pagos y configuración.
-- Tablas propias (prefijo picada_), independientes de "perfiles" del monitor:
-- una cuenta de PicadaGPS no da acceso al monitor ni al revés.
create table public.picada_cuentas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text,
  rol text not null default 'usuario' check (rol in ('usuario','admin')),
  creado timestamptz not null default now(),
  prueba_hasta timestamptz not null,
  activo_hasta timestamptz,
  plan text,
  bloqueado boolean not null default false,
  nota text,
  ultimo_ingreso timestamptz default now()
);
comment on table public.picada_cuentas is 'Usuarios de PicadaGPS: prueba, vencimiento del plan y bloqueo. Solo las funciones con service role escriben.';

create table public.picada_pagos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.picada_cuentas(user_id) on delete cascade,
  plan text not null check (plan in ('trimestral','anual','manual')),
  meses int not null,
  usd numeric not null,
  ars numeric not null,
  cotizacion numeric not null,
  tipo_dolar text not null,
  medio text not null default 'mercadopago',
  mp_preference_id text,
  mp_payment_id text,
  estado text not null default 'pendiente',
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index picada_pagos_usuario on public.picada_pagos(user_id);
create unique index picada_pagos_mp_payment on public.picada_pagos(mp_payment_id) where mp_payment_id is not null;

create table public.picada_config (
  id int primary key default 1 check (id = 1),
  dias_prueba int not null default 7,
  trimestral_usd numeric not null default 20,
  anual_usd numeric not null default 70,
  tipo_dolar text not null default 'oficial',
  actualizado timestamptz not null default now()
);
insert into public.picada_config default values;

alter table public.picada_cuentas enable row level security;
alter table public.picada_pagos enable row level security;
alter table public.picada_config enable row level security;
create policy "ver mi cuenta" on public.picada_cuentas for select to authenticated using (user_id = (select auth.uid()));
create policy "ver mis pagos" on public.picada_pagos for select to authenticated using (user_id = (select auth.uid()));
create policy "ver config" on public.picada_config for select to authenticated using (true);

-- Estado de acceso del usuario que llama; crea la cuenta (con la prueba) la primera vez que entra.
create or replace function public.picada_acceso()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  u record;
  c public.picada_cuentas;
  dias int;
  hasta timestamptz;
  estado text;
begin
  if uid is null then
    return jsonb_build_object('estado', 'sin_sesion', 'acceso', false);
  end if;
  select * into c from public.picada_cuentas where user_id = uid;
  if not found then
    select id, email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name') as nombre
      into u from auth.users where id = uid;
    select dias_prueba into dias from public.picada_config where id = 1;
    insert into public.picada_cuentas(user_id, email, nombre, rol, prueba_hasta)
    values (uid, lower(u.email), u.nombre,
            case when lower(u.email) = 'vparedes2@gmail.com' then 'admin' else 'usuario' end,
            now() + make_interval(days => coalesce(dias, 7)))
    on conflict (user_id) do nothing;
    select * into c from public.picada_cuentas where user_id = uid;
  else
    update public.picada_cuentas set ultimo_ingreso = now() where user_id = uid;
  end if;

  if c.rol = 'admin' then
    estado := 'admin'; hasta := now() + interval '365 days';
  elsif c.bloqueado then
    estado := 'bloqueado'; hasta := null;
  elsif c.activo_hasta is not null and c.activo_hasta > now() then
    estado := 'activo'; hasta := c.activo_hasta;
  elsif c.prueba_hasta > now() then
    estado := 'prueba'; hasta := c.prueba_hasta;
  else
    estado := 'vencido'; hasta := null;
  end if;

  return jsonb_build_object(
    'estado', estado,
    'acceso', estado in ('admin', 'activo', 'prueba'),
    'hasta', hasta,
    'prueba_hasta', c.prueba_hasta,
    'activo_hasta', c.activo_hasta,
    'plan', c.plan,
    'rol', c.rol,
    'email', c.email,
    'nombre', c.nombre
  );
end;
$$;
revoke all on function public.picada_acceso() from public, anon;
grant execute on function public.picada_acceso() to authenticated;

-- Cobro manual: el usuario pide el alias por WhatsApp y el administrador confirma el pago.
alter table public.picada_config add column whatsapp text not null default '5492994603071';
alter table public.picada_pagos alter column medio set default 'whatsapp';
