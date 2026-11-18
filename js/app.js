
/* =====================================================
   ECOAI - SMART WASTE CLASSIFICATION
   Main Application - Multi-object Recognition
===================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    const page = document.body.dataset.page;
    const client = window.ecoaiSupabase;

    if (!client) {
        console.error("Supabase chưa được khởi tạo.");
        return;
    }

    // Kiểm tra người dùng đăng nhập
    const user = await EcoAI.getCurrentUser();

    const protectedPages = ["home", "history", "about", "guide"];

    if (protectedPages.includes(page) && !user) {
        window.location.replace("login.html");
        return;
    }

    if (!user) return;

    // Hiển thị thông tin người dùng
    const name = user.name || "Người dùng";

    ["userName", "topbarName"].forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent =
                id === "topbarName"
                    ? `Xin chào, ${name}`
                    : name;
        }
    });

    const email = document.getElementById("userEmail");
    if (email) email.textContent = user.email || "";

    const avatar = document.getElementById("userAvatar");
    if (avatar) avatar.textContent = name.charAt(0).toUpperCase();

    // Đánh dấu menu đang hoạt động
    document.querySelectorAll("[data-nav]").forEach(link => {
        if (link.dataset.nav === page) {
            link.classList.add("active");
        }
    });

    // Đăng xuất
    document.getElementById("logoutButton")
        ?.addEventListener("click", async () => {
            if (confirm("Bạn có chắc muốn đăng xuất?")) {
                await EcoAI.logout();
            }
        });

    // Menu mobile nếu có
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


/* =====================================================
   HOME - IMAGE CLASSIFICATION
===================================================== */

function initHome(user) {
    const $ = id => document.getElementById(id);

    let selectedBlob = null;
    let selectedName = "";
    let selectedPreview = "";
    let cameraStream = null;

    const MAX_IMAGE_SIZE = 7 * 1024 * 1024;

    // Tạo vùng trạng thái nếu HTML chưa có
    function getStatusElement() {
        let element = $("classifyStatus");

        if (!element) {
            element = document.createElement("div");
            element.id = "classifyStatus";
            element.className = "status-message";
            element.setAttribute("role", "status");
            element.setAttribute("aria-live", "polite");

            $("previewPanel")?.after(element);
        }

        return element;
    }

    // Hiển thị trạng thái
    function setStatus(message, isError = false) {
        const element = getStatusElement();

        element.textContent = message;
        element.className = isError
            ? "status-message error"
            : "status-message";
    }

    // Giải phóng URL xem trước cũ
    function releasePreview() {
        if (selectedPreview.startsWith("blob:")) {
            URL.revokeObjectURL(selectedPreview);
        }
    }

    // Hiển thị ảnh xem trước
    function showPreview(blob, name, source, previewUrl) {
        releasePreview();

        selectedBlob = blob;
        selectedName = name;
        selectedPreview = previewUrl;

        if ($("imagePreview")) {
            $("imagePreview").src = previewUrl;
        }

        // Tương thích với cả ID cũ và mới
        const fileName = $("imageFileName") || $("imageName");
        if (fileName) fileName.textContent = name;

        if ($("imageSource")) {
            $("imageSource").textContent = source;
        }

        if ($("previewPanel")) {
            $("previewPanel").hidden = false;
        }

        if ($("resultPanel")) {
            $("resultPanel").hidden = true;
        }

        setStatus("");

        $("previewPanel")?.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }


    /* =================================================
       1. UPLOAD IMAGE
    ================================================= */

    $("imageInput")?.addEventListener("change", event => {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            alert("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.");
            event.target.value = "";
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
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


    /* =================================================
       2. LOAD IMAGE FROM URL
    ================================================= */

    $("loadUrl")?.addEventListener("click", async () => {
        const input = $("imageUrl");
        const url = input?.value.trim();

        if (!url) {
            alert("Vui lòng nhập đường dẫn ảnh.");
            return;
        }

        try {
            const parsedUrl = new URL(url);

            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                throw new Error("Đường dẫn không hợp lệ.");
            }

            setStatus("Đang tải ảnh từ đường dẫn...");

            const response = await fetch(parsedUrl.href, {
                mode: "cors"
            });

            if (!response.ok) {
                throw new Error("Không tải được ảnh từ máy chủ.");
            }

            const blob = await response.blob();

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];

            if (!allowedTypes.includes(blob.type)) {
                throw new Error(
                    "URL không trỏ đến ảnh JPG, PNG hoặc WEBP."
                );
            }

            if (blob.size > MAX_IMAGE_SIZE) {
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
                ". Một số website chặn tải ảnh trực tiếp. " +
                "Hãy tải ảnh về thiết bị rồi tải lên.",
                true
            );
        }
    });


    /* =================================================
       3. CAMERA
    ================================================= */

    $("openCamera")?.addEventListener("click", async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("Camera cần HTTPS hoặc localhost.");
            return;
        }

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: {
                        ideal: "environment"
                    }
                },
                audio: false
            });

            const video = $("cameraVideo");

            if (video) {
                video.srcObject = cameraStream;
                await video.play();
            }

            if ($("cameraPanel")) {
                $("cameraPanel").hidden = false;
            }

        } catch (error) {
            console.error("Camera error:", error);
            alert("Không mở được camera. Hãy kiểm tra quyền camera.");
        }
    });

    function stopCamera() {
        cameraStream?.getTracks().forEach(track => track.stop());

        cameraStream = null;

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

        if (!video || !canvas || !video.videoWidth) {
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
                "Ảnh chụp camera.jpg",
                "Ảnh vừa chụp",
                URL.createObjectURL(blob)
            );
        }, "image/jpeg", 0.9);

        stopCamera();
    });


    /* =================================================
       4. REMOVE IMAGE
    ================================================= */

    $("removeImage")?.addEventListener("click", () => {
        releasePreview();

        selectedBlob = null;
        selectedName = "";
        selectedPreview = "";

        if ($("previewPanel")) {
            $("previewPanel").hidden = true;
        }

        if ($("resultPanel")) {
            $("resultPanel").hidden = true;
        }

        if ($("imageInput")) {
            $("imageInput").value = "";
        }

        setStatus("");
    });


    /* =================================================
       5. CLASSIFY IMAGE WITH GEMINI
    ================================================= */

    $("classifyButton")?.addEventListener("click", async () => {
        if (!selectedBlob) {
            alert("Vui lòng chọn ảnh trước.");
            return;
        }

        const button = $("classifyButton");

        button.disabled = true;
        button.textContent = "AI đang phân tích...";

        setStatus(
            "EcoAI đang phân tích hình ảnh và nhận diện các vật thể..."
        );

        try {
            const mimeType = selectedBlob.type || "image/jpeg";

            const imageBase64 = await blobToBase64(selectedBlob);

            if (!imageBase64) {
                throw new Error("Không thể đọc dữ liệu ảnh.");
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

            if (!Array.isArray(classification.objects)) {
                classification.objects = [];
            }

            // Hiển thị kết quả
            renderClassification(
                classification,
                selectedPreview
            );

            // Lưu lịch sử
            await saveHistory(
                user,
                selectedName,
                classification
            );

            setStatus(
                `Phân tích hoàn tất: nhận diện ` +
                `${classification.objects.length} nhóm vật thể.`
            );

            $("resultPanel")?.scrollIntoView({
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
            button.textContent = "✦ PHÂN LOẠI RÁC";
        }
    });
}


/* =====================================================
   CONVERT IMAGE TO BASE64
===================================================== */

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = String(reader.result || "");
            resolve(result.split(",")[1] || "");
        };

        reader.onerror = () => {
            reject(new Error("Không đọc được tệp ảnh."));
        };

        reader.readAsDataURL(blob);
    });
}


/* =====================================================
   RENDER CLASSIFICATION RESULT
===================================================== */

function renderClassification(result, imageSrc) {
    const $ = id => document.getElementById(id);

    const panel = $("resultPanel");

    if (!panel) return;

    // Hiển thị ảnh
    if ($("resultImage")) {
        $("resultImage").src = imageSrc;
    }

    const objects = Array.isArray(result.objects)
        ? result.objects
        : [];

    // Tương thích HTML cũ
    const summary =
        result.summary ||
        `AI nhận diện ${objects.length} nhóm vật thể.`;

    if ($("resultType")) {
        $("resultType").textContent = summary;
    }

    if ($("resultDescription")) {
        $("resultDescription").textContent =
            `Phát hiện ${objects.length} nhóm vật thể trong hình ảnh.`;
    }

    if ($("resultConfidence")) {
        const values = objects
            .map(item => Number(item.confidence))
            .filter(value => Number.isFinite(value) && value > 0);

        const average = values.length
            ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
            : 0;

        $("resultConfidence").textContent =
            average ? `${average}% (trung bình)` : "Chưa xác định";
    }

    if ($("resultAdvice")) {
        $("resultAdvice").textContent = objects.length
            ? objects.map(item =>
                item.disposal_instructions || ""
              ).filter(Boolean).join(" | ")
            : "Chưa có đề xuất xử lý.";
    }

    // Tương thích với cấu trúc kết quả mới
    if ($("resultSummary")) {
        $("resultSummary").textContent = summary;
    }

    if ($("resultCount")) {
        $("resultCount").textContent =
            `${objects.length} nhóm vật thể`;
    }

    // Tạo khu vực hiển thị nhiều vật thể nếu chưa có
    let list = $("objectResults");

    if (!list) {
        list = document.createElement("div");
        list.id = "objectResults";
        list.className = "object-results";

        panel.appendChild(list);
    }

    if (!objects.length) {
        list.innerHTML =
            '<p class="muted">Không phát hiện vật thể rác rõ ràng trong ảnh.</p>';

        panel.hidden = false;
        return;
    }

    // Tạo thẻ kết quả cho từng vật thể
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
            item.recyclable === true ? "Có" :
            item.recyclable === false ? "Không" :
            "Chưa xác định";

        const compostable =
            item.compostable === true ? "Có" :
            item.compostable === false ? "Không" :
            "Chưa xác định";

        const confidence = Math.max(
            0,
            Math.min(100, Number(item.confidence) || 0)
        );

        const instructions = EcoAI.escapeHTML(
            item.disposal_instructions ||
            "Kiểm tra hướng dẫn thu gom tại địa phương."
        );

        const reason = EcoAI.escapeHTML(
            item.reason || "Chưa có mô tả chi tiết."
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

                <p class="object-reason">${reason}</p>

                <div class="object-advice">
                    <b>♻ Hướng dẫn xử lý</b>
                    <p>${instructions}</p>
                </div>

            </article>
        `;
    }).join("");

    panel.hidden = false;
}


/* =====================================================
   SAVE CLASSIFICATION HISTORY TO SUPABASE
===================================================== */

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
        console.error("Không lưu được lịch sử:", error);

        const status = document.getElementById("classifyStatus");

        if (status) {
            status.textContent =
                "AI đã phân loại thành công nhưng chưa lưu được lịch sử. " +
                "Hãy kiểm tra bảng classification_history và quyền RLS.";
        }
    }
}


/* =====================================================
   HISTORY PAGE
===================================================== */

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
        list.textContent =
            "Không tải được lịch sử: " + error.message;

        empty.hidden = true;
        return;
    }

    const rows = items || [];

    const total = document.getElementById("historyTotal");
    if (total) total.textContent = rows.length;

    const allCategories = rows.flatMap(row =>
        (row.objects || [])
            .map(item => item.waste_category)
            .filter(Boolean)
    );

    const types = document.getElementById("historyTypes");
    if (types) types.textContent = new Set(allCategories).size;

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
                        ${EcoAI.escapeHTML(
                            row.image_name || "Ảnh phân loại"
                        )}
                    </p>

                    <p class="history-advice">
                        ${EcoAI.escapeHTML(
                            row.summary ||
                            `${row.object_count} nhóm vật thể`
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

    // Xóa toàn bộ lịch sử
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
