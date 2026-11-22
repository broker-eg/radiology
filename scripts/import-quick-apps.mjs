#!/usr/bin/env node
// Uploads generators recovered from AWS Quick (aws-quick-radiology-apps.zip: one standalone
// HTML file per app, with an in-memory storage fallback for sandboxed frames) to
// `app-html/<app id>.html`. The catalog rows are switched to integrated by the migration
// 20261122223719_integrate_aws_quick_generators.sql, which refuses to run before this.
//
//   node scripts/import-quick-apps.mjs <unzipped-dir>
//
// Re-running is safe (objects are upserted). Uses the Management API token like
// scripts/supabase-api.mjs.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { uploadObject } from './lib/management-api.mjs';

// file in the archive → apps.id (each file rendered and checked against its catalog entry)
export const QUICK_FILES = {
  'CSF-Flowmetry-Report-Generator.html': '05eba3f5-f6e5-4edd-85df-b708df8aa40d',
  'CT-Abdomen-Triphasic-Reporter.html': 'd0b19931-5c0d-4cfe-a8d2-6945f867cbd5',
  'CT-Chest-Fleischner-Nodule-Reporter.html': 'd5fbf435-d593-4e04-a674-a2f8f365ccce',
  'CT-PA-Report-Generator-PE-RAD-2026.html': '57a69ba4-91eb-43a3-8400-a76eacb81f1e',
  'CT-Trauma-Report-Generator.html': '5046b766-7a88-4f18-bcd6-a6fc1a7d3191',
  'CTA-MRA-Auto-Report-Generator.html': '60ccd91a-477f-43ad-b7d1-162de48458fb',
  'CTA-Report-Generator.html': '34e02467-8235-405c-89ed-890a77f3f4e9',
  'MR-Rectal-Report-Generator.html': '3713d976-46f4-457e-8a03-bbcded553a93',
  'MRI-Brain-Stroke-Reporter.html': 'a157c934-6f04-4839-8b9a-14ceba014f1f',
  'MRI-Knee-Report-Generator.html': '19d4fca3-3222-4c35-bede-2cec5d9167a6',
  'MRI-Pelvis-VI-RADS-Report-Generator.html': '33540530-43c4-453e-b8da-d2b51f8b80f1',
  'MRI-Spine-Report-Generator.html': '7d3c3769-8805-4086-a52a-06c79ef1296b',
  'MammoReport-AutoGen.html': 'b734175d-ec42-458a-aedf-cb50b2b08d34',
  'Prostate-MRI-Report-Generator.html': '96d6c136-edf1-40e5-8e61-f91b684a8e51',
  'Radiology-Report-Workstation.html': '6ef0b510-17c2-42b2-94ca-1f9eceb80236',
  'Spine-MRI-Report-Generator.html': '354917fd-f49a-4ce4-b6b0-0865ba7b9913',
  'SpinePostOp-Report-Generator.html': 'a4efbcb0-b1b4-463b-9d6a-d26a0af54367',
  'Stroke-CT-Report-Generator.html': '23a062dc-a086-45df-b41e-34f9098757d5',
};

// In the archive but NOT imported: the code inside is a different generator, so these apps
// keep opening AWS Quick until a correct export exists.
//   CT-Coronary-Angio-Report-Generator.html  (08eb4313…) contains an MR Rectal generator
//   MRI-Pelvis-O-RADS-Report-Generator.html  (fe0e378f…) contains a CTPA PE-RAD generator
//   SpineTrauma-Report-Generator.html        (98a51ce9…) contains a CTA/MRA vascular generator

const dir = process.argv[2];
if (!dir) {
  console.error('usage: import-quick-apps.mjs <unzipped-dir>');
  process.exit(1);
}
const missing = Object.keys(QUICK_FILES).filter((f) => !existsSync(join(dir, f)));
if (missing.length) {
  console.error(`missing in ${dir}:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const queue = Object.entries(QUICK_FILES);
const failures = [];
let done = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const [file, id] = job;
      try {
        await uploadObject('app-html', `${id}.html`, readFileSync(join(dir, file)), {
          contentType: 'text/html',
        });
        console.log(`${++done}/${Object.keys(QUICK_FILES).length}  ${file} → ${id}.html`);
      } catch (err) {
        failures.push(String(err));
      }
    }
  }),
);
if (failures.length) {
  console.error(`${failures.length} upload(s) failed:\n${failures.join('\n')}`);
  process.exit(1);
}
