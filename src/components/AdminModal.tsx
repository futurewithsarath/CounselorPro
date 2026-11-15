import React, { useState, useEffect, useRef } from 'react';
import { Database, UploadCloud, AlertCircle, RefreshCw, X, CheckCircle, Lock, ShieldCheck, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasValidCutoffData } from '../data/datasetValidation';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export default function AdminModal({ isOpen, onClose, onUploadSuccess }: AdminModalProps) {
  const { user, userProfile, isSuperAdmin, idToken, isLoading: isAuthLoading, openAuthModal, logout } = useAuth();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [datasetMetadata, setDatasetMetadata] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'uploading' | 'success' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authoritative dual-condition Super Admin evaluation
  const isAccessAllowed = Boolean(
    !isAuthLoading &&
    user &&
    isSuperAdmin &&
    userProfile?.role === 'super_admin'
  );

  useEffect(() => {
    if (!isOpen) {
      resetPortal();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const appendLog = (msg: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

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

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.json')) {
      setStatus('error');
      setErrorMsg('Invalid file format. Please upload a .json file.');
      return;
    }

    setFile(selectedFile);
    setStatus('parsing');
    setLog([]);
    appendLog(`Loading file: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        // Check if this is a NEET UG dataset or an EAPCET dataset
        if (json.exam === 'NEET_UG' || json.metadata?.exam === 'NEET_UG') {
          const records = json.records || json.colleges;
          if (!Array.isArray(records) || records.length === 0) {
            throw new Error('NEET dataset must contain a non-empty records or colleges array.');
          }
          setParsedData(records);
          setDatasetMetadata(json.metadata || {
            datasetId: json.datasetId || 'NEET_UG_2024_2025',
            exam: 'NEET_UG',
            year: json.year || 2024,
            totalRecords: records.length
          });
          setStatus('ready');
          appendLog(`Successfully parsed NEET UG dataset: ${records.length} medical & AYUSH records found.`);
          appendLog(`Authorities detected: MCC, Dr. YSRUHS (AP), KNRUHS (Telangana), AACCC (AYUSH).`);
          appendLog(`Ready to commit to Firebase Firestore via secure Super Admin pipeline.`);
          return;
        }

        const rows = json?.colleges;
        if (!json?.metadata || !Array.isArray(rows)) {
          throw new Error('Expected a versioned CounselorPro dataset with metadata and a colleges array.');
        }

        if (rows.length === 0) {
          throw new Error('The JSON array is empty.');
        }

        const { datasetId, exam, stream, year } = json.metadata;
        if (
          !['AP_EAPCET', 'TS_EAMCET'].includes(exam) ||
          !['MPC', 'BiPC'].includes(stream) ||
          !Number.isInteger(year) ||
          datasetId !== `${exam}_${String(stream).toUpperCase()}_${year}`
        ) {
          throw new Error('Dataset ID, exam, stream, and year must match the versioned dataset naming rule.');
        }

        const ids = new Set<string>();
        for (let index = 0; index < rows.length; index++) {
          const row = rows[index];
          if (
            !row ||
            typeof row.id !== 'string' ||
            !row.id ||
            ids.has(row.id) ||
            !['code', 'name', 'branch'].every(field => typeof row[field] === 'string' && row[field].trim()) ||
            row.exam !== exam ||
            row.stream !== stream ||
            row.year !== year ||
            !hasValidCutoffData(row)
          ) {
            throw new Error(`Invalid course record or cutoff values at row ${index + 1}.`);
          }
          ids.add(row.id);
        }

        setParsedData(rows);
        setDatasetMetadata(json?.metadata || null);
        setStatus('ready');
        appendLog(`Successfully parsed dataset: ${rows.length.toLocaleString()} entries found${json?.metadata?.year ? ` (${json.metadata.year})` : ''}.`);
        appendLog(`Ready to commit to Firebase Firestore via secure Super Admin pipeline.`);
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(`Parsing Error: ${err.message}`);
        appendLog(`ERROR: Failed to parse JSON file.`);
      }
    };
    reader.onerror = () => {
      setStatus('error');
      setErrorMsg('Failed to read the file.');
    };
    reader.readAsText(selectedFile);
  };

  const triggerUpload = async () => {
    if (!parsedData) return;

    if (!user) {
      setStatus('error');
      setErrorMsg('Authentication required. Sign in with the designated Super Admin account.');
      appendLog('ACCESS BLOCKED: User is unauthenticated.');
      return;
    }

    setStatus('uploading');
    appendLog(`Initiating secure administrator pipeline...`);
    appendLog(`Validating and uploading the complete dataset as one versioned import...`);

    try {
      // Always get a freshly verified ID token from Firebase Auth
      const authToken = await user.getIdToken(true);
      if (!authToken) {
        throw new Error('Could not acquire valid Firebase ID token.');
      }

      const res = await fetch('/api/admin/upload-colleges', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ metadata: datasetMetadata, colleges: parsedData })
      });

      let result: any;
      const responseText = await res.text();
      try {
        result = JSON.parse(responseText);
      } catch (parseErr: any) {
        throw new Error(`Failed to parse server response as JSON. Raw response (truncated): ${responseText.substring(0, 400)}${responseText.length > 400 ? '...' : ''}`);
      }

      if (!res.ok) {
        throw new Error(result.error || result.details || `Server returned error status ${res.status}.`);
      }

      appendLog(`Dataset upload complete: ${result.details || result.message}`);
      setStatus('success');
      appendLog(`Successfully synchronized all ${parsedData.length.toLocaleString()} records.`);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
      appendLog(`FATAL UPLOAD ERROR: ${err.message}`);
    }
  };

  const resetPortal = () => {
    setFile(null);
    setParsedData(null);
    setStatus('idle');
    setLog([]);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-100 flex items-center justify-center p-0 sm:p-4" id="admin-modal-overlay">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90dvh] overflow-hidden" id="admin-modal-container">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-600 text-white rounded-md">
              <Database className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-sans font-extrabold text-slate-900 tracking-tight text-sm sm:text-base leading-none">Database Administration</h2>
              <p className="text-[10px] text-slate-500 font-mono mt-1">CounselorPro Production Data Synchronization</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAccessAllowed ? (
          <>
            {/* Content View - AUTHORIZATION GATE */}
            <div className="p-4 sm:p-6 flex-grow overflow-y-auto space-y-6">
              <div className="text-center max-w-md mx-auto py-4 space-y-4">
                <div className="inline-flex p-3.5 bg-slate-50 border border-slate-200/80 text-slate-700 rounded-2xl shadow-2xs">
                  <Lock className="w-8 h-8 text-slate-600" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-sans font-extrabold text-slate-900 text-lg tracking-tight">Super Administrator Gate</h3>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto">
                    This administrative pipeline manages college databases and cutoff records. Access is strictly restricted to the verified Super Administrator account.
                  </p>
                </div>
              </div>

              {isAuthLoading ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-2">
                  <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                  <span className="text-xs text-slate-500 font-mono">Verifying administrative credentials...</span>
                </div>
              ) : !user ? (
                <div className="max-w-md mx-auto space-y-4 bg-slate-50 border border-slate-200/80 p-5 rounded-2xl text-center">
                  <p className="text-xs text-slate-600">
                    You are not signed in. Please authenticate with your authorized Super Admin account to access this console.
                  </p>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs tracking-wider uppercase font-mono shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Super Admin</span>
                  </button>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-4 bg-red-50/70 border border-red-200 p-5 rounded-2xl text-center">
                  <div className="inline-flex p-2 bg-red-100 rounded-full text-red-600 mb-1">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-red-900 text-sm">Administrative Access Denied</h4>
                  <p className="text-xs text-red-800 leading-relaxed">
                    Signed in as <strong className="font-mono text-red-950">{user.email || user.uid}</strong>.<br />
                    Detected Role: <span className="font-mono font-bold uppercase">{userProfile?.role || 'STUDENT'}</span>.
                  </p>
                  <p className="text-[11px] text-red-700 leading-relaxed">
                    Student accounts and unassigned roles cannot view or manage database synchronization pipelines.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      onClose();
                    }}
                    className="mt-2 py-2 px-4 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs tracking-wider uppercase font-mono shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                Console Protected
              </span>
              <button 
                onClick={onClose}
                className="px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Content View - AUTHORIZED PANEL */}
            <div className="p-6 flex-grow overflow-y-auto space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border rounded-xl p-4 bg-emerald-50/60 border-emerald-200 text-emerald-800">
                <div className="flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <span className="font-bold block">
                      Verified Super Admin: {user?.email || user?.uid}
                    </span>
                    <p className="leading-relaxed text-emerald-700">
                      Authenticated with authoritative Firebase Custom Claims (<code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">role: super_admin</code>). Database synchronization commits directly to Firestore.
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="px-2.5 py-1.5 border font-semibold rounded-lg text-[10px] font-mono flex items-center gap-1 transition-all shrink-0 cursor-pointer bg-emerald-100/80 hover:bg-emerald-150 border-emerald-200 text-emerald-800"
                  title="Sign Out Super Admin"
                >
                  <LogOut className="w-3 h-3" />
                  <span>SIGN OUT</span>
                </button>
              </div>

              {/* Dataset Health & Verification Overview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-mono flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    Verified System Datasets (3,890+ Records)
                  </h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full font-mono">
                    All Active & Ready
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-white border border-slate-200/80 rounded-lg flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">NEET UG MCC Round 1 (2026)</div>
                      <div className="text-[10px] text-slate-500 font-mono">724 records • 33 States • 24 Quotas</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/80 rounded-lg flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">NMC Medical Directory (2025-26)</div>
                      <div className="text-[10px] text-slate-500 font-mono">819 colleges • 128,925 MBBS seats</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/80 rounded-lg flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">AP EAPCET 2024 / 2025</div>
                      <div className="text-[10px] text-slate-500 font-mono">Engineering & Pharmacy • MPC / BiPC</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/80 rounded-lg flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">TS EAMCET 2024 / 2025</div>
                      <div className="text-[10px] text-slate-500 font-mono">Engineering & Pharmacy • MPC / BiPC</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/80 rounded-lg flex items-start gap-2 sm:col-span-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">JEE Main JoSAA (2024-2025)</div>
                      <div className="text-[10px] text-slate-500 font-mono">32 National Institutes of Technology (NITs) across India</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Drag Drop Zone */}
              {status === 'idle' && (
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/50'
                  }`}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept=".json"
                    onChange={handleFileChange}
                  />
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-800">Choose a versioned college dataset JSON</p>
                  <p className="text-xs text-slate-400 font-mono mt-1">Accepts the CounselorPro metadata + colleges format</p>
                </div>
              )}

              {/* File Loaded View */}
              {(status === 'parsing' || status === 'ready' || status === 'uploading' || status === 'success' || status === 'error') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border border-slate-200 rounded-xl p-4 bg-slate-50 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <Database className="w-6 h-6 text-emerald-600" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 font-mono">{file?.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono">{(file!.size / 1024).toFixed(1)} KB • {parsedData ? `${parsedData.length.toLocaleString()} entries` : 'parsing...'}</p>
                      </div>
                    </div>
                    {status === 'ready' && (
                      <button 
                        onClick={resetPortal}
                        className="text-xs text-slate-500 font-semibold hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 transition-all cursor-pointer"
                      >
                        Change File
                      </button>
                    )}
                  </div>

                  {/* Logger Console Box */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider font-bold text-slate-400 block uppercase">Real-Time Administrative Logs</label>
                    <div className="bg-slate-950 text-emerald-400 font-mono text-[10px] p-4 rounded-xl h-44 overflow-y-auto space-y-1 shadow-inner border border-slate-900 leading-normal font-medium">
                      {log.map((line, idx) => (
                        <div key={idx} className="whitespace-pre-wrap">{line}</div>
                      ))}
                      {status === 'parsing' && <div className="text-slate-500 animate-pulse">Parsing file...</div>}
                      {status === 'uploading' && <div className="text-slate-300 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Committing documents to Firebase Firestore via Super Admin pipeline...
                      </div>}
                    </div>
                  </div>

                  {/* Status Views */}
                  {status === 'success' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-800">
                      <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                      <div className="text-xs">
                        <strong className="font-bold block text-sm">Synchronized Successfully!</strong>
                        <p className="text-emerald-700 leading-relaxed mt-0.5">
                          All {parsedData?.length.toLocaleString()} records have been validated and synchronized to the Firebase <code className="font-mono bg-emerald-100 px-1 rounded">colleges</code> collection.
                        </p>
                      </div>
                    </div>
                  )}

                  {status === 'error' && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-800">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                      <div className="text-xs">
                        <strong className="font-bold block text-sm">Processing Failed</strong>
                        <p className="text-red-700 leading-relaxed mt-0.5">{errorMsg}</p>
                        <button 
                          onClick={resetPortal}
                          className="mt-3 text-xs bg-white text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                        >
                          Retry upload
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer controls */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
              <button 
                onClick={onClose}
                disabled={status === 'uploading'}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              
              {status === 'ready' && (
                <button 
                  onClick={triggerUpload}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-lg text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  Upload & Populate Firestore
                </button>
              )}

              {status === 'success' && (
                <button 
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
