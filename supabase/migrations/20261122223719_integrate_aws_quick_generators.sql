-- AWS Quick generators recovered as standalone HTML now run inside the suite like every other
-- integrated generator: sandboxed, plan-gated by the app-html Storage policy, downloadable for
-- offline use. Upload the files first:
--   node scripts/import-quick-apps.mjs <unzipped aws-quick-radiology-apps.zip>
-- Still on AWS Quick: three apps whose file in that archive held another generator's code
-- (CT Coronary Angio, MRI Pelvis O-RADS, SpineTrauma) and three with no export (MRI / CT
-- Structured Report Generator, MRI Report Generator).
do $$
declare
  ids constant text[] := array[
    '05eba3f5-f6e5-4edd-85df-b708df8aa40d', -- CSF Flowmetry Report Generator
    'd0b19931-5c0d-4cfe-a8d2-6945f867cbd5', -- CT Abdomen Triphasic Reporter
    'd5fbf435-d593-4e04-a674-a2f8f365ccce', -- CT Chest Fleischner Nodule Reporter
    '57a69ba4-91eb-43a3-8400-a76eacb81f1e', -- CT PA Report Generator - PE RAD 2026
    '5046b766-7a88-4f18-bcd6-a6fc1a7d3191', -- CT Trauma Report Generator
    '60ccd91a-477f-43ad-b7d1-162de48458fb', -- CTA/MRA Auto-Report Generator
    '34e02467-8235-405c-89ed-890a77f3f4e9', -- CTA Report Generator
    '3713d976-46f4-457e-8a03-bbcded553a93', -- MR Rectal Report Generator
    'a157c934-6f04-4839-8b9a-14ceba014f1f', -- MRI Brain Stroke Reporter
    '19d4fca3-3222-4c35-bede-2cec5d9167a6', -- MRI Knee Report Generator
    '33540530-43c4-453e-b8da-d2b51f8b80f1', -- MRI Pelvis VI-RADS Report Generator
    '7d3c3769-8805-4086-a52a-06c79ef1296b', -- MRI Spine Report Generator
    'b734175d-ec42-458a-aedf-cb50b2b08d34', -- MammoReport AutoGen
    '96d6c136-edf1-40e5-8e61-f91b684a8e51', -- Prostate MRI Report Generator
    '6ef0b510-17c2-42b2-94ca-1f9eceb80236', -- Radiology Report Workstation (stays Draft)
    '354917fd-f49a-4ce4-b6b0-0865ba7b9913', -- Spine MRI Report Generator
    'a4efbcb0-b1b4-463b-9d6a-d26a0af54367', -- SpinePostOp Report Generator
    '23a062dc-a086-45df-b41e-34f9098757d5'  -- Stroke CT Report Generator
  ];
  missing text;
begin
  -- Never point the catalog at a file that isn't there (a fresh database has no rows yet).
  select string_agg(a.name, ', ') into missing
  from public.apps a
  where a.id = any (ids)
    and a.kind = 'external'
    and not exists (
      select 1 from storage.objects o where o.bucket_id = 'app-html' and o.name = a.id || '.html'
    );
  if missing is not null then
    raise exception 'Upload the HTML first (scripts/import-quick-apps.mjs). Missing: %', missing;
  end if;

  update public.apps
  set kind = 'integrated',
      status = case when status = 'Draft' then 'Draft' else 'Integrated' end,
      external_url = null,
      html_path = id || '.html'
  where id = any (ids)
    and kind = 'external';
end $$;
