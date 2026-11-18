
// EcoAI - Supabase connection

const SUPABASE_URL =
    "https://tbxapbfsjskjtjjxijzu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_7e7Y-oNF-mUcyRMXfC7odw_HumYj9od";

// Initialize Supabase
if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase SDK chưa được tải.");
} else {
    window.ecoaiSupabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );

    console.log("EcoAI: Supabase client đã khởi tạo.");
}
