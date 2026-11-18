
document.addEventListener("DOMContentLoaded", function () {

    // ĐĂNG NHẬP

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {

        if (EcoAI.getCurrentUser()) {
            window.location.href = "home.html";
            return;
        }

        loginForm.addEventListener("submit", function (e) {

            e.preventDefault();

            const email = document.getElementById("email")
                .value.trim().toLowerCase();

            const password = document.getElementById("password")
                .value;

            const users = EcoAI.getUsers();

            const user = users.find(function (item) {
                return item.email === email &&
                       item.password === password;
            });

            const message = document.getElementById("formMessage");

            if (!user) {
                message.textContent =
                    "Email hoặc mật khẩu không chính xác.";
                message.className = "";
                return;
            }

            EcoAI.setCurrentUser({
                name: user.name,
                email: user.email
            });

            message.textContent = "Đăng nhập thành công!";
            message.className = "success";

            setTimeout(function () {
                window.location.href = "home.html";
            }, 500);

        });
    }


    // ĐĂNG KÝ

    const registerForm = document.getElementById("registerForm");

    if (registerForm) {

        if (EcoAI.getCurrentUser()) {
            window.location.href = "home.html";
            return;
        }

        registerForm.addEventListener("submit", function (e) {

            e.preventDefault();

            const name = document.getElementById("name")
                .value.trim();

            const email = document.getElementById("email")
                .value.trim().toLowerCase();

            const password = document.getElementById("password")
                .value;

            const confirmPassword =
                document.getElementById("confirmPassword").value;

            const message = document.getElementById("formMessage");

            if (password.length < 6) {
                message.textContent =
                    "Mật khẩu phải có ít nhất 6 ký tự.";
                return;
            }

            if (password !== confirmPassword) {
                message.textContent =
                    "Mật khẩu xác nhận không trùng khớp.";
                return;
            }

            const users = EcoAI.getUsers();

            const exists = users.some(function (item) {
                return item.email === email;
            });

            if (exists) {
                message.textContent =
                    "Email này đã được đăng ký.";
                return;
            }

            const newUser = {
                name: name,
                email: email,
                password: password
            };

            users.push(newUser);

            EcoAI.saveUsers(users);

            EcoAI.setCurrentUser({
                name: name,
                email: email
            });

            message.textContent =
                "Đăng ký thành công!";

            message.className = "success";

            setTimeout(function () {
                window.location.href = "home.html";
            }, 500);

        });
    }

});
