
// ==========================================
// ECOAI - AUTHENTICATION WITH SUPABASE
// ==========================================

document.addEventListener("DOMContentLoaded", async function () {

    const supabase = window.ecoaiSupabase;

    // Kiểm tra kết nối Supabase
    if (!supabase) {
        console.error("Không tìm thấy kết nối Supabase.");

        const message = document.getElementById("formMessage");

        if (message) {
            message.textContent =
                "Lỗi kết nối hệ thống. Vui lòng tải lại trang.";
        }

        return;
    }

    // Hiển thị thông báo
    function showMessage(message, text, success = false) {
        if (!message) return;

        message.textContent = text;
        message.className = success ? "success" : "";
    }

    // Đồng bộ thông tin người dùng với giao diện EcoAI cũ
    function syncUser(user) {
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

    // Kiểm tra phiên đăng nhập
    const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

    if (sessionError) {
        console.error("Session error:", sessionError);
    }

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (sessionData?.session) {
        syncUser(sessionData.session.user);

        if (loginForm || registerForm) {
            window.location.href = "home.html";
            return;
        }
    }

    // ==========================================
    // LOGIN
    // ==========================================

    if (loginForm) {

        loginForm.addEventListener("submit", async function (e) {

            e.preventDefault();

            const message = document.getElementById("formMessage");

            const email = document.getElementById("email")
                .value.trim().toLowerCase();

            const password = document.getElementById("password")
                .value;

            showMessage(message, "Đang đăng nhập...");

            const { data, error } =
                await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) {
                let errorText = "Đăng nhập thất bại. Vui lòng thử lại.";

                if (error.message.includes("Invalid login credentials")) {
                    errorText = "Email hoặc mật khẩu không chính xác.";
                }

                if (error.message.includes("Email not confirmed")) {
                    errorText = "Bạn chưa xác nhận email. Hãy kiểm tra hộp thư.";
                }

                showMessage(message, errorText);
                console.error(error);
                return;
            }

            syncUser(data.user);

            showMessage(
                message,
                "Đăng nhập thành công!",
                true
            );

            setTimeout(function () {
                window.location.href = "home.html";
            }, 700);

        });
    }

    // ==========================================
    // REGISTER
    // ==========================================

    if (registerForm) {

        registerForm.addEventListener("submit", async function (e) {

            e.preventDefault();

            const message = document.getElementById("formMessage");

            const name = document.getElementById("name")
                .value.trim();

            const email = document.getElementById("email")
                .value.trim().toLowerCase();

            const password = document.getElementById("password")
                .value;

            const confirmPassword =
                document.getElementById("confirmPassword").value;

            if (!name) {
                showMessage(message, "Vui lòng nhập họ tên.");
                return;
            }

            if (password.length < 6) {
                showMessage(
                    message,
                    "Mật khẩu phải có ít nhất 6 ký tự."
                );
                return;
            }

            if (password !== confirmPassword) {
                showMessage(
                    message,
                    "Mật khẩu xác nhận không trùng khớp."
                );
                return;
            }

            showMessage(message, "Đang tạo tài khoản...");

            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: name
                    }
                }
            });

            if (error) {
                showMessage(
                    message,
                    "Đăng ký thất bại: " + error.message
                );

                console.error(error);
                return;
            }

            // Nếu Supabase cho phép đăng nhập ngay
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

                // Khi bật xác nhận email
                showMessage(
                    message,
                    "Đăng ký thành công! Vui lòng kiểm tra email và xác nhận tài khoản trước khi đăng nhập.",
                    true
                );

                registerForm.reset();
            }

        });
    }

});
