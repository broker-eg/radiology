-- "CT / MRI Female Genital System Report Generator" was labelled a legacy companion of
-- CT / MRI Gynecology Pro, but it is its own generator (separate code, 14 presets, O-RADS 2023
-- and congenital anomalies vs Gynecology Pro's #Enzian and PAS), so it moves next to it in
-- Pelvis, GU & Oncology without the tag. Duplicates & Cloud Mirrors is left with the three
-- AWS Quick apps only; its subtitle says so.
update public.apps
set category = 'Pelvis, GU & Oncology',
    duplicate_of = null
where id = 'local-ct-mri-female-genital'
  and duplicate_of = 'Legacy Companion of CT / MRI Gynecology Pro';

update public.categories
set subtitle = 'AWS Quick cloud mirrors & alternate versions (all preserved & launchable)'
where name = 'Duplicates & Cloud Mirrors';
