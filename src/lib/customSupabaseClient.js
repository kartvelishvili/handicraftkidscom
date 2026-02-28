import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubfzmfbjifnwoovgikkc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZnptZmJqaWZud29vdmdpa2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNTIyMjYsImV4cCI6MjA4MDkyODIyNn0.K0gfZMkXOAHHiBD5e8kU9cFgAQ3HS5kJydEk-5FK3CU';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
