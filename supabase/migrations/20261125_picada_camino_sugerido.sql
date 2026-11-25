-- Habilitar por usuario la prueba de «posibles accesos por camino» (lo tilda el administrador en el panel).
-- picada_acceso devuelve además 'camino_sugerido' (el resto de la función no cambia).
alter table public.picada_cuentas add column if not exists camino_sugerido boolean not null default false;
update public.picada_cuentas set camino_sugerido = true where email = 'gonzalesrigo04@gmail.com';
