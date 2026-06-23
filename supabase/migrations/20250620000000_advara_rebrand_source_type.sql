-- Advara rebrand: rename advara_generated → advara_generated

update public.hook_library
set source_type = 'advara_generated'
where source_type = 'advara_generated';

update public.hook_library
set manual_source_category = 'advara_generated'
where manual_source_category = 'advara_generated';

alter table public.hook_library drop constraint if exists hook_library_source_type_check;

alter table public.hook_library
  add constraint hook_library_source_type_check
  check (source_type in ('advara_generated', 'manual'));

alter table public.hook_library drop constraint if exists hook_library_manual_source_category_check;

alter table public.hook_library
  add constraint hook_library_manual_source_category_check
  check (
    manual_source_category is null
    or manual_source_category in (
      'my_own_idea',
      'competitor_ad',
      'inspiration',
      'advara_generated'
    )
  );
