-- The AWS Quick generators recovered in 20261122223719 now run inside the suite, so they are no
-- longer "cloud mirrors": drop the "Cloud Mirror of …" line and move each out of
-- "Duplicates & Cloud Mirrors" into the region of the generator it used to mirror. Apps still on
-- AWS Quick (MRI Pelvis O-RADS, SpineTrauma, MRI Report Generator) and the legacy companion
-- keep their tags. None of these regions is a Free one, so every tier stays Pro.
update public.apps a
set category = m.category,
    duplicate_of = null
from (values
  ('05eba3f5-f6e5-4edd-85df-b708df8aa40d', 'Neuro & Brain'),             -- CSF Flowmetry Report Generator
  ('a157c934-6f04-4839-8b9a-14ceba014f1f', 'Neuro & Brain'),             -- MRI Brain Stroke Reporter
  ('60ccd91a-477f-43ad-b7d1-162de48458fb', 'Chest, Cardiac & Vascular'), -- CTA/MRA Auto-Report Generator
  ('34e02467-8235-405c-89ed-890a77f3f4e9', 'Chest, Cardiac & Vascular'), -- CTA Report Generator
  ('d0b19931-5c0d-4cfe-a8d2-6945f867cbd5', 'Abdomen & GI'),              -- CT Abdomen Triphasic Reporter
  ('96d6c136-edf1-40e5-8e61-f91b684a8e51', 'Pelvis, GU & Oncology'),     -- Prostate MRI Report Generator
  ('354917fd-f49a-4ce4-b6b0-0865ba7b9913', 'Spine & MSK'),               -- Spine MRI Report Generator
  ('7d3c3769-8805-4086-a52a-06c79ef1296b', 'Spine & MSK'),               -- MRI Spine Report Generator
  ('a4efbcb0-b1b4-463b-9d6a-d26a0af54367', 'Spine & MSK'),               -- SpinePostOp Report Generator
  ('b734175d-ec42-458a-aedf-cb50b2b08d34', 'Breast Imaging'),            -- MammoReport AutoGen
  ('5046b766-7a88-4f18-bcd6-a6fc1a7d3191', 'Trauma, ICU & Fluoroscopy')  -- CT Trauma Report Generator
) as m (id, category)
where a.id = m.id
  and a.kind = 'integrated'
  and a.duplicate_of like 'Cloud Mirror of %';
