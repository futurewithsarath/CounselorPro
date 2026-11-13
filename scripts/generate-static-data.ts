import * as fs from "node:fs";
import * as path from "node:path";
import { hasValidCutoffData } from "../src/data/datasetValidation";

/** Validate committed, versioned datasets without fabricating or mutating admissions data. */
export function generateStaticData() {
  const directory = path.join(process.cwd(), "public", "data");
  const files = fs.readdirSync(directory).filter(file => file.endsWith(".json"));
  for (const file of files) {
    const payload = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
    if (!payload?.metadata || !Array.isArray(payload.colleges)) {
      throw new Error(`Invalid legacy/unverified dataset ${file}; expected a versioned metadata + colleges document.`);
    }
    const { datasetId, exam, stream, year } = payload.metadata;
    if (datasetId !== `${exam}_${String(stream).toUpperCase()}_${year}` || file !== `${datasetId}.json` || !payload.colleges.length) {
      throw new Error(`Dataset metadata does not match filename or is empty: ${file}`);
    }
    const ids = new Set<string>();
    for (const row of payload.colleges) {
      if (!row?.id || ids.has(row.id) || row.exam !== exam || row.stream !== stream || row.year !== year || !hasValidCutoffData(row)) {
        throw new Error(`Invalid, duplicated, or mixed-stream course record in ${file}`);
      }
      ids.add(row.id);
    }
    console.log(`Validated ${file}: ${ids.size} ${stream} course records (${year}).`);
  }
  console.log(`Validated ${files.length} versioned datasets; no synthetic data generated.`);
}

if (process.argv[1]?.includes("generate-static-data")) generateStaticData();
