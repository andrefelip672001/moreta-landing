-- =====================================================
--  BASE DE DATOS — Landing Miguel Ángel Moreta
--  Pegar completo en Supabase → SQL Editor → Run
--  ANTES: cambia TU_CORREO@ejemplo.com por el correo con el que entrarás al panel.
-- =====================================================

-- ¿Quién es administrador? (solo tu correo)
create or replace function es_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'andrefelip672001@gmail.com'
$$;

-- ---------- CONTENIDO EDITABLE ----------
create table if not exists videos (
  id bigint generated always as identity primary key,
  titulo text not null,
  youtube_url text not null,
  formato text not null default 'vertical' check (formato in ('vertical','horizontal')),
  orden int not null default 0,
  activo boolean not null default true,
  creado timestamptz not null default now()
);

create table if not exists propuestas (
  id bigint generated always as identity primary key,
  numero int not null,
  titulo text not null,
  descripcion text not null default '',
  orden int not null default 0,
  activo boolean not null default true
);

create table if not exists agenda (
  id bigint generated always as identity primary key,
  fecha date not null,
  hora text not null default '',
  medio text not null,              -- ej: Radio Ritmo
  detalle text not null default '', -- ej: 98.5 FM
  tipo text not null default 'radio' check (tipo in ('radio','tv','digital','evento')),
  activo boolean not null default true
);

create table if not exists contenido (
  clave text primary key,           -- ej: 'bio'
  valor text not null default ''
);

-- ---------- DATOS QUE LLEGAN DEL PÚBLICO ----------
create table if not exists voluntarios (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 2 and 120),
  telefono text not null check (telefono ~ '^0[0-9]{9}$'),
  parroquia text not null check (char_length(parroquia) <= 80),
  barrio text check (char_length(barrio) <= 120),
  ayuda text check (char_length(ayuda) <= 300),
  fuente text check (char_length(fuente) <= 60),
  consentimiento boolean not null check (consentimiento = true),
  creado timestamptz not null default now()
);

create table if not exists eventos (
  id bigint generated always as identity primary key,
  evento text not null check (char_length(evento) <= 60),   -- visita, clic, registro...
  detalle text check (char_length(detalle) <= 120),
  fuente text check (char_length(fuente) <= 60),            -- qr-flyer, instagram, directo...
  pagina text check (char_length(pagina) <= 60),
  creado timestamptz not null default now()
);
create index if not exists eventos_creado_idx on eventos (creado);

-- ---------- SEGURIDAD (RLS) ----------
alter table videos      enable row level security;
alter table propuestas  enable row level security;
alter table agenda      enable row level security;
alter table contenido   enable row level security;
alter table voluntarios enable row level security;
alter table eventos     enable row level security;

-- El público solo VE contenido activo
create policy "publico ve videos"     on videos     for select using (activo);
create policy "publico ve propuestas" on propuestas for select using (activo);
create policy "publico ve agenda"     on agenda     for select using (activo);
create policy "publico ve contenido"  on contenido  for select using (true);

-- El público solo puede ENVIAR registros y eventos (no puede leerlos)
create policy "publico se registra" on voluntarios for insert to anon with check (consentimiento = true);
create policy "publico envia eventos" on eventos for insert to anon with check (true);

-- El administrador puede todo
create policy "admin videos"      on videos      for all using (es_admin()) with check (es_admin());
create policy "admin propuestas"  on propuestas  for all using (es_admin()) with check (es_admin());
create policy "admin agenda"      on agenda      for all using (es_admin()) with check (es_admin());
create policy "admin contenido"   on contenido   for all using (es_admin()) with check (es_admin());
create policy "admin voluntarios" on voluntarios for all using (es_admin()) with check (es_admin());
create policy "admin eventos"     on eventos     for all using (es_admin()) with check (es_admin());

-- ---------- DATOS INICIALES ----------
insert into contenido (clave, valor) values
  ('bio', 'Aquí irá la biografía del Dr. Miguel Ángel Moreta.')
on conflict (clave) do nothing;

insert into agenda (fecha, hora, medio, detalle, tipo) values
  ('2026-10-06', '7:00 am', 'Radio Ritmo', '98.5 FM', 'radio');
