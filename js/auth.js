
// ==========================================
// ECOAI - AUTHENTICATION WITH SUPABASE
// ==========================================

document.addEventListener("DOMContentLoaded", async function () {

    // Kết nối Supabase
    const supabase = window.ecoaiSupabase;

    const REDIRECT_URL =
        "https://trantrunghauss123-debug.github.io/PhanLoaiRac_AI/login.html";

    // ==========================================
    // KIỂM TRA KẾT NỐI
    // ==========================================

    if (!supabase) {
        console.error("Không tìm thấy kết nối Supabase.");

        const message = document.getElementById("formMessage");

        if (message) {
            message.textContent =
                "Lỗi kết nối hệ thống. Vui lòng tải lại trang.";
        }

        return;
    }

    // ==========================================
    // HIỂN THỊ THÔNG BÁO
    // ==========================================

    function showMessage(element, text, success = false) {

        if (!element) return;

        element.textContent = text;
        element.className = success ? "success" : "";
    }

    // ==========================================
    // ĐỒNG BỘ THÔNG TIN NGƯỜI DÙNG
    // ==========================================

    function syncUser(user) {

        if (!user) return;

        const name =
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Người dùng";

        if (
            typeof EcoAI !== "undefined" &&
            typeof EcoAI.setCurrentUser === "function"
        ) {

            EcoAI.setCurrentUser({
                id: user.id,
                name: name,
                email: user.email
            });

        }
    }

    // ==========================================
    // KIỂM TRA PHIÊN ĐĂNG NHẬP
    // ==========================================

    try {

        const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

        if (sessionError) {
            console.error("Session error:", sessionError);
        }

        const loginForm =
            document.getElementById("loginForm");

        const registerForm =
            document.getElementById("registerForm");

        // Nếu đã đăng nhập thì chuyển về trang chủ
        if (sessionData?.session) {

            syncUser(sessionData.session.user);

            if (loginForm || registerForm) {
                window.location.href = "home.html";
                return;
            }
        }

        // ==========================================
        // ĐĂNG NHẬP
        // ==========================================

        if (loginForm) {

            loginForm.addEventListener("submit", async function (e) {

                e.preventDefault();

                const message =
                    document.getElementById("formMessage");

                const email =
                    document.getElementById("email")
                        .value.trim().toLowerCase();

                const password =
                    document.getElementById("password").value;

                showMessage(message, "Đang đăng nhập...");

                try {

                    const { data, error } =
                        await supabase.auth.signInWithPassword({

                            email: email,
                            password: password

                        });

                    if (error) {

                        let errorText =
                            "Đăng nhập thất bại. Vui lòng thử lại.";

                        if (
                            error.message.includes(
                                "Invalid login credentials"
                            )
                        ) {
                            errorText =
                                "Email hoặc mật khẩu không chính xác.";
                        }

                        if (
                            error.message.includes(
                                "Email not confirmed"
                            )
                        ) {
                            errorText =
                                "Bạn chưa xác nhận email. Hãy kiểm tra hộp thư.";
                        }

                        showMessage(message, errorText);

                        console.error("Login error:", error);

                        return;
                    }

                    // Đồng bộ tài khoản
                    syncUser(data.user);

                    showMessage(
                        message,
                        "Đăng nhập thành công!",
                        true
                    );

                    setTimeout(function () {

                        window.location.href = "home.html";

                    }, 700);

                } catch (error) {

                    console.error("Login error:", error);

                    showMessage(
                        message,
                        "Có lỗi xảy ra khi đăng nhập."
                    );

                }

            });

        }

        // ==========================================
        // ĐĂNG KÝ
        // ==========================================

        if (registerForm) {

            registerForm.addEventListener("submit", async function (e) {

                e.preventDefault();

                const message =
                    document.getElementById("formMessage");

                const name =
                    document.getElementById("name")
                        .value.trim();

                const email =
                    document.getElementById("email")
                        .value.trim().toLowerCase();

                const password =
                    document.getElementById("password").value;

                const confirmPassword =
                    document.getElementById("confirmPassword").value;

                // Kiểm tra họ tên
                if (!name) {

                    showMessage(
                        message,
                        "Vui lòng nhập họ tên."
                    );

                    return;
                }

                // Kiểm tra mật khẩu
                if (password.length < 6) {

                    showMessage(
                        message,
                        "Mật khẩu phải có ít nhất 6 ký tự."
                    );

                    return;
                }

                // Kiểm tra xác nhận mật khẩu
                if (password !== confirmPassword) {

                    showMessage(
                        message,
                        "Mật khẩu xác nhận không trùng khớp."
                    );

                    return;
                }

                showMessage(
                    message,
                    "Đang tạo tài khoản..."
                );

                try {

                    // Tạo tài khoản Supabase
                    const { data, error } =
                        await supabase.auth.signUp({

                            email: email,

                            password: password,

                            options: {

                                data: {
                                    name: name
                                },

                                // Chuyển về trang đăng nhập
                                // sau khi xác nhận email
                                emailRedirectTo: REDIRECT_URL

                            }

                        });

                    // Xử lý lỗi đăng ký
                    if (error) {

                        showMessage(
                            message,
                            "Đăng ký thất bại: " + error.message
                        );

                        console.error("Register error:", error);

                        return;
                    }

                    // Trường hợp Supabase đăng nhập ngay
                    if (data.session && data.user) {

                        syncUser(data.user);

                        showMessage(
                            message,
                            "Đăng ký thành công!",
                            true
                        );

                        setTimeout(function () {

                            window.location.href = "home.html";

                        }, 700);

                    } else {

                        // Trường hợp cần xác nhận email
                        showMessage(
                            message,
                            "Đăng ký thành công! Vui lòng kiểm tra email và nhấn xác nhận tài khoản trước khi đăng nhập.",
                            true
                        );

                        registerForm.reset();

                    }

                } catch (error) {

                    console.error("Register error:", error);

                    showMessage(
                        message,
                        "Không thể tạo tài khoản. Vui lòng thử lại."
                    );

                }

            });

        }

    } catch (error) {

        console.error("Authentication error:", error);

        const message =
            document.getElementById("formMessage");

        showMessage(
            message,
            "Không thể kết nối hệ thống xác thực."
        );

    }

});
