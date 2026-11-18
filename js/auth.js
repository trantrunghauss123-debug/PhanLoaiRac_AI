
// ==========================================
// ECOAI - SUPABASE AUTHENTICATION
// Đăng ký, đăng nhập và quản lý phiên
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    const supabase = window.ecoaiSupabase;

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const message = document.getElementById("formMessage");

    const HOME_URL = new URL("home.html", window.location.href).href;
    const LOGIN_URL = new URL("login.html", window.location.href).href;

    // ==========================================
    // 1. KIỂM TRA SUPABASE
    // ==========================================

    if (!supabase) {
        console.error("EcoAI: Không tìm thấy Supabase client.");

        showMessage(
            "Không thể kết nối hệ thống. Vui lòng tải lại trang."
        );
        return;
    }

    // ==========================================
    // 2. HIỂN THỊ THÔNG BÁO
    // ==========================================

    function showMessage(text, success = false) {
        if (!message) return;

        message.textContent = text;
        message.className = success ? "success" : "error";
    }

    // ==========================================
    // 3. KHÓA / MỞ NÚT SUBMIT
    // ==========================================

    function setLoading(form, loading, text = "") {
        if (!form) return;

        const button = form.querySelector('button[type="submit"]');
        if (!button) return;

        if (loading) {
            if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent;
            }

            button.disabled = true;
            button.textContent = text || "Đang xử lý...";
        } else {
            button.disabled = false;

            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        }
    }

    // ==========================================
    // 4. ĐỒNG BỘ THÔNG TIN NGƯỜI DÙNG
    // ==========================================

    function syncUser(user) {
        if (!user) return;

        const name =
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Người dùng";

        // Lưu thông tin vào hệ thống EcoAI nếu có hàm hỗ trợ
        if (
            window.EcoAI &&
            typeof window.EcoAI.setCurrentUser === "function"
        ) {
            window.EcoAI.setCurrentUser({
                id: user.id,
                name: name,
                email: user.email
            });
        }

        console.log("EcoAI: Đã đồng bộ người dùng.");
    }

    // ==========================================
    // 5. KIỂM TRA PHIÊN ĐĂNG NHẬP
    // ==========================================

    try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        const session = data.session;

        // Nếu đã đăng nhập, không cần ở trang login/register
        if (session && (loginForm || registerForm)) {
            syncUser(session.user);
            window.location.replace(HOME_URL);
            return;
        }

    } catch (error) {
        console.error("EcoAI Session Error:", error);
        showMessage("Không thể kiểm tra phiên đăng nhập.");
    }

    // ==========================================
    // 6. THEO DÕI TRẠNG THÁI AUTH
    // ==========================================

    supabase.auth.onAuthStateChange((event, session) => {
        console.log("EcoAI Auth Event:", event);

        if (session?.user) {
            syncUser(session.user);
        }
    });

    // ==========================================
    // 7. ĐĂNG NHẬP
    // ==========================================

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const emailInput = document.getElementById("email");
            const passwordInput = document.getElementById("password");

            const email = emailInput?.value.trim().toLowerCase();
            const password = passwordInput?.value;

            if (!email || !password) {
                showMessage("Vui lòng nhập email và mật khẩu.");
                return;
            }

            setLoading(loginForm, true, "Đang đăng nhập...");
            showMessage("Đang kiểm tra tài khoản...");

            try {
                const { data, error } =
                    await supabase.auth.signInWithPassword({
                        email,
                        password
                    });

                if (error) throw error;

                syncUser(data.user);

                showMessage("Đăng nhập thành công!", true);

                window.location.replace(HOME_URL);

            } catch (error) {
                console.error("EcoAI Login Error:", error);

                if (error.message?.includes("Email not confirmed")) {
                    showMessage(
                        "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư."
                    );
                } else if (
                    error.message?.includes("Invalid login credentials")
                ) {
                    showMessage("Email hoặc mật khẩu không chính xác.");
                } else {
                    showMessage(
                        "Đăng nhập thất bại: " + error.message
                    );
                }

            } finally {
                setLoading(loginForm, false);
            }
        });
    }

    // ==========================================
    // 8. ĐĂNG KÝ
    // ==========================================

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name = document.getElementById("name")?.value.trim();
            const email = document.getElementById("email")
                ?.value.trim().toLowerCase();
            const password = document.getElementById("password")?.value;
            const confirmPassword =
                document.getElementById("confirmPassword")?.value;

            // Kiểm tra dữ liệu
            if (!name) {
                showMessage("Vui lòng nhập họ và tên.");
                return;
            }

            if (!email) {
                showMessage("Vui lòng nhập email.");
                return;
            }

            if (!password || password.length < 6) {
                showMessage("Mật khẩu phải có ít nhất 6 ký tự.");
                return;
            }

            if (password !== confirmPassword) {
                showMessage("Mật khẩu xác nhận không trùng khớp.");
                return;
            }

            setLoading(registerForm, true, "Đang tạo tài khoản...");
            showMessage("Đang kết nối Supabase...");

            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name,
                            full_name: name
                        },
                        emailRedirectTo: HOME_URL
                    }
                });

                if (error) throw error;

                // Trường hợp đăng ký thành công và có phiên ngay
                if (data.session && data.user) {
                    syncUser(data.user);

                    showMessage("Đăng ký thành công!", true);

                    window.location.replace(HOME_URL);
                    return;
                }

                // Trường hợp cần xác nhận email
                showMessage(
                    "Tạo tài khoản thành công! Vui lòng kiểm tra email để xác nhận tài khoản.",
                    true
                );

                registerForm.reset();

            } catch (error) {
                console.error("EcoAI Register Error:", error);

                if (error.message?.includes("already registered")) {
                    showMessage("Email này đã được đăng ký.");
                } else if (
                    error.message?.includes("Password should be")
                ) {
                    showMessage("Mật khẩu chưa đáp ứng yêu cầu.");
                } else {
                    showMessage(
                        "Đăng ký thất bại: " + error.message
                    );
                }

            } finally {
                setLoading(registerForm, false);
            }
        });
    }

    // ==========================================
    // 9. HIỂN THỊ / ẨN MẬT KHẨU
    // ==========================================

    document.querySelectorAll("[data-toggle-password]").forEach((button) => {
        button.addEventListener("click", () => {
            const input = button.parentElement.querySelector("input");

            if (!input) return;

            input.type =
                input.type === "password" ? "text" : "password";
        });
    });

    console.log("EcoAI Authentication đã khởi tạo.");
});
