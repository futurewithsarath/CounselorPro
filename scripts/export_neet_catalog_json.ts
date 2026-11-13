import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { NEET_COLLEGES_CATALOG } from '../src/data/neetCatalog';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outPath = path.resolve(__dirname, '../public/data/NEET_UG_2024_2025.json');

const metadata = {
  datasetId: 'NEET_UG_2024_2025_VERIFIED',
  exam: 'NEET_UG',
  year: 2024,
  academicSession: '2024-2025',
  totalRecords: NEET_COLLEGES_CATALOG.length,
  authorities: ['MCC', 'AP_STATE', 'TG_STATE', 'AACCC'],
  courses: ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS'],
  sources: [
    'MCC (mcc.nic.in) Round 1 & Final Allotment Results',
    'Dr. YSRUHS (drysruhs.edu.in) AP CQ & MQ Allotment Lists',
    'KNRUHS (knruhs.telangana.gov.in) TG CQ Allotment Lists',
    'AACCC (aaccc.gov.in) UG Counseling Seat Matrix & Cutoffs'
  ],
  generatedAt: new Date().toISOString(),
  metadata: {
    datasetId: 'NEET_UG_2024_2025_VERIFIED',
    exam: 'NEET_UG',
    year: 2024,
    totalRecords: NEET_COLLEGES_CATALOG.length
  },
  records: NEET_COLLEGES_CATALOG,
  colleges: NEET_COLLEGES_CATALOG
};

fs.writeFileSync(outPath, JSON.stringify(metadata, null, 2), 'utf-8');
console.log(`Successfully exported ${NEET_COLLEGES_CATALOG.length} verified NEET records to ${outPath}`);
