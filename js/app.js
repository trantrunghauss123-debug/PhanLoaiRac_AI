
document.addEventListener("DOMContentLoaded", function () {

    const user = EcoAI.getCurrentUser();

    const protectedPages = [
        "home",
        "history",
        "about",
        "guide"
    ];

    const currentPage = document.body.dataset.page;

    // BẢO VỆ TRANG

    if (protectedPages.includes(currentPage) && !user) {
        window.location.replace("login.html");
        return;
    }

    if (!user) return;

    // HIỂN THỊ TÊN NGƯỜI DÙNG

    const userName = document.getElementById("userName");

    if (userName) {
        userName.textContent = user.name;
    }

    // ĐĂNG XUẤT

    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {

            if (confirm("Bạn có muốn đăng xuất không?")) {
                EcoAI.logout();
            }

        });
    }

    // ĐIỀU HƯỚNG CHỨC NĂNG

    if (currentPage === "home") {
        initHome();
    }

    if (currentPage === "history") {
        initHistory();
    }

});


// ====================================
// TRANG CHỦ
// ====================================

function initHome() {

    let selectedImage = null;
    let cameraStream = null;

    const imageInput =
        document.getElementById("imageInput");

    const previewPanel =
        document.getElementById("previewPanel");

    const imagePreview =
        document.getElementById("imagePreview");

    const imageName =
        document.getElementById("imageName");


    // HIỂN THỊ ẢNH

    function showImage(source, name) {

        selectedImage = source;

        imagePreview.src = source;

        imageName.textContent = name;

        previewPanel.hidden = false;

        document.getElementById("resultPanel").hidden = true;

    }


    // 1. TẢI ẢNH

    imageInput.addEventListener("change", function (e) {

        const file = e.target.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Vui lòng chọn một tệp hình ảnh.");
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            alert("Ảnh demo không được lớn hơn 8 MB.");
            return;
        }

        const reader = new FileReader();

        reader.onload = function () {

            showImage(reader.result, file.name);

        };

        reader.readAsDataURL(file);

    });


    // 2. ẢNH TỪ URL

    document.getElementById("loadUrl")
        .addEventListener("click", function () {

            const url =
                document.getElementById("imageUrl").value.trim();

            if (!url) {
                alert("Vui lòng nhập đường dẫn hình ảnh.");
                return;
            }

            try {
                const parsed = new URL(url);

                if (!["http:", "https:"].includes(parsed.protocol)) {
                    throw new Error();
                }

                showImage(url, "Ảnh từ đường dẫn");

            } catch {
                alert("Đường dẫn hình ảnh không hợp lệ.");
            }

        });


    // 3. CAMERA

    document.getElementById("openCamera")
        .addEventListener("click", async function () {

            try {

                cameraStream =
                    await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: "environment"
                        },
                        audio: false
                    });

                const video =
                    document.getElementById("cameraVideo");

                video.srcObject = cameraStream;

                document.getElementById("cameraPanel").hidden = false;

            } catch (error) {

                alert(
                    "Không thể mở camera. Hãy cấp quyền truy cập camera."
                );

            }

        });


    // ĐÓNG CAMERA

    function stopCamera() {

        if (cameraStream) {

            cameraStream.getTracks().forEach(track => {
                track.stop();
            });

            cameraStream = null;
        }

        document.getElementById("cameraPanel").hidden = true;

    }

    document.getElementById("closeCamera")
        .addEventListener("click", stopCamera);


    // CHỤP ẢNH

    document.getElementById("capturePhoto")
        .addEventListener("click", function () {

            const video =
                document.getElementById("cameraVideo");

            const canvas =
                document.getElementById("cameraCanvas");

            if (!video.videoWidth) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext("2d");

            context.drawImage(video, 0, 0);

            const photo = canvas.toDataURL("image/jpeg", 0.85);

            showImage(photo, "Ảnh chụp camera");

            stopCamera();

        });


    // XÓA ẢNH

    document.getElementById("removeImage")
        .addEventListener("click", function () {

            selectedImage = null;

            imageInput.value = "";

            previewPanel.hidden = true;

            document.getElementById("resultPanel").hidden = true;

        });


    // ====================================
    // 4. PHÂN LOẠI DEMO
    // ====================================

    document.getElementById("classifyButton")
        .addEventListener("click", function () {

            if (!selectedImage) {
                alert("Vui lòng chọn ảnh trước.");
                return;
            }

            /*
             * ĐÂY LÀ KẾT QUẢ MINH HỌA.
             *
             * Sau này thay bằng API:
             * POST /api/classify
             *
             * Backend sẽ gọi Gemini Vision.
             */

            const demoResults = [

                {
                    type: "Plastic – Nhựa",
                    description: "Vật liệu nhựa.",
                    confidence: 94,
                    advice: "Làm sạch, để khô và chuyển đến điểm thu gom tái chế."
                },

                {
                    type: "Paper – Giấy",
                    description: "Vật liệu giấy.",
                    confidence: 91,
                    advice: "Giữ giấy khô, loại bỏ phần dính dầu mỡ và gom riêng."
                },

                {
                    type: "Cardboard – Carton",
                    description: "Vật liệu bìa carton.",
                    confidence: 90,
                    advice: "Làm phẳng thùng carton và chuyển đến điểm thu gom."
                },

                {
                    type: "Glass – Thủy tinh",
                    description: "Vật liệu thủy tinh.",
                    confidence: 89,
                    advice: "Để riêng thủy tinh. Bọc kỹ các mảnh vỡ để tránh gây thương tích."
                },

                {
                    type: "Metal – Kim loại",
                    description: "Vật liệu kim loại.",
                    confidence: 93,
                    advice: "Làm sạch an toàn và phân loại riêng để tái chế."
                },

                {
                    type: "Trash – Rác khác",
                    description: "Nhóm rác khác.",
                    confidence: 82,
                    advice: "Kiểm tra hướng dẫn xử lý rác tại địa phương."
                }

            ];

            // CHỈ DÙNG ĐỂ THỬ GIAO DIỆN
            const result = demoResults[
                Math.floor(Math.random() * demoResults.length)
            ];

            document.getElementById("resultImage").src =
                selectedImage;

            document.getElementById("resultType").textContent =
                result.type;

            document.getElementById("resultDescription").textContent =
                result.description;

            document.getElementById("resultConfidence").textContent =
                result.confidence + "% (minh họa)";

            document.getElementById("resultAdvice").textContent =
                result.advice;

            const panel =
                document.getElementById("resultPanel");

            panel.hidden = false;

            // LƯU LỊCH SỬ

            const history = EcoAI.getHistory();

            const record = {

                id: Date.now(),

                image: selectedImage.startsWith("data:")
                    ? selectedImage
                    : null,

                imageUrl: selectedImage.startsWith("http")
                    ? selectedImage
                    : null,

                type: result.type,

                description: result.description,

                confidence: result.confidence,

                advice: result.advice,

                date: new Date().toISOString(),

                demo: true

            };

            history.unshift(record);

            EcoAI.saveHistory(history);

            panel.scrollIntoView({
                behavior: "smooth"
            });

        });

}


// ====================================
// TRANG LỊCH SỬ
// ====================================

function initHistory() {

    const history = EcoAI.getHistory();

    const list =
        document.getElementById("historyList");

    const empty =
        document.getElementById("historyEmpty");

    // THỐNG KÊ

    document.getElementById("historyTotal")
        .textContent = history.length;

    const types = new Set(
        history.map(item => item.type)
    );

    document.getElementById("historyTypes")
        .textContent = types.size;

    // HIỂN THỊ LỊCH SỬ

    empty.hidden = history.length > 0;

    list.innerHTML = history.map(item => {

        const date = new Date(item.date);

        const image = item.image || item.imageUrl;

        return `

            <div class="history-item">

                ${
                    image
                    ? `<img src="${image}" alt="Ảnh rác">`
                    : `<div class="logo">E</div>`
                }

                <div>

                    <h3>${escapeText(item.type)}</h3>

                    <p>${escapeText(item.description)}</p>

                    <p>${escapeText(item.advice)}</p>

                    <small>
                        ${date.toLocaleDateString("vi-VN")}
                        ·
                        ${date.toLocaleTimeString("vi-VN")}
                    </small>

                </div>

            </div>

        `;

    }).join("");


    // XÓA LỊCH SỬ

    document.getElementById("clearHistory")
        .addEventListener("click", function () {

            if (confirm("Bạn muốn xóa toàn bộ lịch sử?")) {

                EcoAI.saveHistory([]);

                location.reload();

            }

        });

}


// HẠN CHẾ CHÈN HTML TỪ DỮ LIỆU NGƯỜI DÙNG

function escapeText(value) {

    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;

}
