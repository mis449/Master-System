const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iyvbjmecoihcqfzyhkgq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dmJqbWVjb2loY3Fmenloa2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNDc4NjcsImV4cCI6MjA5MjkyMzg2N30.ikA5BC3m1bpQsMN3hRS61ONnlxU7zAIKhZiZqlxdjWE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Fetching quotations...");
  const { data: quotations, error: qError } = await supabase
    .from('quotation')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (qError) {
    console.error('Error fetching quotations:', qError);
    return;
  }
  
  console.log("Fetched quotations:", quotations.length);
  
  const quotationIds = quotations.map(q => q.id);
  let allItems = [];
  const chunkSize = 150;
  
  for (let i = 0; i < quotationIds.length; i += chunkSize) {
    const chunk = quotationIds.slice(i, i + chunkSize);
    console.log(`Fetching items for chunk ${i / chunkSize + 1}, size: ${chunk.length}`);
    const { data: items, error: iError } = await supabase
      .from('quotation_items')
      .select('*')
      .in('quotation_id', chunk);
      
    if (iError) {
      console.error('Error fetching items:', iError);
    }
    if (items) {
      allItems = allItems.concat(items);
    }
  }
  
  console.log("Fetched total items:", allItems.length);
}

run();
