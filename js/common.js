
const EcoAI = {

    getUsers() {
        return JSON.parse(
            localStorage.getItem("ecoai_users") || "[]"
        );
    },

    saveUsers(users) {
        localStorage.setItem(
            "ecoai_users",
            JSON.stringify(users)
        );
    },

    getCurrentUser() {
        return JSON.parse(
            localStorage.getItem("ecoai_session") || "null"
        );
    },

    setCurrentUser(user) {
        localStorage.setItem(
            "ecoai_session",
            JSON.stringify(user)
        );
    },

    logout() {
        localStorage.removeItem("ecoai_session");
        window.location.href = "login.html";
    },

    getHistory() {
        const user = this.getCurrentUser();

        if (!user) return [];

        return JSON.parse(
            localStorage.getItem(
                "ecoai_history_" + user.email
            ) || "[]"
        );
    },

    saveHistory(history) {
        const user = this.getCurrentUser();

        if (!user) return;

        localStorage.setItem(
            "ecoai_history_" + user.email,
            JSON.stringify(history)
        );
    }

};
