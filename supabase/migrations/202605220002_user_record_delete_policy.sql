drop policy if exists "Users can delete own reflection records" on public.rill_reflection_records;
create policy "Users can delete own reflection records"
  on public.rill_reflection_records
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own daily anchors" on public.rill_daily_anchors;
create policy "Users can delete own daily anchors"
  on public.rill_daily_anchors
  for delete
  using (auth.uid() = user_id);
