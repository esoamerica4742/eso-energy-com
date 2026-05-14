
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "Authenticated users create companies" on public.companies;
create policy "Authenticated users create companies"
  on public.companies for insert
  to authenticated
  with check (auth.uid() is not null);
