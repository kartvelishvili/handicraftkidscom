import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

// Helper: Simple CSV Parser (handles quotes)
const parseCSV = (text) => {
  const result = [];
  let p = '', row = [''], i = 0, r = 0, s = !0, l;
  for (l of text) {
    if ('"' === l) {
      if (s && l === p) row[i] += l;
      s = !s;
    } else if (',' === l && s) l = row[++i] = '';
    else if ('\n' === l && s) {
      if ('\r' === p) row[i] = row[i].slice(0, -1);
      row = result[++r] = ['']; i = 0;
    } else row[i] += l;
    p = l;
  }
  return result.filter(r => r.length > 1);
};

// Helper: Clean Price
const cleanPrice = (priceStr) => {
  if (!priceStr) return 0;
  return parseFloat(priceStr.toString().replace(/[^\d.]/g, '')) || 0;
};

// Helper: Map Availability
const mapAvailability = (status) => {
  const s = status?.toLowerCase().trim();
  if (s === 'in stock') return 'საწყობშია';
  if (s === 'out of stock') return 'არ არის საწყობში';
  if (s === 'pre-order') return 'წინასწარი შეკვეთა';
  return 'საწყობშია'; // Default
};

const MigrationBlock = ({ title, lang, color, onImport, description }) => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const addLog = (type, message) => {
    setLogs(prev => [{ type, message, time: new Date().toLocaleTimeString() }, ...prev]);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startImport = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    addLog('info', 'Starting import process...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSV(text);
        
        if (rows.length < 2) {
          throw new Error("CSV file is empty or invalid");
        }

        const headers = rows[0].map(h => h.trim().toLowerCase());
        const data = rows.slice(1);
        
        await onImport(data, headers, addLog, setProgress);
        
        addLog('success', 'Import completed successfully!');
        toast({ title: `${title} Import Completed`, className: `bg-${color === '#57c5cf' ? '[#57c5cf]' : '[#f292bc]'} text-white` });
      } catch (error) {
        addLog('error', `Critical Error: ${error.message}`);
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4 border-b pb-4" style={{ borderColor: color }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: color }}>
          {lang}
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg">{title}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div className="border-2 border-dashed rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current.click()}>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 font-bold">{file ? file.name : "Click to upload CSV"}</p>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: color }}></div>
            </div>
            <p className="text-xs text-right font-mono text-gray-500">{Math.round(progress)}%</p>
          </div>
        )}

        <div className="h-48 bg-gray-900 rounded-xl p-4 overflow-y-auto font-mono text-xs space-y-1 custom-scrollbar">
          {logs.length === 0 && <span className="text-gray-600">Waiting for logs...</span>}
          {logs.map((log, i) => (
            <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-300'}`}>
              <span className="opacity-50">[{log.time}]</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      <Button 
        onClick={startImport} 
        disabled={!file || isProcessing}
        className="w-full mt-6 py-6 rounded-xl font-heading text-white shadow-lg disabled:opacity-50 disabled:shadow-none"
        style={{ backgroundColor: color }}
      >
        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-4 h-4 mr-2" /> Start Import</>}
      </Button>
    </div>
  );
};

const AdminProductMigration = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    // Load categories for auto-detection
    const loadCats = async () => {
      const { data } = await supabase.from('categories').select('id, slug');
      if (data) setCategories(data);
    };
    loadCats();
  }, []);

  const detectCategory = (title) => {
    if (!title) return null;
    const lowerTitle = title.toLowerCase();
    
    // Keyword mapping (Basic example, can be expanded)
    const keywords = {
      'საძილე': 'sadzile-tomara',
      'ბუდე': 'gamosayvani-bude',
      'კონვერტი': 'gamosayveni-konverti',
      'წიგნი': 'ganvitarebadi-tsigni',
      'ხალიჩა': 'ganvitarebadi-khalicha',
      'თეთრეული': 'sabavshvo-tetreuli',
      'კაბა': 'kaba',
      'ბალიში': 'ortopediuli-balishi'
    };

    for (const [key, slug] of Object.entries(keywords)) {
      if (lowerTitle.includes(key)) {
        const cat = categories.find(c => c.slug.includes(slug)); // Fuzzy match slug
        if (cat) return cat.id;
      }
    }
    
    // Fallback to existing logic or first category
    const defaultCat = categories.find(c => c.slug === 'other') || categories[0];
    return defaultCat?.id;
  };

  const uploadImageFromUrl = async (url, productId, index) => {
    try {
      if (!url) return null;
      const cleanUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
      
      // Fetch image
      const response = await fetch(cleanUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      
      const ext = cleanUrl.split('.').pop().split('?')[0] || 'jpg';
      const fileName = `${productId}/image_${index}.${ext}`;

      const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, blob, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      console.error(`Failed to upload ${url}:`, error);
      return null;
    }
  };

  const processKAImport = async (rows, headers, addLog, setProgress) => {
    const headerMap = {};
    headers.forEach((h, i) => headerMap[h] = i);

    // Expected headers: id, title, description, price, old_price, availability, image_link, link, brand
    
    let processed = 0;
    
    for (const row of rows) {
      try {
        const externalId = row[headerMap['id']];
        const title = row[headerMap['title']];
        const desc = row[headerMap['description']];
        const price = cleanPrice(row[headerMap['price']]);
        const oldPrice = cleanPrice(row[headerMap['old_price']]);
        const avail = mapAvailability(row[headerMap['availability']]);
        const imgLinks = row[headerMap['image_link']] ? row[headerMap['image_link']].split(',') : [];
        
        if (!externalId || !title) {
          addLog('error', `Skipped row: Missing ID or Title`);
          continue;
        }

        // 1. Detect Category
        const categoryId = detectCategory(title);

        // 2. Determine Product DB ID (use external_id to find existing or create new UUID)
        let productId;
        const { data: existing } = await supabase.from('products').select('id').eq('external_id', externalId).maybeSingle();
        
        if (existing) {
          productId = existing.id;
          addLog('info', `Updating existing product ${externalId}`);
        } else {
          // Create placeholder to get ID
          const { data: newProd, error: createErr } = await supabase.from('products').insert({
             external_id: externalId,
             price: price, // temp
             image_url: 'placeholder', // temp
             category_id: categoryId
          }).select().single();
          
          if (createErr) throw createErr;
          productId = newProd.id;
          addLog('info', `Created new product ${externalId}`);
        }

        // 3. Process Images
        const uploadedImages = [];
        let mainImage = '';
        
        // Only process images if it's a new product or force update (simplified here: always check)
        // In a real huge migration, we might skip this if images already exist
        if (imgLinks.length > 0) {
           addLog('info', `Processing ${imgLinks.length} images for ${externalId}...`);
           for (let i = 0; i < imgLinks.length; i++) {
              const url = await uploadImageFromUrl(imgLinks[i], productId, i + 1);
              if (url) {
                uploadedImages.push(url);
                if (i === 0) mainImage = url;
              }
           }
        }

        // 4. Update Product Record
        const urlSlug = `/products/${externalId}`; // Simple slug strategy based on ID
        const updateData = {
          price,
          old_price: oldPrice,
          availability: avail,
          category_id: categoryId,
          url_slug: urlSlug,
          is_active: true
        };
        
        if (mainImage) {
          updateData.image_url = mainImage;
          updateData.additional_images = uploadedImages;
        }

        await supabase.from('products').update(updateData).eq('id', productId);

        // 5. Create Translation (KA)
        const tags = title.split(' ').slice(0, 5).join(','); // Simple tag gen
        
        const { error: transError } = await supabase.from('product_translations').upsert({
          product_id: productId,
          lang: 'ka',
          title: title,
          description: desc,
          meta_title: title,
          meta_description: desc?.substring(0, 160) || '',
          tags: tags ? tags.split(',') : []
        }, { onConflict: 'product_id,lang' });

        if (transError) throw transError;

        addLog('success', `Processed ${externalId} successfully`);

      } catch (err) {
        addLog('error', `Error row: ${err.message}`);
      }

      processed++;
      setProgress((processed / rows.length) * 100);
    }
  };

  const processTranslationImport = async (rows, headers, addLog, setProgress, lang) => {
    const headerMap = {};
    headers.forEach((h, i) => headerMap[h] = i);
    // Expected headers: id, title, description (others ignored)

    let processed = 0;

    for (const row of rows) {
      const externalId = row[headerMap['id']];
      const title = row[headerMap['title']];
      const desc = row[headerMap['description']];

      if (!externalId) {
        processed++; continue;
      }

      try {
        // Find existing product by external ID
        const { data: product } = await supabase.from('products').select('id').eq('external_id', externalId).maybeSingle();

        if (!product) {
          addLog('error', `Cannot import ${lang.toUpperCase()} row — matching KA product not found for ID: ${externalId}`);
        } else {
           const tags = title ? title.split(' ').slice(0, 5) : [];

           const { error } = await supabase.from('product_translations').upsert({
              product_id: product.id,
              lang: lang,
              title: title || '',
              description: desc || '',
              meta_title: title || '',
              meta_description: desc?.substring(0, 160) || '',
              tags: tags
           }, { onConflict: 'product_id,lang' });

           if (error) throw error;
           addLog('success', `Updated ${lang.toUpperCase()} translation for ${externalId}`);
        }

      } catch (err) {
        addLog('error', `Error ${externalId}: ${err.message}`);
      }

      processed++;
      setProgress((processed / rows.length) * 100);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12">
      <Helmet><title>Admin - Product Migration</title></Helmet>

      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-heading font-bold text-gray-800">Product Migration System</h1>
        <p className="text-gray-500 mt-2 font-body">Bulk import products via CSV. <strong>Use "Georgian (Master)" first</strong> to create the product structure, then enrich with English/Russian.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* KA Import */}
        <MigrationBlock 
          title="Georgian (KA) - Master"
          lang="KA"
          color="#57c5cf"
          description="Creates products, handles images, prices & categories."
          onImport={processKAImport}
        />

        {/* EN Import */}
        <MigrationBlock 
          title="English (EN)"
          lang="EN"
          color="#f292bc"
          description="Enrichment only. Matches by ID and adds translations."
          onImport={(r, h, l, p) => processTranslationImport(r, h, l, p, 'en')}
        />

        {/* RU Import */}
        <MigrationBlock 
          title="Russian (RU)"
          lang="RU"
          color="#f292bc"
          description="Enrichment only. Matches by ID and adds translations."
          onImport={(r, h, l, p) => processTranslationImport(r, h, l, p, 'ru')}
        />
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
        <div className="text-sm text-blue-800 space-y-2">
          <p className="font-bold">Important Notes:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Images:</strong> The system will try to download images from provided URLs and upload them to internal storage. This depends on the source server allowing cross-origin requests (CORS). If images fail, check the logs.</li>
            <li><strong>CSV Headers:</strong> Ensure your CSV files strictly follow the header format: <code>id, title, description, price, old_price, availability, image_link</code>.</li>
            <li><strong>Processing Time:</strong> Image uploading takes time. Do not close the tab until the process reaches 100%.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminProductMigration;