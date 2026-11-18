
// ======================================================
// ECOAI - MAIN APPLICATION
// Multi-object waste classification
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;
  const client = window.ecoaiSupabase;

  if (!client) {
    console.error("Supabase chưa được khởi tạo.");
    return;
  }

  const user = await EcoAI.getCurrentUser();

  const protectedPages = [
    "home",
    "history",
    "about",
    "guide"
  ];

  if (protectedPages.includes(page) && !user) {
    window.location.replace("login.html");
    return;
  }

  if (!user) return;

  const name = user.name || "Người dùng";

  ["userName", "topbarName"].forEach(id => {
    const el = document.getElementById(id);

    if (el) {
      el.textContent =
        id === "topbarName"
          ? `Xin chào, ${name}`
          : name;
    }
  });

  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.textContent = user.email || "";

  const avatar = document.getElementById("userAvatar");
  if (avatar) avatar.textContent = name.charAt(0).toUpperCase();

  document.querySelectorAll("[data-nav]").forEach(link => {
    if (link.dataset.nav === page) {
      link.classList.add("active");
    }
  });

  document.getElementById("logoutButton")
    ?.addEventListener("click", () => {
      if (confirm("Bạn có chắc muốn đăng xuất?")) {
        EcoAI.logout();
      }
    });

  document.getElementById("mobileMenu")
    ?.addEventListener("click", () => {
      document.getElementById("sidebar")
        ?.classList.toggle("open");
    });

  if (page === "home") {
    initHome(user);
  }

  if (page === "history") {
    await initHistory(user);
  }
});

// ======================================================
// IMAGE CLASSIFICATION PAGE
// ======================================================

function initHome(user) {
  const $ = id => document.getElementById(id);

  let selectedBlob = null;
  let selectedName = "";
  let selectedPreview = "";
  let stream = null;

  const maxBytes = 7 * 1024 * 1024;

  function setStatus(message, isError = false) {
    const el = $("classifyStatus");

    if (!el) return;

    el.textContent = message;
    el.className = isError
      ? "status-message error"
      : "status-message";
  }

  function showPreview(blob, name, source, previewUrl) {
    selectedBlob = blob;
    selectedName = name;
    selectedPreview = previewUrl;

    $("imagePreview").src = previewUrl;
    $("imageFileName").textContent = name;
    $("imageSource").textContent = source;

    $("previewPanel").hidden = false;
    $("resultPanel").hidden = true;

    setStatus("");
  }

  // ====================================================
  // UPLOAD IMAGE
  // ====================================================

  $("imageInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowed.includes(file.type)) {
      alert("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > maxBytes) {
      alert("Ảnh tối đa 7 MB. Hãy chọn ảnh nhỏ hơn.");
      event.target.value = "";
      return;
    }

    showPreview(
      file,
      file.name,
      "Ảnh tải từ thiết bị",
      URL.createObjectURL(file)
    );
  });

  // ====================================================
  // LOAD IMAGE FROM URL
  // ====================================================

  $("loadUrl")?.addEventListener("click", async () => {
    const url = $("imageUrl").value.trim();

    if (!url) {
      alert("Vui lòng nhập đường dẫn ảnh.");
      return;
    }

    try {
      const parsed = new URL(url);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Đường dẫn không hợp lệ.");
      }

      setStatus("Đang tải ảnh từ đường dẫn...");

      const response = await fetch(parsed.href, {
        mode: "cors"
      });

      if (!response.ok) {
        throw new Error("Không tải được ảnh từ máy chủ.");
      }

      const blob = await response.blob();

      if (
        !["image/jpeg", "image/png", "image/webp"]
          .includes(blob.type)
      ) {
        throw new Error("URL không trỏ đến ảnh JPG, PNG hoặc WEBP.");
      }

      if (blob.size > maxBytes) {
        throw new Error("Ảnh tối đa 7 MB.");
      }

      showPreview(
        blob,
        "Ảnh từ URL",
        "Đã tải ảnh từ đường dẫn",
        URL.createObjectURL(blob)
      );

    } catch (error) {
      setStatus(
        (error.message || "Không thể tải ảnh URL") +
        ". Một số website chặn tải ảnh trực tiếp. Hãy tải ảnh về thiết bị rồi tải lên.",
        true
      );
    }
  });

  // ====================================================
  // CAMERA
  // ====================================================

  $("openCamera")?.addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Camera cần HTTPS hoặc localhost.");
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment"
          }
        },
        audio: false
      });

      $("cameraVideo").srcObject = stream;
      $("cameraPanel").hidden = false;

    } catch (error) {
      alert("Không mở được camera. Hãy cấp quyền camera.");
    }
  });

  function stopCamera() {
    stream?.getTracks().forEach(track => track.stop());

    stream = null;

    if ($("cameraVideo")) {
      $("cameraVideo").srcObject = null;
    }

    if ($("cameraPanel")) {
      $("cameraPanel").hidden = true;
    }
  }

  $("closeCamera")?.addEventListener("click", stopCamera);

  $("capturePhoto")?.addEventListener("click", () => {
    const video = $("cameraVideo");
    const canvas = $("cameraCanvas");

    if (!video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext("2d").drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(blob => {
      if (!blob) return;

      showPreview(
        blob,
        "Ảnh chụp camera",
        "Ảnh vừa chụp",
        URL.createObjectURL(blob)
      );
    }, "image/jpeg", 0.9);

    stopCamera();
  });

  // ====================================================
  // REMOVE IMAGE
  // ====================================================

  $("removeImage")?.addEventListener("click", () => {
    if (selectedPreview.startsWith("blob:")) {
      URL.revokeObjectURL(selectedPreview);
    }

    selectedBlob = null;
    selectedName = "";
    selectedPreview = "";

    $("previewPanel").hidden = true;
    $("resultPanel").hidden = true;
    $("imageInput").value = "";

    setStatus("");
  });

  // ====================================================
  // CLASSIFY IMAGE WITH GEMINI
  // ====================================================

  $("classifyButton")?.addEventListener("click", async () => {
    if (!selectedBlob) {
      alert("Vui lòng chọn ảnh trước.");
      return;
    }

    const button = $("classifyButton");

    button.disabled = true;
    button.textContent = "AI đang phân tích...";

    setStatus(
      "EcoAI đang quét toàn bộ hình ảnh và nhận diện các vật thể..."
    );

    try {
      const mimeType = selectedBlob.type || "image/jpeg";

      const imageBase64 = await blobToBase64(selectedBlob);

      const { data, error } =
        await window.ecoaiSupabase.functions.invoke(
          "classify-waste",
          {
            body: {
              imageBase64,
              mimeType
            }
          }
        );

      if (error) {
        let detail = error.message || "Không gọi được AI.";

        try {
          const context = error.context;

          if (context?.json) {
            const json = await context.json();
            detail = json.error || json.message || detail;
          }
        } catch (_) {}

        throw new Error(detail);
      }

      if (!data?.success || !data?.classification) {
        throw new Error(
          data?.error || "AI không trả về kết quả hợp lệ."
        );
      }

      const classification = data.classification;

      const objects = Array.isArray(classification.objects)
        ? classification.objects
        : [];

      // Display results
      renderClassification(classification, selectedPreview);

      // Save history
      await saveHistory(
        user,
        selectedName,
        classification
      );

      setStatus(
        `Phân tích hoàn tất: nhận diện ${objects.length} nhóm vật thể.`
      );

      $("resultPanel").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (error) {
      console.error("EcoAI classification error:", error);

      setStatus(
        error.message || "Có lỗi khi phân loại ảnh.",
        true
      );

    } finally {
      button.disabled = false;
      button.textContent = "✦ Phân loại rác";
    }
  });
}

// ======================================================
// CONVERT IMAGE TO BASE64
// ======================================================

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.split(",")[1] || "");
    };

    reader.onerror = () => {
      reject(new Error("Không đọc được tệp ảnh."));
    };

    reader.readAsDataURL(blob);
  });
}

// ======================================================
// RENDER MULTI-OBJECT CLASSIFICATION
// ======================================================

function renderClassification(result, imageSrc) {
  const panel = document.getElementById("resultPanel");

  document.getElementById("resultImage").src = imageSrc;

  const objects = Array.isArray(result.objects)
    ? result.objects
    : [];

  document.getElementById("resultSummary").textContent =
    result.summary ||
    `AI nhận diện ${objects.length} nhóm vật thể.`;

  document.getElementById("resultCount").textContent =
    `${objects.length} nhóm vật thể`;

  const list = document.getElementById("objectResults");

  if (!objects.length) {
    list.innerHTML =
      '<p class="muted">Không phát hiện vật thể rác rõ ràng trong ảnh.</p>';

    panel.hidden = false;
    return;
  }

  list.innerHTML = objects.map((item, index) => {
    const name = EcoAI.escapeHTML(
      item.object_name || `Vật thể ${index + 1}`
    );

    const category = EcoAI.escapeHTML(
      item.waste_category || "Chưa xác định"
    );

    const material = EcoAI.escapeHTML(
      item.material || "Chưa xác định"
    );

    const quantity = Math.max(
      1,
      Number(item.quantity) || 1
    );

    const recyclable =
      item.recyclable === true
        ? "Có"
        : item.recyclable === false
          ? "Không"
          : "Chưa xác định";

    const compostable =
      item.compostable === true
        ? "Có"
        : item.compostable === false
          ? "Không"
          : "Chưa xác định";

    const confidence = Math.max(
      0,
      Math.min(100, Number(item.confidence) || 0)
    );

    const instructions = EcoAI.escapeHTML(
      item.disposal_instructions ||
      "Kiểm tra hướng dẫn thu gom tại địa phương."
    );

    const reason = EcoAI.escapeHTML(
      item.reason || ""
    );

    return `
      <article class="object-card">

        <div class="object-card-head">

          <span class="object-number">
            ${index + 1}
          </span>

          <div>
            <h3>${name}</h3>
            <span class="category-chip">
              ${category}
            </span>
          </div>

          <b class="object-confidence">
            ${confidence}%
          </b>

        </div>

        <div class="object-meta">

          <div>
            <small>Số lượng</small>
            <b>${quantity}</b>
          </div>

          <div>
            <small>Chất liệu</small>
            <b>${material}</b>
          </div>

          <div>
            <small>Có thể tái chế?</small>
            <b>${recyclable}</b>
          </div>

          <div>
            <small>Có thể ủ hữu cơ?</small>
            <b>${compostable}</b>
          </div>

        </div>

        <p class="object-reason">
          ${reason}
        </p>

        <div class="object-advice">
          <b>♻ Hướng dẫn xử lý</b>
          <p>${instructions}</p>
        </div>

      </article>
    `;
  }).join("");

  panel.hidden = false;
}

// ======================================================
// SAVE CLASSIFICATION HISTORY
// ======================================================

async function saveHistory(user, imageName, classification) {
  const objects = Array.isArray(classification.objects)
    ? classification.objects
    : [];

  const { error } = await window.ecoaiSupabase
    .from("classification_history")
    .insert({
      user_id: user.id,
      image_name: imageName || "Ảnh phân loại",
      object_count: objects.length,
      summary: classification.summary || "",
      objects
    });

  if (error) {
    console.error("Không lưu được lịch sử:", error);

    const status = document.getElementById("classifyStatus");

    if (status) {
      status.textContent =
        "AI đã phân loại thành công nhưng chưa lưu được lịch sử. Hãy kiểm tra bảng và quyền RLS.";
    }
  }
}

// ======================================================
// HISTORY PAGE
// ======================================================

async function initHistory(user) {
  const list = document.getElementById("historyList");
  const empty = document.getElementById("historyEmpty");

  if (!list || !empty) return;

  list.innerHTML =
    '<p class="muted">Đang tải lịch sử...</p>';

  const { data: items, error } =
    await window.ecoaiSupabase
      .from("classification_history")
      .select(
        "id,image_name,object_count,summary,objects,created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false
      })
      .limit(100);

  if (error) {
    list.innerHTML = `
      <p class="form-message">
        Không tải được lịch sử:
        ${EcoAI.escapeHTML(error.message)}
      </p>
    `;

    empty.hidden = true;
    return;
  }

  const rows = items || [];

  document.getElementById("historyTotal").textContent =
    rows.length;

  const allCategories = rows.flatMap(row =>
    (row.objects || [])
      .map(item => item.waste_category)
      .filter(Boolean)
  );

  document.getElementById("historyTypes").textContent =
    new Set(allCategories).size;

  empty.hidden = rows.length > 0;

  list.innerHTML = rows.map(row => {
    const date = new Date(row.created_at);
    const objects = row.objects || [];

    const names = objects
      .map(item =>
        EcoAI.escapeHTML(item.object_name || "Vật thể")
      )
      .join(", ");

    return `
      <article class="history-item">

        <div class="history-thumb">♻</div>

        <div>

          <b>${names || "Không nhận diện được vật thể"}</b>

          <p>
            ${EcoAI.escapeHTML(row.image_name || "Ảnh phân loại")}
          </p>

          <p class="history-advice">
            ${EcoAI.escapeHTML(
              row.summary || `${row.object_count} nhóm vật thể`
            )}
          </p>

          <small>
            ${date.toLocaleDateString("vi-VN")}
            ·
            ${date.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit"
            })}
            ·
            ${row.object_count} nhóm vật thể
          </small>

        </div>

        <small>Gemini AI</small>

      </article>
    `;
  }).join("");

  // Clear history
  document.getElementById("clearHistory")
    ?.addEventListener("click", async () => {
      if (
        !rows.length ||
        !confirm("Xóa toàn bộ lịch sử phân loại của bạn?")
      ) {
        return;
      }

      const { error } = await window.ecoaiSupabase
        .from("classification_history")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        alert("Không xóa được lịch sử: " + error.message);
        return;
      }

      window.location.reload();
    });
}
