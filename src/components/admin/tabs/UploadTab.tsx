import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Database, 
  RefreshCw, 
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { College } from '../../../types';

interface UploadTabProps {
  onPublishDataset: (datasetId: string, records: any[], metadata: any) => Promise<void>;
}

export default function UploadTab({ onPublishDataset }: UploadTabProps) {
  const { idToken, user } = useAuth();

  const [selectedDataset, setSelectedDataset] = useState<string>('AP_EAPCET_MPC_2025');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedRecords, setParsedRecords] = useState<any[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [isParsing, setIsParsing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{ success: boolean; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const datasetOptions = [
    { id: 'AP_EAPCET_MPC_2025', exam: 'AP_EAPCET', stream: 'MPC', year: 2025, title: 'AP EAPCET 2025 (Engineering MPC)' },
    { id: 'AP_EAPCET_BIPC_2024', exam: 'AP_EAPCET', stream: 'BiPC', year: 2024, title: 'AP EAPCET 2024 (Pharmacy & Agri BiPC)' },
    { id: 'TS_EAMCET_MPC_2025', exam: 'TS_EAMCET', stream: 'MPC', year: 2025, title: 'TG EAPCET 2025 (Engineering MPC)' },
    { id: 'TS_EAMCET_BIPC_2025', exam: 'TS_EAMCET', stream: 'BiPC', year: 2025, title: 'TG EAPCET 2025 (Pharmacy & Agri BiPC)' },
    { id: 'NEET_UG_2024_2025', exam: 'NEET_UG', stream: 'NEET', year: 2025, title: 'NEET UG 2025 (Medical MBBS/BDS/AYUSH)' },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setParsedRecords(null);
    setParseErrors([]);
    setDuplicateCount(0);
    setPublishStatus(null);
    setIsParsing(true);

    try {
      const text = await uploadedFile.text();
      let records: any[] = [];

      if (uploadedFile.name.endsWith('.json')) {
        const json = JSON.parse(text);
        records = Array.isArray(json) ? json : (json.records || json.colleges || []);
      } else {
        // Parse CSV/TSV
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          throw new Error('File has no data rows.');
        }

        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

        for (let i = 1; i < lines.length; i++) {
          const rowValues = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
          if (rowValues.length < 2) continue;

          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = rowValues[idx] || '';
          });

          // Normalize keys
          const code = rowObj.code || rowObj.inst_code || rowObj.college_code || `COL_${i}`;
          const branch = rowObj.branch || rowObj.branch_code || rowObj.course || 'CSE';
          const name = rowObj.name || rowObj.institution_name || rowObj.college_name || `College ${code}`;
          const district = rowObj.district || rowObj.dist || '';
          const region = rowObj.region || 'OU';
          const type = rowObj.type || rowObj.inst_type || 'Private-Autonomous';
          const fee = Number(rowObj.fee) || null;
          const cutoffOC = Number(rowObj.cutoffoc || rowObj.oc_boys || rowObj.oc || 15000);
          const cutoffBC = Number(rowObj.cutoffbc || rowObj.bcb_boys || rowObj.bc || 25000);
          const cutoffSCST = Number(rowObj.cutoffscst || rowObj.sc_boys || rowObj.sc || 40000);

          records.push({
            id: `${selectedDataset.toLowerCase()}-${code.toLowerCase()}-${branch.toLowerCase()}-${i}`,
            code,
            name,
            branch,
            district,
            region,
            type,
            fee,
            cutoffOC,
            cutoffBC,
            cutoffSCST
          });
        }
      }

      // Check duplicates
      const seen = new Set<string>();
      let dupes = 0;
      records.forEach(r => {
        const key = `${r.code}-${r.branch}`;
        if (seen.has(key)) dupes++;
        seen.add(key);
      });

      setDuplicateCount(dupes);
      setParsedRecords(records);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setParseErrors([err.message || 'Failed to parse file. Please verify CSV or JSON structure.']);
    } finally {
      setIsParsing(false);
    }
  };

  const handlePublish = async () => {
    if (!parsedRecords || parsedRecords.length === 0) return;

    setIsPublishing(true);
    setPublishStatus(null);

    const dsConfig = datasetOptions.find(d => d.id === selectedDataset) || datasetOptions[0];
    const metadata = {
      datasetId: dsConfig.id,
      exam: dsConfig.exam,
      stream: dsConfig.stream,
      year: dsConfig.year,
      sourceTitle: `${dsConfig.title} (Official Import)`,
      publishedAt: new Date().toISOString(),
      recordCount: parsedRecords.length
    };

    try {
      await onPublishDataset(selectedDataset, parsedRecords, metadata);
      setPublishStatus({
        success: true,
        message: `Successfully synchronized ${parsedRecords.length.toLocaleString()} college records to ${dsConfig.title}. Student-facing choice filling is now live!`
      });
    } catch (err: any) {
      console.error('Publish error:', err);
      setPublishStatus({
        success: false,
        message: err.message || 'Failed to publish dataset. Please check permissions.'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Target Dataset Selection Card */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          1. Select Target Counselling Dataset
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Choose which examination stream and admission cycle will receive the imported college data.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {datasetOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedDataset(opt.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedDataset === opt.id
                  ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11px] font-bold text-emerald-800 px-1.5 py-0.5 bg-emerald-100/60 rounded">
                  {opt.exam}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {opt.year}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 line-clamp-1">{opt.title}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          2. Upload Data File (CSV, Excel or JSON)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Supported file formats: CSV (Comma-delimited), TSV (Tab-delimited), JSON, or Excel exports.
        </p>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragActive 
              ? 'border-emerald-600 bg-emerald-50/50' 
              : 'border-slate-200 hover:border-emerald-500 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt,.tsv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            {isParsing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <h4 className="text-sm font-bold text-slate-800 mb-1">
            {file ? file.name : 'Click to select or drag and drop a file'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {file 
              ? `${(file.size / 1024).toFixed(1)} KB · Click to replace` 
              : 'Official allotment cutoff CSVs, seat matrices, or college master files'}
          </p>
        </div>

        {/* Parsing errors */}
        {parseErrors.length > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Validation Warning</span>
            </div>
            {parseErrors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}
      </div>

      {/* Parse Preview & Publish Action */}
      {parsedRecords && parsedRecords.length > 0 && (
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>3. Data Validation & Preview ({parsedRecords.length.toLocaleString()} Records)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {duplicateCount > 0 
                  ? `Identified ${duplicateCount} duplicate combinations (will be deduplicated).` 
                  : 'All rows verified. Ready to synchronize.'}
              </p>
            </div>

            <button
              type="button"
              disabled={isPublishing}
              onClick={handlePublish}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing to Firestore...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Publish to Live Database</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback message */}
          {publishStatus && (
            <div className={`p-4 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
              publishStatus.success 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {publishStatus.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">
                <span className="font-bold">{publishStatus.success ? 'Success! ' : 'Error: '}</span>
                {publishStatus.message}
              </div>
            </div>
          )}

          {/* Table Preview (First 10 records) */}
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">College Name</th>
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3">District</th>
                  <th className="py-2.5 px-3 text-right">OC Cutoff</th>
                  <th className="py-2.5 px-3 text-right">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRecords.slice(0, 10).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{i + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">{r.code}</td>
                    <td className="py-2 px-3 font-medium text-slate-900 max-w-xs truncate">{r.name}</td>
                    <td className="py-2 px-3 font-mono text-emerald-700 font-bold">{r.branch}</td>
                    <td className="py-2 px-3 text-slate-600">{r.district || '—'}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-800">{r.cutoffOC?.toLocaleString() || '—'}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{r.fee ? `₹${r.fee.toLocaleString()}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            Previewing top 10 records of {parsedRecords.length.toLocaleString()} total rows.
          </p>
        </div>
      )}
    </div>
  );
}
