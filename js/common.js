
// ======================================================
// ECOAI - COMMON FUNCTIONS
// ======================================================

window.EcoAI = {
  escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  },

  async getCurrentUser() {
    const client = window.ecoaiSupabase;

    if (!client) return null;

    const { data, error } = await client.auth.getUser();

    if (error || !data.user) return null;

    const user = data.user;

    return {
      id: user.id,
      email: user.email,
      name:
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Người dùng"
    };
  },

  async logout() {
    const client = window.ecoaiSupabase;

    if (client) {
      await client.auth.signOut();
    }

    window.location.href = "login.html";
  }
};

