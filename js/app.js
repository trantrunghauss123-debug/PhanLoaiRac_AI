
// ======================================================
// ECOAI - AUTHENTICATION
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {
  const client = window.ecoaiSupabase;

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const message = document.getElementById("formMessage");

  function showMessage(text, success = false) {
    if (!message) return;

    message.textContent = text;
    message.className = success
      ? "form-message success"
      : "form-message";
  }

  if (!client) {
    showMessage("Không kết nối được Supabase. Hãy tải lại trang.");
    return;
  }

  // Hiện / ẩn mật khẩu
  document.querySelectorAll("[data-toggle-password]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const input = document.getElementById(
          button.dataset.togglePassword
        );

        if (!input) return;

        input.type =
          input.type === "password" ? "text" : "password";

        button.textContent =
          input.type === "password" ? "Hiện" : "Ẩn";
      });
    });

  // Nếu đã đăng nhập thì chuyển vào trang chủ
  const { data } = await client.auth.getSession();

  if (data.session && (loginForm || registerForm)) {
    window.location.replace("home.html");
    return;
  }

  // ====================================================
  // LOGIN
  // ====================================================

  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();

      showMessage("");

      const email = loginForm.email.value.trim().toLowerCase();
      const password = loginForm.password.value;

      const button = loginForm.querySelector(
        'button[type="submit"]'
      );

      const oldText = button?.textContent;

      if (button) {
        button.disabled = true;
        button.textContent = "Đang đăng nhập...";
      }

      try {
        const { error } = await client.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        showMessage("Đăng nhập thành công.", true);

        window.location.href = "home.html";

      } catch (error) {
        showMessage(error.message || "Đăng nhập thất bại.");

        if (button) {
          button.disabled = false;
          button.textContent = oldText;
        }
      }
    });
  }

  // ====================================================
  // REGISTER
  // ====================================================

  if (registerForm) {
    registerForm.addEventListener("submit", async event => {
      event.preventDefault();

      showMessage("");

      const name = registerForm.name.value.trim();
      const email = registerForm.email.value.trim().toLowerCase();
      const password = registerForm.password.value;
      const confirmPassword =
        registerForm.confirmPassword.value;

      if (password.length < 6) {
        showMessage("Mật khẩu cần có ít nhất 6 ký tự.");
        return;
      }

      if (password !== confirmPassword) {
        showMessage("Mật khẩu xác nhận không khớp.");
        return;
      }

      const button = registerForm.querySelector(
        'button[type="submit"]'
      );

      const oldText = button?.textContent;

      if (button) {
        button.disabled = true;
        button.textContent = "Đang tạo tài khoản...";
      }

      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name
            },
            emailRedirectTo:
              new URL("home.html", window.location.href).href
          }
        });

        if (error) throw error;

        if (data.session) {
          showMessage("Đăng ký thành công.", true);
          window.location.href = "home.html";
        } else {
          showMessage(
            "Đăng ký thành công. Hãy kiểm tra email nếu Supabase yêu cầu xác minh.",
            true
          );

          if (button) {
            button.disabled = false;
            button.textContent = oldText;
          }
        }

      } catch (error) {
        showMessage(error.message || "Không thể tạo tài khoản.");

        if (button) {
          button.disabled = false;
          button.textContent = oldText;
        }
      }
    });
  }
});
