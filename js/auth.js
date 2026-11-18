
// ==========================================
// ECOAI - SUPABASE AUTHENTICATION
// Đăng ký, đăng nhập và quản lý phiên
// ==========================================

document.addEventListener("DOMContentLoaded", async function () {

    // ==========================================
    // 1. CẤU HÌNH
    // ==========================================

    const supabase = window.ecoaiSupabase;

    const REDIRECT_URL =
        "https://trantrunghauss123-debug.github.io/PhanLoaiRac_AI/login.html";

    const HOME_URL = "home.html";

    const LOGIN_URL = "login.html";


    // ==========================================
    // 2. KIỂM TRA KẾT NỐI
    // ==========================================

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    const message = document.getElementById("formMessage");

    if (!supabase) {

        console.error("EcoAI: Không tìm thấy Supabase client.");

        showMessage(
            message,
            "Không thể kết nối hệ thống. Vui lòng tải lại trang."
        );

        return;
    }


    // ==========================================
    // 3. HIỂN THỊ THÔNG BÁO
    // ==========================================

    function showMessage(element, text, success = false) {

        if (!element) return;

        element.textContent = text;

        element.className = success ? "success" : "";

    }


    // ==========================================
    // 4. KHÓA / MỞ NÚT SUBMIT
    // ==========================================

    function setLoading(form, loading, text) {

        if (!form) return;

        const button = form.querySelector(
            'button[type="submit"]'
        );

        if (!button) return;

        if (loading) {

            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = text;

        } else {

            button.disabled = false;

            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }

        }

    }


    // ==========================================
    // 5. ĐỒNG BỘ THÔNG TIN NGƯỜI DÙNG
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
    // 6. LẤY PHIÊN ĐĂNG NHẬP
    // ==========================================

    try {

        const { data, error } =
            await supabase.auth.getSession();

        if (error) {
            throw error;
        }

        const currentSession = data.session;

        // Nếu đã đăng nhập và đang ở trang login/register
        if (
            currentSession &&
            (loginForm || registerForm)
        ) {

            syncUser(currentSession.user);

            window.location.replace(HOME_URL);

            return;

        }


        // ==========================================
        // 7. XỬ LÝ ĐĂNG NHẬP
        // ==========================================

        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();

                    const email = document
                        .getElementById("email")
                        .value
                        .trim()
                        .toLowerCase();

                    const password = document
                        .getElementById("password")
                        .value;

                    if (!email || !password) {

                        showMessage(
                            message,
                            "Vui lòng nhập email và mật khẩu."
                        );

                        return;
                    }

                    setLoading(
                        loginForm,
                        true,
                        "Đang đăng nhập..."
                    );

                    showMessage(
                        message,
                        "Đang kiểm tra tài khoản..."
                    );

                    try {

                        const { data, error } =
                            await supabase.auth.signInWithPassword({

                                email: email,
                                password: password

                            });

                        if (error) {

                            console.error(
                                "EcoAI Login Error:",
                                error
                            );

                            if (
                                error.message.includes(
                                    "Email not confirmed"
                                )
                            ) {

                                showMessage(
                                    message,
                                    "Bạn chưa xác nhận email. Hãy kiểm tra hộp thư Gmail."
                                );

                            } else if (
                                error.message.includes(
                                    "Invalid login credentials"
                                )
                            ) {

                                showMessage(
                                    message,
                                    "Email hoặc mật khẩu không chính xác."
                                );

                            } else {

                                showMessage(
                                    message,
                                    "Đăng nhập thất bại: " + error.message
                                );

                            }

                            return;
                        }

                        // Lưu thông tin người dùng
                        syncUser(data.user);

                        showMessage(
                            message,
                            "Đăng nhập thành công!",
                            true
                        );

                        // Chuyển đến trang chủ
                        window.location.replace(HOME_URL);

                    } catch (error) {

                        console.error(
                            "EcoAI Login Exception:",
                            error
                        );

                        showMessage(
                            message,
                            "Có lỗi xảy ra. Vui lòng thử lại."
                        );

                    } finally {

                        setLoading(
                            loginForm,
                            false
                        );

                    }

                }
            );

        }


        // ==========================================
        // 8. XỬ LÝ ĐĂNG KÝ
        // ==========================================

        if (registerForm) {

            registerForm.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();

                    const name = document
                        .getElementById("name")
                        .value
                        .trim();

                    const email = document
                        .getElementById("email")
                        .value
                        .trim()
                        .toLowerCase();

                    const password = document
                        .getElementById("password")
                        .value;

                    const confirmPassword = document
                        .getElementById("confirmPassword")
                        .value;


                    // Kiểm tra họ tên
                    if (!name) {

                        showMessage(
                            message,
                            "Vui lòng nhập họ và tên."
                        );

                        return;
                    }


                    // Kiểm tra email
                    if (!email) {

                        showMessage(
                            message,
                            "Vui lòng nhập email."
                        );

                        return;
                    }


                    // Kiểm tra độ dài mật khẩu
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


                    setLoading(
                        registerForm,
                        true,
                        "Đang tạo tài khoản..."
                    );

                    showMessage(
                        message,
                        "Đang kết nối Supabase..."
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

                                    emailRedirectTo: REDIRECT_URL

                                }

                            });


                        // Xử lý lỗi đăng ký
                        if (error) {

                            console.error(
                                "EcoAI Register Error:",
                                error
                            );

                            showMessage(
                                message,
                                "Đăng ký thất bại: " + error.message
                            );

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

                            window.location.replace(HOME_URL);

                        } else {

                            // Trường hợp cần xác nhận email
                            showMessage(
                                message,
                                "Tạo tài khoản thành công! Hãy mở Gmail và nhấn Confirm your email address để kích hoạt tài khoản.",
                                true
                            );

                            registerForm.reset();

                        }

                    } catch (error) {

                        console.error(
                            "EcoAI Register Exception:",
                            error
                        );

                        showMessage(
                            message,
                            "Không thể tạo tài khoản. Vui lòng thử lại."
                        );

                    } finally {

                        setLoading(
                            registerForm,
                            false
                        );

                    }

                }
            );

        }


    } catch (error) {

        console.error(
            "EcoAI Authentication Error:",
            error
        );

        showMessage(
            message,
            "Không thể khởi tạo hệ thống xác thực. Vui lòng tải lại trang."
        );

    }

});
