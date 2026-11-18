
/* =========================================================
   ECOAI - MAIN APPLICATION
   Home + Gemini classification + Supabase history
   Compatible with home.html and classify-waste/index.ts
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    const client = window.ecoaiSupabase;
    const page = document.body.dataset.page;

    if (!client) {
        console.error("EcoAI: Supabase client chưa khởi tạo.");
        return;
    }

    let user = null;

    try {
        user = await EcoAI.getCurrentUser();
    } catch (error) {
        console.error("Không thể kiểm tra đăng nhập:", error);
    }

    const protectedPages = ["home", "history", "about", "guide"];

    if (protectedPages.includes(page) && !user) {
        window.location.replace("login.html");
        return;
    }

    if (!user) return;

    // Đồng bộ tên người dùng
    const userName = document.getElementById("userName");

    if (userName) {
        userName.textContent = user.name || "Người dùng";
    }

    const userEmail = document.getElementById("userEmail");

    if (userEmail) {
        userEmail.textContent = user.email || "";
    }

    // Điều hướng
    document.querySelectorAll("[data-nav]").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.nav === page
        );
    });

    // Đăng xuất
    document.getElementById("logoutButton")
        ?.addEventListener("click", async () => {
            if (confirm("Bạn có chắc muốn đăng xuất?")) {
                await EcoAI.logout();
            }
        });

    // Mobile menu nếu trang có nút này
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


/* =========================================================
   HOME PAGE
========================================================= */

function initHome(user) {
    const $ = id => document.getElementById(id);

    let selectedBlob = null;
    let selectedName = "";
    let selectedPreview = "";
    let cameraStream = null;

    const MAX_IMAGE_SIZE = 7 * 1024 * 1024;

    const ALLOWED_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    /* ---------------- STATUS ---------------- */

    function setStatus(message, isError = false) {
        const element = $("classifyStatus");
        if (!element) return;

        element.textContent = message;
        element.className = isError
            ? "status-message error"
            : "status-message";
    }

    /* ---------------- PREVIEW ---------------- */

    function clearOldPreview() {
        if (selectedPreview.startsWith("blob:")) {
            URL.revokeObjectURL(selectedPreview);
        }
    }

    function showPreview(blob, name, source) {
        clearOldPreview();

        selectedBlob = blob;
        selectedName = name;
        selectedPreview = URL.createObjectURL(blob);

        $("imagePreview").src = selectedPreview;
        $("imageName").textContent = name;

        if ($("imageFileName")) {
            $("imageFileName").textContent = name;
        }

        if ($("imageSource")) {
            $("imageSource").textContent = source;
        }

        $("previewPanel").hidden = false;
        $("resultPanel").hidden = true;

        setStatus("");

        $("previewPanel").scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    /* ---------------- VALIDATE IMAGE ---------------- */

    function validateImage(blob) {
        if (!ALLOWED_TYPES.includes(blob.type)) {
            throw new Error(
                "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP."
            );
        }

        if (blob.size > MAX_IMAGE_SIZE) {
            throw new Error("Ảnh tối đa 7 MB.");
        }
    }

    /* ---------------- UPLOAD IMAGE ---------------- */

    $("imageInput")?.addEventListener("change", event => {
        const file = event.target.files?.[0];

        if (!file) return;

        try {
            validateImage(file);

            showPreview(
                file,
                file.name,
                "Ảnh tải từ thiết bị"
            );

        } catch (error) {
            alert(error.message);
            event.target.value = "";
        }
    });

    /* ---------------- LOAD IMAGE URL ---------------- */

    $("loadUrl")?.addEventListener("click", async () => {
        const url = $("imageUrl")?.value.trim();

        if (!url) {
            alert("Vui lòng nhập đường dẫn ảnh.");
            return;
        }

        try {
            const parsedUrl = new URL(url);

            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                throw new Error("Đường dẫn ảnh không hợp lệ.");
            }

            setStatus("Đang tải ảnh từ đường dẫn...");

            const response = await fetch(parsedUrl.href);

            if (!response.ok) {
                throw new Error("Không thể tải ảnh từ máy chủ.");
            }

            const blob = await response.blob();

            validateImage(blob);

            showPreview(
                blob,
                "Ảnh từ URL",
                "Ảnh tải từ đường dẫn"
            );

        } catch (error) {
            setStatus(
                error.message +
                " Nếu website nguồn chặn CORS, hãy tải ảnh về máy rồi tải lên.",
                true
            );
        }
    });

    /* ---------------- CAMERA ---------------- */

    $("openCamera")?.addEventListener("click", async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("Camera yêu cầu HTTPS hoặc localhost.");
            return;
        }

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" }
                },
                audio: false
            });

            $("cameraVideo").srcObject = cameraStream;
            $("cameraPanel").hidden = false;

            await $("cameraVideo").play();

        } catch (error) {
            console.error("Camera error:", error);
            alert("Không mở được camera. Hãy kiểm tra quyền truy cập.");
        }
    });

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }

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

        if (!video || !video.videoWidth) {
            alert("Camera chưa sẵn sàng.");
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        canvas.toBlob(blob => {
            if (!blob) {
                alert("Không thể chụp ảnh.");
                return;
            }

            showPreview(
                blob,
                "Anh-chup-camera.jpg",
                "Ảnh chụp từ camera"
            );

            stopCamera();

        }, "image/jpeg", 0.9);
    });

    /* ---------------- REMOVE IMAGE ---------------- */

    $("removeImage")?.addEventListener("click", () => {
        clearOldPreview();

        selectedBlob = null;
        selectedName = "";
        selectedPreview = "";

        $("imagePreview").removeAttribute("src");
        $("previewPanel").hidden = true;
        $("resultPanel").hidden = true;

        if ($("imageInput")) {
            $("imageInput").value = "";
        }

        setStatus("");
    });

    /* ---------------- CLASSIFY IMAGE ---------------- */

    $("classifyButton")?.addEventListener("click", async () => {
        if (!selectedBlob) {
            alert("Vui lòng chọn ảnh trước.");
            return;
        }

        const button = $("classifyButton");

        button.disabled = true;
        button.textContent = "AI ĐANG PHÂN TÍCH...";

        setStatus(
            "EcoAI đang gửi hình ảnh đến Gemini Vision..."
        );

        try {
            const imageBase64 = await blobToBase64(selectedBlob);
            const mimeType = selectedBlob.type;

            if (!imageBase64) {
                throw new Error("Không đọc được dữ liệu ảnh.");
            }

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
                let message = error.message ||
                    "Không thể gọi Edge Function.";

                // Đọc nội dung lỗi trả về từ Edge Function
                try {
                    const response = error.context;

                    if (response && typeof response.json === "function") {
                        const errorData = await response.json();

                        message =
                            errorData.error ||
                            errorData.details ||
                            errorData.message ||
                            message;
                    }
                } catch (_) {}

                throw new Error(message);
            }

            console.log("ECOAI RESPONSE:", data);

            if (!data || data.success !== true) {
                throw new Error(
                    data?.error ||
                    data?.details ||
                    "AI không trả về kết quả thành công."
                );
            }

            const classification = data.classification;

            if (
                !classification ||
                !Array.isArray(classification.objects)
            ) {
                throw new Error(
                    "Dữ liệu classification.objects không hợp lệ. " +
                    "Hãy kiểm tra index.ts đã được Deploy phiên bản mới."
                );
            }

            // Hiển thị kết quả
            renderClassification(
                classification,
                selectedPreview
            );

            // Lưu lịch sử
            const saved = await saveHistory(
                user,
                selectedName,
                classification
            );

            const count = classification.objects.length;

            setStatus(
                saved
                    ? `Phân loại hoàn tất! AI nhận diện ${count} nhóm vật thể và đã lưu lịch sử.`
                    : `AI nhận diện ${count} nhóm vật thể thành công, nhưng chưa lưu được lịch sử.`,
                false
            );

            $("resultPanel").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        } catch (error) {
            console.error("ECOAI CLASSIFICATION ERROR:", error);

            setStatus(
                error.message || "Đã xảy ra lỗi khi phân loại ảnh.",
                true
            );

        } finally {
            button.disabled = false;
            button.textContent = "✦ PHÂN LOẠI RÁC";
        }
    });
}


/* =========================================================
   IMAGE TO BASE64
========================================================= */

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = String(reader.result || "");
            const base64 = result.split(",")[1] || "";
            resolve(base64);
        };

        reader.onerror = () => {
            reject(new Error("Không thể đọc hình ảnh."));
        };

        reader.readAsDataURL(blob);
    });
}


/* =========================================================
   RENDER CLASSIFICATION
========================================================= */

function renderClassification(classification, imageSrc) {
    const $ = id => document.getElementById(id);

    const objects = Array.isArray(classification.objects)
        ? classification.objects
        : [];

    $("resultImage").src = imageSrc;

    $("resultType").textContent = "Phân tích hoàn tất";

    $("resultSummary").textContent =
        classification.summary ||
        "AI đã hoàn thành phân tích hình ảnh.";

    $("resultDescription").textContent =
        `EcoAI đã nhận diện ${objects.length} nhóm vật thể trong ảnh.`;

    $("resultCount").textContent =
        `Tổng số nhóm vật thể: ${objects.length}`;

    // Tính độ tin cậy trung bình
    const confidenceValues = objects
        .map(item => Number(item.confidence))
        .filter(value => Number.isFinite(value));

    const averageConfidence = confidenceValues.length
        ? Math.round(
            confidenceValues.reduce((a, b) => a + b, 0) /
            confidenceValues.length
        )
        : 0;

    $("resultConfidence").textContent =
        confidenceValues.length
            ? `${averageConfidence}%`
            : "Chưa xác định";

    const list = $("objectResults");

    if (!objects.length) {
        list.innerHTML =
            '<p class="muted">Chưa phát hiện vật thể rác rõ ràng trong hình ảnh.</p>';

        $("resultAdvice").textContent =
            "Không có đề xuất xử lý vì chưa nhận diện được vật thể.";

        $("resultPanel").hidden = false;
        return;
    }

    // Escape HTML để tránh hiển thị nội dung không an toàn
    const safe = value =>
        EcoAI.escapeHTML(String(value ?? ""));

    list.innerHTML = objects.map((item, index) => {
        const name = safe(
            item.object_name || `Vật thể ${index + 1}`
        );

        const category = safe(
            item.waste_category || "Chưa xác định"
        );

        const material = safe(
            item.material || "Chưa xác định"
        );

        const quantity = Math.max(
            1,
            Number(item.quantity) || 1
        );

        const confidence = Math.max(
            0,
            Math.min(100, Number(item.confidence) || 0)
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

        const hazardous =
            item.hazardous === true
                ? "Có"
                : item.hazardous === false
                    ? "Không"
                    : "Chưa xác định";

        const reason = safe(
            item.reason || "Chưa có mô tả."
        );

        const instructions = safe(
            item.disposal_instructions ||
            "Kiểm tra hướng dẫn thu gom tại địa phương."
        );

        const recyclingNote = safe(
            item.recycling_note || "Chưa có thông tin."
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

                    <div>
                        <small>Rác nguy hại?</small>
                        <b>${hazardous}</b>
                    </div>

                </div>

                <p class="object-reason">
                    ${reason}
                </p>

                <p class="object-reason">
                    <b>Ghi chú tái chế:</b>
                    ${recyclingNote}
                </p>

                <div class="object-advice">
                    <b>♻ Hướng dẫn xử lý</b>
                    <p>${instructions}</p>
                </div>

            </article>
        `;
    }).join("");

    // Tổng hợp đề xuất xử lý
    $("resultAdvice").textContent = objects.map(item => {
        const name = item.object_name || "Vật thể";
        const advice = item.disposal_instructions ||
            "Chưa có hướng dẫn.";

        return `${name}: ${advice}`;
    }).join(" | ");

    $("resultPanel").hidden = false;
}


/* =========================================================
   SAVE HISTORY TO SUPABASE
========================================================= */

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
            objects: objects
        });

    if (error) {
        console.error("SAVE HISTORY ERROR:", error);
        return false;
    }

    return true;
}


/* =========================================================
   HISTORY PAGE
========================================================= */

async function initHistory(user) {
    const list = document.getElementById("historyList");
    const empty = document.getElementById("historyEmpty");

    if (!list || !empty) return;

    list.innerHTML =
        '<p class="muted">Đang tải lịch sử...</p>';

    const { data, error } = await window.ecoaiSupabase
        .from("classification_history")
        .select(
            "id,image_name,object_count,summary,objects,created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
        list.textContent =
            "Không tải được lịch sử: " + error.message;

        empty.hidden = true;
        return;
    }

    const rows = data || [];

    const total = document.getElementById("historyTotal");
    if (total) total.textContent = rows.length;

    const types = document.getElementById("historyTypes");

    if (types) {
        const categories = rows.flatMap(row =>
            (row.objects || [])
                .map(item => item.waste_category)
                .filter(Boolean)
        );

        types.textContent = new Set(categories).size;
    }

    empty.hidden = rows.length > 0;

    const safe = value =>
        EcoAI.escapeHTML(String(value ?? ""));

    list.innerHTML = rows.map(row => {
        const date = new Date(row.created_at);

        const names = (row.objects || [])
            .map(item => safe(item.object_name || "Vật thể"))
            .join(", ");

        return `
            <article class="history-item">

                <div class="history-thumb">♻</div>

                <div>
                    <b>${names || "Không nhận diện được vật thể"}</b>

                    <p>${safe(row.image_name || "Ảnh phân loại")}</p>

                    <p class="history-advice">
                        ${safe(row.summary || "")}
                    </p>

                    <small>
                        ${date.toLocaleDateString("vi-VN")}
                        ·
                        ${date.toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit"
                        })}
                        ·
                        ${Number(row.object_count) || 0} nhóm vật thể
                    </small>
                </div>

                <small>Gemini AI</small>

            </article>
        `;
    }).join("");

    // Xóa lịch sử
    document.getElementById("clearHistory")
        ?.addEventListener("click", async () => {
            if (
                !rows.length ||
                !confirm("Bạn có chắc muốn xóa toàn bộ lịch sử?")
            ) {
                return;
            }

            const { error: deleteError } =
                await window.ecoaiSupabase
                    .from("classification_history")
                    .delete()
                    .eq("user_id", user.id);

            if (deleteError) {
                alert(
                    "Không thể xóa lịch sử: " +
                    deleteError.message
                );
                return;
            }

            window.location.reload();
        });
}
