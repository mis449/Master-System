const url = 'https://iyvbjmecoihcqfzyhkgq.supabase.co/rest/v1/invoice?select=id,invoice_no,status';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dmJqbWVjb2loY3Fmenloa2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNDc4NjcsImV4cCI6MjA5MjkyMzg2N30.ikA5BC3m1bpQsMN3hRS61ONnlxU7zAIKhZiZqlxdjWE';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key
  }
}).then(res => res.json()).then(data => {
  console.log(data);
});
