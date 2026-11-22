-- مشروع تسجيل الطلاب - مؤسسة ملتقى العلم والدين
-- نفّذ هذا الملف مرة واحدة من Supabase > SQL Editor.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (char_length(trim(student_name)) between 2 and 120),
  school_name text not null check (char_length(trim(school_name)) between 2 and 160),
  grade text not null check (char_length(trim(grade)) between 1 and 80),
  section text not null check (char_length(trim(section)) between 1 and 40),
  phone text not null check (char_length(trim(phone)) between 7 and 25),
  institution_name text not null check (char_length(trim(institution_name)) between 2 and 160),
  privacy_consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists students_created_at_idx on public.students (created_at desc);
create index if not exists students_student_name_idx on public.students (lower(student_name));

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- جدول المدراء لا يمكن قراءته أو تعديله من واجهة الموقع.
alter table public.admin_users enable row level security;
revoke all on table public.admin_users from public, anon, authenticated;

-- دالة خاصة تتحقق من أن المستخدم الحالي مدرج في جدول المدراء.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- واجهة آمنة تسمح للمتصفح بمعرفة هل جلسة الدخول إدارية فقط.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin();
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- لا توجد صلاحية قراءة عامة. الزائر يستطيع إضافة سجل فقط.
alter table public.students enable row level security;
revoke all on table public.students from public, anon, authenticated;
grant insert (student_name, school_name, grade, section, phone, institution_name)
  on table public.students to anon, authenticated;
grant select, delete on table public.students to authenticated;
grant update (student_name, school_name, grade, section, phone, institution_name)
  on table public.students to authenticated;

drop policy if exists "Public can submit student registration" on public.students;
create policy "Public can submit student registration"
on public.students
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can read student registrations" on public.students;
create policy "Admins can read student registrations"
on public.students
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "Admins can update student registrations" on public.students;
create policy "Admins can update student registrations"
on public.students
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "Admins can delete student registrations" on public.students;
create policy "Admins can delete student registrations"
on public.students
for delete
to authenticated
using ((select private.is_admin()));

-- مهم: لا تضف أي سياسة SELECT لدور anon.
-- بعد إنشاء مستخدم الإدارة من Authentication > Users، نفّذ استعلام ربط المدير الموجود في README_AR.md.
