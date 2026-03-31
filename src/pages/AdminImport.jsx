import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Papa from 'papaparse';
import { 
  UploadCloud, 
  FileUp, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  Settings, 
  Database, 
  List, 
  Play, 
  Loader2,
  RefreshCw,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

// --- Constants ---
const STEPS = [
  { id: 1, title: 'ატვირთვა', icon: UploadCloud },
  { id: 2, title: 'მეპინგი', icon: List },
  { id: 3, title: 'კატეგორიები', icon: Database },
  { id: 4, title: 'იმპორტი', icon: Play },
];

const REQUIRED_FIELDS = [
  { key: 'title', label: 'დასახელება', required: true },
  { key: 'description', label: 'აღწერა', required: true },
  { key: 'price', label: 'ფასი', required: true },
  { key: 'image_url', label: 'სურათები', required: true },
  { key: 'link', label: 'წყარო (Link)', required: false },
];

const AdminImport = () => {
  const { toast } = useToast();
  
  // --- State: Navigation ---
  const [currentStep, setCurrentStep] = useState(1);

  // --- State: Data ---
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  
  // --- State: Mapping ---
  const [columnMapping, setColumnMapping] = useState({
    title: '',
    description: '',
    price: '',
    image_url: '',
    link: ''
  });

  // --- State: Categories ---
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isRandomCategory, setIsRandomCategory] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // --- State: Execution ---
  const [importOptions, setImportOptions] = useState({
    updateExisting: false,
    skipDuplicates: true
  });
  const [importStatus, setImportStatus] = useState({
    isImporting: false,
    progress: 0,
    total: 0,
    success: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    logs: [], // { row, status, message }
    isComplete: false
  });

  // --- Effects ---
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      setAvailableCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast({ title: 'შეცდომა', description: 'კატეგორიების წამოღება ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // --- Step 1: Upload Logic ---
  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith('.csv')) {
      toast({ title: "არასწორი ფაილი", description: "გთხოვთ ატვირთოთ .csv ფაილი", variant: "destructive" });
      return;
    }

    setFile(selectedFile);
    
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn("CSV Errors:", results.errors);
        }
        
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);
        
        // Auto-map if headers match roughly
        const newMapping = { ...columnMapping };
        headers.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('title') || lower.includes('name')) newMapping.title = h;
          if (lower.includes('desc')) newMapping.description = h;
          if (lower.includes('price')) newMapping.price = h;
          if (lower.includes('image') || lower.includes('img')) newMapping.image_url = h;
          if (lower.includes('link') || lower.includes('url')) newMapping.link = h;
        });
        setColumnMapping(newMapping);
      }
    });
  };

  // --- Step 2: Validation ---
  const isMappingValid = () => {
    return REQUIRED_FIELDS
      .filter(f => f.required)
      .every(f => columnMapping[f.key] && columnMapping[f.key] !== '');
  };

  // --- Logic: Data Processing ---
  const sanitizeText = (text) => {
    if (!text) return '';
    return String(text).trim();
  };

  const processImages = (imageString) => {
    if (!imageString) return [];
    // Split by comma, trim, filter empty
    const urls = String(imageString).split(',').map(u => u.trim()).filter(u => u.length > 0);
    
    return urls.map(url => {
      // Prepend https if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    });
  };

  const getMappedData = (row) => {
    const images = processImages(row[columnMapping.image_url]);
    return {
      title: sanitizeText(row[columnMapping.title]),
      description: sanitizeText(row[columnMapping.description]),
      price: parseFloat(String(row[columnMapping.price]).replace(/[^0-9.]/g, '')) || 0,
      main_image: images[0] || '',
      additional_images: images.slice(1),
      link: columnMapping.link ? sanitizeText(row[columnMapping.link]) : null,
      raw_row: row
    };
  };

  const executeImport = async () => {
    if (csvData.length === 0) return;

    setImportStatus({
      isImporting: true,
      progress: 0,
      total: csvData.length,
      success: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      logs: [],
      isComplete: false
    });

    const batchSize = 10; // Process in small batches to keep UI responsive
    let processed = 0;
    
    // We need to keep track of category index for even distribution
    let categoryDistributionIndex = 0;
    const activeCategoryIds = selectedCategories; // List of IDs

    const log = (type, message, rowIdx) => {
      setImportStatus(prev => ({
        ...prev,
        logs: [...prev.logs, { type, message, rowIdx }]
      }));
    };

    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (row, batchIdx) => {
        const globalIdx = i + batchIdx;
        const mapped = getMappedData(row);
        
        try {
          // 1. Validation
          if (!mapped.title) throw new Error("Missing Title");
          if (!mapped.price && mapped.price !== 0) throw new Error("Invalid Price");
          if (!mapped.main_image) throw new Error("No valid images found");

          // 2. Check Duplicate
          // NOTE: 'title' column does not exist in products table, so we cannot check by title directly.
          // We check by external_id (link) if available.
          let existing = null;
          if (mapped.link) {
             const { data } = await supabase
               .from('products')
               .select('id')
               .eq('external_id', mapped.link)
               .maybeSingle();
             existing = data;
          }

          let productId = existing?.id;
          let isNew = !productId;

          if (existing) {
             if (importOptions.skipDuplicates && !importOptions.updateExisting) {
               setImportStatus(prev => ({ ...prev, skipped: prev.skipped + 1 }));
               return; // Skip
             }
             if (!importOptions.updateExisting) {
                setImportStatus(prev => ({ ...prev, skipped: prev.skipped + 1 }));
                return;
             }
          }

          // 3. Prepare Category
          let assignedCategoryId = null;
          if (activeCategoryIds.length > 0) {
            if (isRandomCategory) {
              assignedCategoryId = activeCategoryIds[globalIdx % activeCategoryIds.length];
            } else {
              assignedCategoryId = activeCategoryIds[0];
            }
          }

          // 4. Upsert Product
          // NOTE: Removed 'title' from payload as it does not exist in schema
          const productPayload = {
            price: mapped.price,
            image_url: mapped.main_image,
            category_id: assignedCategoryId,
            external_id: mapped.link,
            stock_quantity: 100, // Default
            manage_inventory: false,
            is_active: true,
            updated_at: new Date().toISOString()
          };
          
          if (isNew) {
            productPayload.created_at = new Date().toISOString();
            // Insert
            const { data: newProd, error: insertError } = await supabase
              .from('products')
              .insert([productPayload])
              .select()
              .single();
              
            if (insertError) throw insertError;
            productId = newProd.id;
            setImportStatus(prev => ({ ...prev, success: prev.success + 1 }));
          } else {
            // Update
            const { error: updateError } = await supabase
              .from('products')
              .update(productPayload)
              .eq('id', productId);
              
            if (updateError) throw updateError;
            setImportStatus(prev => ({ ...prev, updated: prev.updated + 1 }));
          }

          // 5. Update Translations
          // We use the CSV title/description to populate the translations table
          const translationUpdates = [
            { key: `prod_name_${productId}`, ka: mapped.title, en: mapped.title, ru: mapped.title },
            { key: `prod_desc_${productId}`, ka: mapped.description, en: mapped.description, ru: mapped.description }
          ];
          for (const t of translationUpdates) {
             await supabase.from('translations').upsert(t, { onConflict: 'key' });
          }

          // 6. Handle Additional Images (product_images)
          if (!isNew) {
            await supabase.from('product_images').delete().eq('product_id', productId);
          }

          if (mapped.additional_images.length > 0) {
            const imageInserts = mapped.additional_images.map((url, idx) => ({
              product_id: productId,
              image_url: url,
              sort_order: idx + 1
            }));
            await supabase.from('product_images').insert(imageInserts);
          }

        } catch (err) {
          console.error(`Row ${globalIdx + 1} Error:`, err);
          setImportStatus(prev => ({ ...prev, failed: prev.failed + 1 }));
          log('error', err.message || 'Unknown error', globalIdx + 1);
        }
      }));

      processed += batch.length;
      setImportStatus(prev => ({ ...prev, progress: processed }));
      
      await new Promise(r => setTimeout(r, 50));
    }

    setImportStatus(prev => ({ ...prev, isImporting: false, isComplete: true }));
    toast({ title: "დასრულდა!", description: "იმპორტის პროცესი დასრულებულია." });
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setFile(null);
    setCsvData([]);
    setImportStatus({
      isImporting: false,
      progress: 0,
      total: 0,
      success: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      logs: [],
      isComplete: false
    });
  };

  // --- Renders ---

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-300 text-center hover:bg-gray-50 transition-colors relative group">
        <input 
          type="file" 
          accept=".csv"
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="bg-[#57c5cf]/10 p-4 rounded-full group-hover:scale-110 transition-transform">
             <FileUp className="w-10 h-10 text-[#57c5cf]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">ატვირთეთ CSV ფაილი</h3>
            <p className="text-sm text-gray-500 mt-1">დააჭირეთ ან ჩააგდეთ ფაილი აქ</p>
          </div>
        </div>
      </div>

      {file && (
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-white p-2 rounded-lg shadow-sm">
                <Database className="w-5 h-5 text-blue-600" />
             </div>
             <div>
                <p className="font-bold text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB • {csvData.length} rows</p>
             </div>
          </div>
          <CheckCircle className="w-6 h-6 text-green-500" />
        </div>
      )}

      {csvHeaders.length > 0 && (
         <div className="mt-4">
            <h4 className="text-sm font-bold text-gray-700 mb-2">ნაპოვნი სვეტები:</h4>
            <div className="flex flex-wrap gap-2">
               {csvHeaders.map(h => (
                 <span key={h} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs border border-gray-200">
                    {h}
                 </span>
               ))}
            </div>
         </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
         <p className="text-sm text-blue-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            შეუსაბამეთ თქვენი CSV ფაილის სვეტები სისტემის ველებს.
         </p>
      </div>

      <div className="grid gap-6">
         {REQUIRED_FIELDS.map((field) => (
           <div key={field.key} className="grid md:grid-cols-3 gap-4 items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="md:col-span-1">
                 <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                 </label>
                 <p className="text-xs text-gray-400 mt-1">
                    {field.key === 'image_url' ? 'URLs separated by comma' : 'System field'}
                 </p>
              </div>
              <div className="md:col-span-2">
                 <select
                   value={columnMapping[field.key] || ''}
                   onChange={(e) => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                   className={`w-full p-3 rounded-lg border bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 ${
                      field.required && !columnMapping[field.key] 
                        ? 'border-red-300 focus:ring-red-200' 
                        : 'border-gray-200 focus:ring-[#57c5cf]/30'
                   }`}
                 >
                    <option value="">აირჩიეთ სვეტი...</option>
                    {csvHeaders.map(h => (
                       <option key={h} value={h}>{h}</option>
                    ))}
                 </select>
              </div>
           </div>
         ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="flex justify-between items-center mb-4">
         <h3 className="font-bold text-lg text-gray-800">აირჩიეთ კატეგორიები</h3>
         <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border">
            <Switch 
               id="random-mode"
               checked={isRandomCategory}
               onCheckedChange={setIsRandomCategory}
            />
            <label htmlFor="random-mode" className="text-sm cursor-pointer select-none">
               შემთხვევითი გადანაწილება
            </label>
         </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-1 max-h-[400px] overflow-y-auto">
         {isLoadingCategories ? (
            <div className="p-8 text-center text-gray-500">იტვირთება...</div>
         ) : (
            <div className="grid md:grid-cols-2 gap-1">
               {availableCategories.map(cat => (
                  <label 
                    key={cat.id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                       selectedCategories.includes(cat.id) ? 'bg-[#57c5cf]/10 border border-[#57c5cf]/30' : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                     <input 
                        type="checkbox"
                        className="w-5 h-5 rounded text-[#57c5cf] focus:ring-[#57c5cf]"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={(e) => {
                           if (e.target.checked) {
                              setSelectedCategories(prev => [...prev, cat.id]);
                           } else {
                              setSelectedCategories(prev => prev.filter(id => id !== cat.id));
                           }
                        }}
                     />
                     <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                  </label>
               ))}
            </div>
         )}
      </div>
      
      {isRandomCategory && selectedCategories.length > 0 && (
         <div className="bg-purple-50 text-purple-800 p-4 rounded-xl text-sm border border-purple-100 flex items-center gap-3">
            <RefreshCw className="w-5 h-5" />
            <span>
               პროდუქტები გადანაწილდება თანაბრად მონიშნულ {selectedCategories.length} კატეგორიაზე.
            </span>
         </div>
      )}
    </div>
  );

  const renderStep4 = () => {
    // Generate Preview
    const previewItems = csvData.slice(0, 5).map(row => getMappedData(row));

    if (importStatus.isComplete) {
       return (
          <div className="animate-in fade-in zoom-in-95 space-y-8 text-center py-10">
             <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 text-green-600 mb-4">
                <CheckCircle className="w-12 h-12" />
             </div>
             <h2 className="text-3xl font-bold text-gray-800">იმპორტი წარმატებით დასრულდა!</h2>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                <div className="bg-gray-50 p-4 rounded-2xl">
                   <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">სულ</p>
                   <p className="text-3xl font-bold text-gray-800">{importStatus.total}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl">
                   <p className="text-green-600 text-xs uppercase font-bold tracking-wider">დაემატა</p>
                   <p className="text-3xl font-bold text-green-700">{importStatus.success}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl">
                   <p className="text-blue-600 text-xs uppercase font-bold tracking-wider">განახლდა</p>
                   <p className="text-3xl font-bold text-blue-700">{importStatus.updated}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl">
                   <p className="text-red-600 text-xs uppercase font-bold tracking-wider">ვერ მოხერხდა</p>
                   <p className="text-3xl font-bold text-red-700">{importStatus.failed}</p>
                </div>
             </div>

             {importStatus.logs.length > 0 && (
                <div className="max-w-3xl mx-auto mt-8 bg-gray-50 rounded-xl p-4 text-left border overflow-hidden">
                   <h4 className="font-bold text-sm text-gray-700 mb-2">ხარვეზების ლოგი:</h4>
                   <div className="max-h-40 overflow-y-auto space-y-2 text-xs">
                      {importStatus.logs.map((log, i) => (
                         <div key={i} className="flex gap-2 text-red-600">
                            <span className="font-mono bg-red-100 px-1 rounded">Row {log.rowIdx}</span>
                            <span>{log.message}</span>
                         </div>
                      ))}
                   </div>
                </div>
             )}

             <div className="flex justify-center gap-4 pt-4">
                <Button onClick={resetWizard} variant="outline" className="gap-2">
                   <RefreshCw className="w-4 h-4" /> ახალი იმპორტი
                </Button>
                <Button onClick={() => window.location.href = '/admin/products'} className="gap-2 bg-[#57c5cf] hover:bg-[#4bc0cb]">
                   <List className="w-4 h-4" /> პროდუქტების სია
                </Button>
             </div>
          </div>
       );
    }

    if (importStatus.isImporting) {
       const percentage = Math.round((importStatus.progress / importStatus.total) * 100);
       return (
          <div className="py-20 text-center space-y-8 max-w-2xl mx-auto animate-in fade-in">
             <div className="relative w-40 h-40 mx-auto">
                <Loader2 className="w-full h-full text-[#57c5cf] animate-spin opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-3xl text-gray-700">
                   {percentage}%
                </div>
             </div>
             
             <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">მიმდინარეობს იმპორტი...</h3>
                <p className="text-gray-500">დამუშავდა {importStatus.progress} / {importStatus.total} პროდუქტი</p>
                <p className="text-xs text-gray-400 mt-2">გთხოვთ არ დახუროთ ფანჯარა</p>
             </div>

             <div className="h-4 bg-gray-100 rounded-full overflow-hidden w-full max-w-lg mx-auto">
                <div 
                   className="h-full bg-[#57c5cf] transition-all duration-300" 
                   style={{ width: `${percentage}%` }}
                />
             </div>
          </div>
       );
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
         {/* Options */}
         <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border flex items-center justify-between">
               <div>
                  <span className="block font-bold text-sm text-gray-700">არსებულის განახლება</span>
                  <span className="text-xs text-gray-500">თუ სახელი ემთხვევა</span>
               </div>
               <Switch 
                  checked={importOptions.updateExisting}
                  onCheckedChange={(checked) => setImportOptions({ updateExisting: checked, skipDuplicates: !checked })}
               />
            </div>
            <div className="bg-white p-4 rounded-xl border flex items-center justify-between">
               <div>
                  <span className="block font-bold text-sm text-gray-700">დუბლიკატების გამოტოვება</span>
                  <span className="text-xs text-gray-500">არ შეიქმნას ახალი თუ არსებობს</span>
               </div>
               <Switch 
                  checked={importOptions.skipDuplicates}
                  onCheckedChange={(checked) => setImportOptions({ skipDuplicates: checked, updateExisting: !checked })}
               />
            </div>
         </div>

         {/* Preview Table */}
         <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
               <h4 className="font-bold text-gray-700">მონაცემების გადახედვა (5 Items)</h4>
               <Badge variant="outline">{csvData.length} Total Items</Badge>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 border-b">
                     <tr>
                        <th className="p-3">სურათი</th>
                        <th className="p-3">დასახელება</th>
                        <th className="p-3">ფასი</th>
                        <th className="p-3">აღწერა</th>
                        <th className="p-3">სტატუსი</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y">
                     {previewItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                           <td className="p-3">
                              {item.main_image ? (
                                 <img src={item.main_image} alt="" className="w-10 h-10 object-cover rounded bg-gray-100" />
                              ) : <div className="w-10 h-10 bg-gray-100 rounded" />}
                           </td>
                           <td className="p-3 font-medium max-w-[200px] truncate">{item.title}</td>
                           <td className="p-3 font-bold text-[#57c5cf]">{item.price} ₾</td>
                           <td className="p-3 text-gray-500 max-w-[200px] truncate">{item.description}</td>
                           <td className="p-3">
                              {!item.title || !item.main_image 
                                 ? <Badge variant="destructive">Invalid</Badge> 
                                 : <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Valid</Badge>
                              }
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <Helmet><title>Admin - Import Wizard</title></Helmet>

      {/* Header */}
      <div className="mb-8 pt-8">
        <h1 className="text-3xl font-heading font-bold text-gray-800">პროდუქტების იმპორტი</h1>
        <p className="text-gray-500 mt-2">დაამატეთ ან განაახლეთ პროდუქტები CSV ფაილის საშუალებით</p>
      </div>

      {/* Steps Indicator */}
      <div className="mb-10">
         <div className="relative flex justify-between max-w-3xl mx-auto">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2 rounded-full" />
            <div 
               className="absolute top-1/2 left-0 h-1 bg-[#57c5cf] -z-10 -translate-y-1/2 rounded-full transition-all duration-500"
               style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
            
            {STEPS.map((step) => {
               const Icon = step.icon;
               const isActive = currentStep >= step.id;
               const isCurrent = currentStep === step.id;
               
               return (
                  <div key={step.id} className="flex flex-col items-center gap-2 bg-gray-50 p-2 rounded-xl">
                     <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
                           isActive 
                              ? 'bg-[#57c5cf] text-white scale-110' 
                              : 'bg-white text-gray-400 border border-gray-200'
                        }`}
                     >
                        <Icon className="w-5 h-5" />
                     </div>
                     <span className={`text-xs font-bold ${isCurrent ? 'text-[#57c5cf]' : 'text-gray-500'}`}>
                        {step.title}
                     </span>
                  </div>
               );
            })}
         </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[400px] flex flex-col">
         <div className="flex-grow">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
         </div>

         {/* Navigation Buttons */}
         {!importStatus.isComplete && !importStatus.isImporting && (
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
               <Button 
                  variant="ghost" 
                  onClick={() => setCurrentStep(curr => Math.max(1, curr - 1))}
                  disabled={currentStep === 1}
                  className="gap-2 text-gray-500"
               >
                  <ArrowLeft className="w-4 h-4" /> უკან
               </Button>
               
               <div className="flex gap-2">
                  {currentStep < 4 ? (
                     <Button 
                        onClick={() => setCurrentStep(curr => curr + 1)}
                        disabled={
                           (currentStep === 1 && !file) ||
                           (currentStep === 2 && !isMappingValid())
                        }
                        className="bg-[#57c5cf] hover:bg-[#4bc0cb] gap-2 px-8"
                     >
                        შემდეგი <ArrowRight className="w-4 h-4" />
                     </Button>
                  ) : (
                     <Button 
                        onClick={executeImport}
                        className="bg-green-600 hover:bg-green-700 gap-2 px-8 shadow-lg shadow-green-200"
                     >
                        <Play className="w-4 h-4" /> იმპორტის დაწყება
                     </Button>
                  )}
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default AdminImport;