-- PicadaGPS: límite de teléfonos por cuenta.
-- Cada instalación de la app tiene un identificador propio. Cuentan los teléfonos usados en los
-- últimos 30 días; el administrador puede liberarlos y la app libera el suyo al cerrar sesión.
alter table public.picada_config add column limite_dispositivos int not null default 2;

create table public.picada_dispositivos (
  user_id uuid not null references public.picada_cuentas(user_id) on delete cascade,
  dispositivo text not null check (length(dispositivo) between 8 and 80),
  nombre text,
  creado timestamptz not null default now(),
  ultimo timestamptz not null default now(),
  primary key (user_id, dispositivo)
);
alter table public.picada_dispositivos enable row level security;
create policy "ver mis dispositivos" on public.picada_dispositivos for select to authenticated using (user_id = (select auth.uid()));

drop function if exists public.picada_acceso();

-- Estado de acceso del usuario que llama, desde un teléfono dado. Crea la cuenta (con la prueba) la primera vez.
create or replace function public.picada_acceso(p_dispositivo text default null, p_nombre text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  u record;
  c public.picada_cuentas;
  cfg public.picada_config;
  hasta timestamptz;
  estado text;
  usados int;
  registrado boolean;
begin
  if uid is null then
    return jsonb_build_object('estado', 'sin_sesion', 'acceso', false);
  end if;
  select * into cfg from public.picada_config where id = 1;
  select * into c from public.picada_cuentas where user_id = uid;
  if not found then
    select id, email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name') as nombre
      into u from auth.users where id = uid;
    insert into public.picada_cuentas(user_id, email, nombre, rol, prueba_hasta)
    values (uid, lower(u.email), u.nombre,
            case when lower(u.email) = 'vparedes2@gmail.com' then 'admin' else 'usuario' end,
            now() + make_interval(days => coalesce(cfg.dias_prueba, 7)))
    on conflict (user_id) do nothing;
    select * into c from public.picada_cuentas where user_id = uid;
  else
    update public.picada_cuentas set ultimo_ingreso = now() where user_id = uid;
  end if;

  if c.rol = 'admin' then
    estado := 'admin'; hasta := now() + interval '365 days';
  elsif c.bloqueado then
    estado := 'bloqueado';
  elsif c.activo_hasta is not null and c.activo_hasta > now() then
    estado := 'activo'; hasta := c.activo_hasta;
  elsif c.prueba_hasta > now() then
    estado := 'prueba'; hasta := c.prueba_hasta;
  else
    estado := 'vencido';
  end if;

  -- Control de teléfonos (no aplica al administrador)
  if estado in ('activo', 'prueba') then
    if p_dispositivo is null or length(p_dispositivo) not between 8 and 80 then
      estado := 'limite_dispositivos'; hasta := null;
    else
      select exists(select 1 from public.picada_dispositivos where user_id = uid and dispositivo = p_dispositivo) into registrado;
      if registrado then
        update public.picada_dispositivos set ultimo = now(), nombre = coalesce(left(p_nombre, 80), nombre)
          where user_id = uid and dispositivo = p_dispositivo;
      else
        select count(*) into usados from public.picada_dispositivos where user_id = uid and ultimo > now() - interval '30 days';
        if usados >= coalesce(cfg.limite_dispositivos, 2) then
          estado := 'limite_dispositivos'; hasta := null;
        else
          insert into public.picada_dispositivos(user_id, dispositivo, nombre) values (uid, p_dispositivo, left(p_nombre, 80))
          on conflict (user_id, dispositivo) do update set ultimo = now();
        end if;
      end if;
    end if;
  elsif estado = 'admin' and p_dispositivo is not null and length(p_dispositivo) between 8 and 80 then
    insert into public.picada_dispositivos(user_id, dispositivo, nombre) values (uid, p_dispositivo, left(p_nombre, 80))
    on conflict (user_id, dispositivo) do update set ultimo = now();
  end if;

  return jsonb_build_object(
    'estado', estado, 'acceso', estado in ('admin', 'activo', 'prueba'), 'hasta', hasta,
    'prueba_hasta', c.prueba_hasta, 'activo_hasta', c.activo_hasta, 'plan', c.plan,
    'rol', c.rol, 'email', c.email, 'nombre', c.nombre,
    'limite_dispositivos', cfg.limite_dispositivos
  );
end;
$$;
revoke all on function public.picada_acceso(text, text) from public, anon;
grant execute on function public.picada_acceso(text, text) to authenticated;

-- Libera el teléfono actual (al cerrar sesión).
create or replace function public.picada_soltar_dispositivo(p_dispositivo text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.picada_dispositivos where user_id = auth.uid() and dispositivo = p_dispositivo;
$$;
revoke all on function public.picada_soltar_dispositivo(text) from public, anon;
grant execute on function public.picada_soltar_dispositivo(text) to authenticated;
