import * as showdown from 'showdown';
require('showdown-twitter');

let externalId = null;
let promptType = 1;
let isAutoProcessing = false;
let generatedImagesCount = 0; // Biến đếm số ảnh đã tạo
let insertImagesEnabled = false; // Vô hiệu hóa tính năng chèn ảnh tự động
let currentSelectedText = ''; // Biến lưu trữ văn bản được chọn cho chức năng chỉnh sửa inline

// Định nghĩa hàm thông báo dự phòng nếu toastr không tồn tại
if (typeof toastr === 'undefined') {
    window.toastr = {
        success: function(message) {
            console.log('Success:', message);
            if (typeof Botble !== 'undefined' && Botble.showSuccess) {
                Botble.showSuccess(message);
            } else {
                alert('Thành công: ' + message);
            }
        },
        error: function(message) {
            console.error('Error:', message);
            if (typeof Botble !== 'undefined' && Botble.showError) {
                Botble.showError(message);
            } else {
                alert('Lỗi: ' + message);
            }
        }
    };
}

// Hàm xử lý stream dữ liệu từ AI và hiển thị trong preview
function ajaxAi(button, ask, callback) {
    try {
        // Vô hiệu hóa nút và hiển thị trạng thái đang tải
        $(button).prop('disabled', true).addClass('button-loading');

        // Lấy container preview
        const previewContainer = document.getElementById('vig-ai-preview-container');
        const streamingIndicator = document.querySelector('.vig-ai-streaming-indicator');

        // Xóa nội dung cũ và thêm class streaming
        if (previewContainer) {
            previewContainer.innerHTML = '<p>Đang tải nội dung...</p>';
            previewContainer.classList.add('streaming');
        }

        // Hiển thị indicator
        if (streamingIndicator) {
            streamingIndicator.style.display = 'block';
        }

        // Biến lưu trữ nội dung tích lũy
        let fullContent = '';

        // Kiểm tra nếu đầu vào rỗng
        if (!ask || ask.trim() === '') {
            Botble.showError('Vui lòng nhập nội dung để tạo');
            resetUI();
            if (typeof callback === 'function') {
                callback(null);
            }
            return;
        }

        // Tạo URL và tham số
        const url = new URL(window.VigAiRoute.stream, window.location.origin);
        const params = new URLSearchParams({
            'message': ask,
            'type': promptType,
            'externalId': externalId || ''
        });

        // Biến theo dõi trạng thái
        let receivedFirstData = false;

        // Thiết lập timeout cho kết nối ban đầu
        let connectionTimeout = setTimeout(() => {
            if (!receivedFirstData) {
                Botble.showError('Kết nối đến máy chủ quá lâu, vui lòng thử lại sau');
                resetUI();
                if (typeof callback === 'function') {
                    callback(null);
                }
            }
        }, 15000);

        // Khởi tạo EventSource để stream dữ liệu
        const source = new EventSource(url.toString() + '?' + params.toString());

        // Xử lý khi nhận được message
        source.addEventListener('message', function(event) {
            handleStreamData(event.data);
        });

        // Xử lý sự kiện update
        source.addEventListener('update', function(event) {
            handleStreamData(event.data);
        });

        // Xử lý lỗi
        source.addEventListener('error', function(event) {
            console.error('Lỗi stream:', event);

            if (!receivedFirstData) {
                Botble.showError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
            } else {
                Botble.showError('Kết nối bị ngắt. Nội dung đã nhận có thể không đầy đủ.');
            }

            resetUI();

            // Nếu đã nhận được dữ liệu, hiển thị nội dung hiện có
            if (fullContent.trim() && previewContainer) {
                previewContainer.innerHTML = fullContent;
            }

            // Gọi callback nếu có
            if (typeof callback === 'function') {
                callback(null);
            }
        });

        // Hàm xử lý dữ liệu từ stream
        function handleStreamData(data) {
            // Đánh dấu đã nhận dữ liệu đầu tiên
            if (!receivedFirstData) {
                receivedFirstData = true;
                clearTimeout(connectionTimeout);

                // Xóa thông báo "Đang tải"
                if (previewContainer) {
                    previewContainer.innerHTML = '';
                }
            }

            // Kiểm tra nếu stream kết thúc
            if (data === '[DONE]' || data === '</stream>') {
                finishStreaming();
                return;
            }

            // Xử lý dữ liệu
            processStreamData(data);
        }

        // Xử lý dữ liệu stream
        function processStreamData(data) {
            try {
                // Xử lý JSON nếu có
                if (data.trim().startsWith('{') && data.trim().endsWith('}')) {
                    try {
                        const jsonData = JSON.parse(data);
                        if (jsonData && jsonData.external_id) {
                            externalId = jsonData.external_id;
                            return; // Không cập nhật nội dung
                        }
                        if (jsonData && jsonData.content) {
                            data = jsonData.content;
                        }
                    } catch (e) {
                        // Xử lý như text thường
                    }
                }

                // Cập nhật nội dung tích lũy
                fullContent += data;

                // Cập nhật preview với HTML
                if (previewContainer) {
                    previewContainer.innerHTML = fullContent;

                    // Cuộn xuống dưới nếu đang xem cuối trang
                    if (isScrolledToBottom()) {
                        scrollToBottom();
                    }
                }

                // Cập nhật indicator
                updateStreamingIndicator();
            } catch (error) {
                console.error('Lỗi xử lý dữ liệu stream:', error);
                // Không dừng stream nếu xử lý lỗi
            }
        }

        // Kiểm tra xem có đang ở cuối trang không
        function isScrolledToBottom() {
            const scrollPosition = window.scrollY;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;

            return scrollPosition + windowHeight >= documentHeight - 100;
        }

        // Cuộn xuống cuối trang
        function scrollToBottom() {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'auto'
            });
        }

        // Cập nhật indicator với thông tin tiến trình
        function updateStreamingIndicator() {
            if (streamingIndicator) {
                const dots = (fullContent.length % 4) + 1;
                streamingIndicator.textContent = 'Đang tạo nội dung' + '.'.repeat(dots);
            }
        }

        // Hoàn tất quá trình streaming
        function finishStreaming() {
            resetUI();

            // Hiển thị thông báo thành công
            Botble.showSuccess('Nội dung đã được tạo thành công!');

            // Cập nhật preview với nội dung cuối cùng
            if (previewContainer && fullContent.trim()) {
                previewContainer.innerHTML = fullContent;
            }

            // Gọi callback nếu có, truyền nội dung đầy đủ
            if (typeof callback === 'function') {
                callback(fullContent);
            }

            // Nếu đang trong quá trình tự động, tiếp tục quy trình
            if (isAutoProcessing && promptType === 9) {
                // Nếu vừa hoàn thành tạo description
                completeDescriptionProcess(fullContent);
            }
        }

        // Reset UI khi kết thúc hoặc lỗi
        function resetUI() {
            // Đóng stream
            if (source) {
                source.close();
            }

            // Xóa timeout
            clearTimeout(connectionTimeout);

            // Khôi phục trạng thái nút
            $(button).prop('disabled', false).removeClass('button-loading');

            // Ẩn indicator
            if (streamingIndicator) {
                streamingIndicator.style.display = 'none';
            }

            // Loại bỏ class streaming
            if (previewContainer) {
                previewContainer.classList.remove('streaming');
            }
        }

    } catch (error) {
        console.error('Lỗi khởi tạo:', error);
        $(button).prop('disabled', false).removeClass('button-loading');
        Botble.showError('Không thể khởi tạo kết nối: ' + error.message);

        // Reset UI
        const previewContainer = document.getElementById('vig-ai-preview-container');
        const streamingIndicator = document.querySelector('.vig-ai-streaming-indicator');

        if (previewContainer) {
            previewContainer.classList.remove('streaming');
        }

        if (streamingIndicator) {
            streamingIndicator.style.display = 'none';
        }

        // Gọi callback nếu có
        if (typeof callback === 'function') {
            callback(null);
        }
    }
}

// Hoàn thành quá trình tạo description và chuyển sang tạo nội dung
function completeDescriptionProcess(descriptionContent) {
    // Thêm description vào input
    const descriptionInput = document.getElementById('description');
    if (descriptionInput && descriptionContent) {
        // Làm sạch văn bản description
        let cleanDesc = descriptionContent.replace(/<[^>]*>/g, '').trim();
        cleanDesc = cleanDesc.replace(/\s+/g, ' ');
        if (cleanDesc.length > 400) {
            cleanDesc = cleanDesc.substring(0, 400) + '...';
        }

        // Cập nhật trường description
        descriptionInput.value = cleanDesc;

        // Thông báo
        Botble.showSuccess('Đã tự động thêm description');

        // Tiếp tục tạo nội dung chính
        promptType = 1; // Chuyển sang loại nội dung blog

        // Lấy nội dung từ input
        let ask = $('#completion-ask').val();

        // Tạo nội dung chính
        ajaxAi($('.btn-vig-ai-completion'), ask, function(content) {
            if (content) {
                // Tự động import nội dung vào editor mà không cần thêm ảnh
                autoImportToEditor(content);

                // Hoàn thành quá trình và reset trạng thái
                isAutoProcessing = false;
            }
        });
    }
}

// Hàm tạo và chèn ảnh vào nội dung
function generateAndInsertImages(content, topic, imageCount, callback) {
    // Reset biến đếm ảnh
    generatedImagesCount = 0;

    // Tạo một bản sao của nội dung để xử lý
    let enhancedContent = content;

    // Phát hiện các đoạn (paragraph) trong nội dung
    const paragraphs = content.match(/<p[^>]*>.*?<\/p>/gs);

    if (!paragraphs || paragraphs.length < 3) {
        // Nếu không có đủ đoạn, trả về nội dung gốc
        callback(content);
        return;
    }

    // Tìm các vị trí tốt để chèn ảnh
    let insertPoints = [];

    if (imageCount === 1) {
        // Nếu chỉ cần 1 ảnh, chèn sau đoạn thứ 2
        const insertPoint = Math.min(2, paragraphs.length - 1);
        insertPoints.push(insertPoint);
    } else {
        // Nếu cần 2 ảnh, chèn sau đoạn thứ 2 và đoạn thứ 5-6
        insertPoints.push(Math.min(2, paragraphs.length - 1));

        // Vị trí thứ hai nên ở khoảng 2/3 bài viết
        const secondPoint = Math.min(Math.floor(paragraphs.length * 0.6), paragraphs.length - 1);
        if (secondPoint > insertPoints[0] + 2) { // Đảm bảo khoảng cách giữa các ảnh
            insertPoints.push(secondPoint);
        }
    }

    // Thông báo số lượng ảnh sẽ tạo
    if (imageCount > 0) {
        Botble.showSuccess(`Đang tự động tạo ${imageCount} ảnh minh họa...`);
    }

    // Tạo một hàm đệ quy để xử lý các ảnh lần lượt
    function processNextImage(index) {
        // Nếu đã xử lý hết, gọi callback
        if (index >= insertPoints.length) {
            callback(enhancedContent);
            return;
        }

        // Tạo một prompt mô tả về chủ đề của bài viết
        const imagePrompt = createImagePrompt(topic, paragraphs, insertPoints[index]);

        // Hiển thị thông báo
        Botble.showSuccess(`Đang tạo ảnh ${index + 1}/${imageCount}...`);

        // Gọi API để tạo ảnh, sử dụng kích thước được hỗ trợ bởi OpenAI
        $.ajax({
            type: 'POST',
            url: route('vig-ai.generateImage'),
            data: {
                '_token': window.VigAiRoute.csrf,
                'prompt': imagePrompt,
                'width': 1024,
                'height': 1024 // Sử dụng kích thước vuông 1024x1024 hợp lệ
            },
            success: function(res) {
                if (res.error) {
                    Botble.showError(res.message);
                    processNextImage(index + 1);
                } else {
                    try {
                        // Xác định vị trí chèn
                        let insertPosition = 0;
                        for (let i = 0; i <= insertPoints[index]; i++) {
                            if (i === 0) {
                                insertPosition = 0;
                            } else {
                                const foundPos = enhancedContent.indexOf(paragraphs[i], insertPosition);
                                if (foundPos > -1) {
                                    insertPosition = foundPos + paragraphs[i].length;
                                }
                            }
                        }

                        // Tạo thẻ hình ảnh với caption
                        const imageTag = `
<figure class="image image-style-align-center">
    <img src="${res.data.url}" alt="${topic}" class="vig-ai-generated-image">
    <figcaption>Hình ảnh minh họa cho "${topic}"</figcaption>
</figure>`;

                        // Chèn hình ảnh vào nội dung
                        enhancedContent = enhancedContent.substring(0, insertPosition) + imageTag + enhancedContent.substring(insertPosition);

                        // Tăng biến đếm ảnh
                        generatedImagesCount++;

                        // Thông báo thành công
                        Botble.showSuccess(`Đã tạo ảnh ${index + 1}/${imageCount}`);
                    } catch (err) {
                        console.error('Lỗi khi chèn ảnh:', err);
                        Botble.showError('Không thể chèn ảnh vào nội dung. Lỗi: ' + err.message);
                    }

                    // Xử lý ảnh tiếp theo
                    processNextImage(index + 1);
                }
            },
            error: function(res) {
                console.error('Lỗi API tạo ảnh:', res);
                Botble.showError('Không thể tạo ảnh. Vui lòng thử lại sau.');
                // Nếu lỗi vẫn tiếp tục với ảnh tiếp theo
                processNextImage(index + 1);
            }
        });
    }

    // Bắt đầu xử lý ảnh đầu tiên
    processNextImage(0);
}

// Hàm tạo prompt mô tả cho ảnh
function createImagePrompt(topic, paragraphs, paragraphIndex) {
    // Lấy nội dung của đoạn văn để tìm chủ đề cụ thể hơn
    let paragraphContent = '';

    // Lấy nội dung của đoạn văn tại vị trí chèn và đoạn tiếp theo nếu có
    if (paragraphs && paragraphs[paragraphIndex]) {
        paragraphContent = paragraphs[paragraphIndex].replace(/<[^>]*>/g, '').trim();

        if (paragraphs[paragraphIndex + 1]) {
            const nextParagraphContent = paragraphs[paragraphIndex + 1].replace(/<[^>]*>/g, '').trim();
            paragraphContent += ' ' + nextParagraphContent;
        }
    }

    // Tìm các từ khóa quan trọng trong nội dung
    const keywords = extractKeywords(topic, paragraphContent);

    // Tạo prompt dựa trên chủ đề, nội dung đoạn văn và từ khóa
    let prompt = `Tạo một hình ảnh minh họa chất lượng cao, chuyên nghiệp, sắc nét cho chủ đề: "${topic}"`;

    if (keywords.length > 0) {
        prompt += `. Bao gồm các yếu tố: ${keywords.join(', ')}`;
    }

    if (paragraphContent && paragraphContent.length > 20) {
        // Nếu có nội dung đoạn văn đủ dài, thêm vào prompt
        const maxLength = 250; // Giới hạn độ dài để tránh prompt quá dài
        const shortenedContent = paragraphContent.length > maxLength ?
            paragraphContent.substring(0, maxLength) + '...' :
            paragraphContent;

        prompt += `. Dựa vào nội dung: "${shortenedContent}"`;
    }

    prompt += '. Hình ảnh phải chuyên nghiệp, có độ phân giải cao, rõ nét, không có chữ hoặc logo, không có con người thật, phong cách đẹp và nghệ thuật.';

    return prompt;
}

// Hàm trích xuất từ khóa quan trọng từ nội dung
function extractKeywords(topic, content) {
    // Kết hợp chủ đề và nội dung
    const combinedText = (topic + ' ' + content).toLowerCase();

    // Loại bỏ các stop words phổ biến (có thể mở rộng danh sách này)
    const stopWords = ['và', 'hoặc', 'nhưng', 'vì', 'nên', 'là', 'của', 'với', 'trong', 'ngoài', 'trên', 'dưới', 'có', 'không', 'được', 'để', 'này', 'khi', 'bởi', 'bởi vì', 'cho', 'từ', 'đến', 'a', 'an', 'the', 'and', 'or', 'but', 'because', 'as', 'of', 'with', 'in', 'out', 'on', 'under', 'have', 'has', 'been', 'is', 'are', 'was', 'were'];

    // Tách từ và loại bỏ stop words
    const words = combinedText.split(/\s+/);
    const filteredWords = words.filter(word =>
        word.length > 3 && !stopWords.includes(word)
    );

    // Đếm tần suất xuất hiện của từng từ
    const wordFrequency = {};
    filteredWords.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    // Sắp xếp từ theo tần suất xuất hiện
    const sortedWords = Object.keys(wordFrequency).sort((a, b) =>
        wordFrequency[b] - wordFrequency[a]
    );

    // Trả về tối đa 5 từ khóa quan trọng nhất
    return sortedWords.slice(0, 5);
}

// Tự động import nội dung vào editor và kích hoạt chức năng chỉnh sửa
function autoImportToEditor(content) {
    if (!content) return;

    try {
        // Import vào CKEditor nếu có
        if (window.EDITOR && window.EDITOR.CKEDITOR && Object.keys(window.EDITOR.CKEDITOR).length !== 0) {
            const editorInstance = window.EDITOR.CKEDITOR['content'];
            if (editorInstance && typeof editorInstance.setData === 'function') {
                editorInstance.setData(content);
                Botble.showSuccess('Đã tự động thêm nội dung vào editor');
            } else {
                console.error('Không tìm thấy instance CKEditor hợp lệ', window.EDITOR.CKEDITOR);
            }
        }

        // Import vào TinyMCE nếu có
        if (typeof window.tinyMCE !== 'undefined' && window.tinyMCE.activeEditor) {
            window.tinyMCE.activeEditor.setContent(content);
            Botble.showSuccess('Đã tự động thêm nội dung vào editor');
        }

        // Điền nội dung vào trường name
        const nameInput = document.getElementById('name');
        if (nameInput) {
            // Lấy tiêu đề từ nội dung (giả định rằng tiêu đề là đoạn văn bản đầu tiên hoặc thẻ h1/h2 đầu tiên)
            let title = '';

            // Thử tìm thẻ h1 đầu tiên
            const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
            if (h1Match && h1Match[1]) {
                title = h1Match[1].replace(/<[^>]*>/g, '').trim(); // Loại bỏ các thẻ HTML bên trong
            } else {
                // Thử tìm thẻ h2 đầu tiên nếu không có h1
                const h2Match = content.match(/<h2[^>]*>(.*?)<\/h2>/i);
                if (h2Match && h2Match[1]) {
                    title = h2Match[1].replace(/<[^>]*>/g, '').trim();
                } else {
                    // Lấy đoạn văn bản đầu tiên nếu không có h1/h2
                    const pMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
                    if (pMatch && pMatch[1]) {
                        title = pMatch[1].replace(/<[^>]*>/g, '').trim();
                    } else {
                        // Nếu không tìm thấy các thẻ, lấy từ nội dung gốc
                        // Lấy 100 ký tự đầu tiên và làm sạch
                        title = content.replace(/<[^>]*>/g, ' ')
                                    .replace(/\s+/g, ' ')
                                    .trim()
                                    .substring(0, 100);

                        // Nếu title dài hơn 100 ký tự, cắt bớt và thêm dấu ...
                        if (title.length === 100) {
                            // Tìm vị trí khoảng trắng cuối cùng trong chuỗi cắt
                            const lastSpace = title.lastIndexOf(' ');
                            if (lastSpace > 80) { // Chỉ cắt nếu khoảng trắng đủ xa
                                title = title.substring(0, lastSpace) + '...';
                            } else {
                                title = title + '...';
                            }
                        }
                    }
                }
            }

            // Đặt giá trị cho trường name
            if (title) {
                nameInput.value = title;
                // Kích hoạt sự kiện change để các script khác có thể phản ứng
                const event = new Event('change', { bubbles: true });
                nameInput.dispatchEvent(event);

                // Hiển thị thông báo
                Botble.showSuccess('Đã tự động điền tiêu đề');
            }
        }
    } catch (error) {
        console.error('Lỗi khi import vào editor:', error);
        Botble.showError('Không thể thêm nội dung vào editor. Lỗi: ' + error.message);
    }
}

// Hàm xử lý chỉnh sửa đoạn văn bản được chọn trong preview
function setupInlineEditing() {
    const previewContainer = document.getElementById('vig-ai-preview-container');
    if (!previewContainer) return;

    // Biến lưu trữ thông tin về selection hiện tại
    let currentSelection = {
        range: null,
        text: '',
        parentElement: null
    };

    // Tạo nút chỉnh sửa nổi nếu chưa có
    if (!document.getElementById('floating-edit-button')) {
        const editButton = document.createElement('button');
        editButton.id = 'floating-edit-button';
        editButton.innerHTML = '<i class="fa fa-edit"></i>';
        editButton.title = 'Chỉnh sửa văn bản';
        editButton.style.display = 'none';
        document.body.appendChild(editButton);

        // Thêm CSS cho biểu tượng bút
        const style = document.createElement('style');
        style.textContent = `
            #floating-edit-button {
                position: absolute;
                display: none;
                padding: 2px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                cursor: pointer;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 100000;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
            }
            #floating-edit-button:hover {
                transform: scale(1.1);
                background-color: #388E3C;
            }
            .highlight-selection {
                background-color: #ffeb3b;
                transition: background-color 0.3s;
            }
            .vig-ai-prompt-modal {
                display: none;
                position: fixed;
                z-index: 100001;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.5);
                animation: fadeIn 0.2s ease;
            }
            .vig-ai-prompt-content {
                background-color: #fefefe;
                margin: 10% auto;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                max-width: 500px;
                width: 90%;
                position: relative;
                z-index: 100002;
            }
            .vig-ai-prompt-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            .vig-ai-prompt-close {
                color: #aaa;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
            }
            .vig-ai-prompt-close:hover {
                color: #555;
            }
            .vig-ai-prompt-textarea {
                width: 100%;
                min-height: 100px;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 15px;
                resize: vertical;
                background-color: #ffffff !important;
                color: #333333 !important;
                cursor: text !important;
            }
            .vig-ai-prompt-modal * {
                pointer-events: auto !important;
            }
            .vig-ai-prompt-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        // Xử lý sự kiện khi nhấp vào nút chỉnh sửa
        editButton.addEventListener('click', function() {
            if (!currentSelection.range) return;

            // Hiển thị modal nhập prompt
            showPromptModal(currentSelection.text);
        });

        // Thêm sự kiện để ẩn nút khi click ra ngoài
        document.addEventListener('click', function(e) {
            // Chỉ ẩn nút nếu click không phải vào nút hoặc vào vùng được highlight
            if (!e.target.closest('#floating-edit-button') &&
                !e.target.closest('#current-highlight') &&
                !e.target.closest('.vig-ai-prompt-modal')) {
                editButton.style.display = 'none';
                removeHighlight();
            }
        });
    }

    // Tạo modal nhập prompt
    if (!document.getElementById('vig-ai-prompt-modal')) {
        const modal = document.createElement('div');
        modal.id = 'vig-ai-prompt-modal';
        modal.className = 'vig-ai-prompt-modal';
        modal.innerHTML = `
            <div class="vig-ai-prompt-content">
                <div class="vig-ai-prompt-header">
                    <h5>Yêu cầu chỉnh sửa đoạn văn bản</h5>
                    <span class="vig-ai-prompt-close">&times;</span>
                </div>
                <div>
                    <p>Văn bản được chọn:</p>
                    <div id="selected-text-preview" style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 10px; max-height: 100px; overflow-y: auto;"></div>
                    <p>Nhập yêu cầu chỉnh sửa:</p>
                    <textarea class="vig-ai-prompt-textarea" placeholder="Ví dụ: Viết lại với giọng điệu trang trọng hơn, Rút gọn đoạn văn này, Thêm thông tin về..."></textarea>
                </div>
                <div class="vig-ai-prompt-footer">
                    <button type="button" class="btn btn-secondary cancel-prompt">Hủy</button>
                    <button type="button" class="btn btn-primary submit-prompt">Chỉnh sửa</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Thêm CSS để đảm bảo textarea có thể nhập liệu
        const additionalStyle = document.createElement('style');
        additionalStyle.textContent = `
            .vig-ai-prompt-modal textarea {
                pointer-events: auto !important;
                opacity: 1 !important;
                user-select: auto !important;
                -webkit-user-select: auto !important;
                -moz-user-select: auto !important;
                -ms-user-select: auto !important;
            }
            .vig-ai-prompt-modal {
                pointer-events: auto !important;
            }
            .vig-ai-prompt-content {
                pointer-events: auto !important;
            }
        `;
        document.head.appendChild(additionalStyle);

        // Xử lý đóng modal
        const closeModal = () => {
            modal.style.display = 'none';
            removeHighlight();
        };

        // Xử lý các sự kiện trong modal
        modal.querySelector('.vig-ai-prompt-close').addEventListener('click', closeModal);
        modal.querySelector('.cancel-prompt').addEventListener('click', closeModal);

        // Ngăn sự kiện click trong modal lan truyền ra ngoài
        modal.querySelector('.vig-ai-prompt-content').addEventListener('click', function(e) {
            e.stopPropagation();
        });

        // Khi nút gửi prompt được nhấp
        modal.querySelector('.submit-prompt').addEventListener('click', function() {
            const promptText = modal.querySelector('.vig-ai-prompt-textarea').value.trim();
            if (!promptText) {
                Botble.showError('Vui lòng nhập yêu cầu chỉnh sửa');
                return;
            }

            // Hiển thị trạng thái đang xử lý
            this.disabled = true;
            this.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang xử lý...';

            // Gọi API để sinh nội dung mới
            processAIEdit(currentSelection, promptText, () => {
                // Đóng modal sau khi hoàn thành
                closeModal();
                this.disabled = false;
                this.textContent = 'Chỉnh sửa';
            });
        });

        // Đóng modal khi click bên ngoài
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Thêm sự kiện mouseup để phát hiện khi người dùng bôi đen văn bản
    previewContainer.addEventListener('mouseup', function(e) {
        // Đợi một chút để đảm bảo window.getSelection() đã cập nhật
        setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            // Ẩn nút chỉnh sửa nếu không có văn bản nào được chọn
            const editButton = document.getElementById('floating-edit-button');
            if (selectedText === '') {
                if (editButton) {
                    editButton.style.display = 'none';
                }
                removeHighlight(); // Xóa highlight khi không còn chọn văn bản
                return;
            }

            // Chỉ xử lý khi có văn bản được chọn và không phải trong modal
            if (selectedText !== '' &&
                !e.target.closest('.vig-ai-prompt-modal') &&
                !e.target.closest('#floating-edit-button')) {

                try {
                    // Xóa highlight cũ trước khi tạo mới
                    removeHighlight();

                    // Lưu thông tin selection
                    currentSelection.text = selectedText;
                    currentSelection.range = selection.getRangeAt(0).cloneRange();
                    currentSelection.parentElement = selection.anchorNode.parentElement;

                    // Tạo highlight cho phần được chọn
                    highlightSelection(selection);

                    // Hiển thị nút chỉnh sửa gần vị trí selection
                    const rect = selection.getRangeAt(0).getBoundingClientRect();

                    if (rect.width > 0 && rect.height > 0) {
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

                        // Vị trí cho nút chỉnh sửa, đặt ở cuối selection
                        editButton.style.display = 'flex';
                        editButton.style.top = (rect.bottom + scrollTop + 5) + 'px';
                        editButton.style.left = (rect.right - 15) + 'px';
                    }
                } catch (error) {
                    console.error('Lỗi khi xử lý selection:', error);
                }
            }
        }, 10); // Đợi 10ms để đảm bảo selection đã được cập nhật
    });

    // Hiển thị modal nhập prompt
    function showPromptModal(defaultText = '') {
        // Tạo lại modal mỗi lần để đảm bảo không có vấn đề về sự kiện
        const existingModal = document.getElementById('vig-ai-prompt-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Tạo mới modal
        const modal = document.createElement('div');
        modal.id = 'vig-ai-prompt-modal';
        modal.className = 'vig-ai-prompt-modal';

        const content = document.createElement('div');
        content.className = 'vig-ai-prompt-content';

        const header = document.createElement('div');
        header.className = 'vig-ai-prompt-header';

        const title = document.createElement('h4');
        title.textContent = 'Nhập yêu cầu của bạn';

        const closeButton = document.createElement('span');
        closeButton.className = 'vig-ai-prompt-close';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = function() {
            modal.style.display = 'none';
        };

        header.appendChild(title);
        header.appendChild(closeButton);

        const textarea = document.createElement('textarea');
        textarea.className = 'vig-ai-prompt-textarea';
        textarea.id = 'vig-ai-prompt-input';
        textarea.placeholder = 'Nhập yêu cầu của bạn để chỉnh sửa nội dung...';
        textarea.value = defaultText;
        textarea.style.pointerEvents = 'auto';
        textarea.style.userSelect = 'text';
        textarea.disabled = false;

        const footer = document.createElement('div');
        footer.className = 'vig-ai-prompt-footer';

        const submitButton = document.createElement('button');
        submitButton.className = 'btn btn-primary';
        submitButton.textContent = 'Gửi yêu cầu';
        submitButton.onclick = function() {
            const promptText = textarea.value.trim();
            if (promptText) {
                doAiAction(promptText);
                modal.style.display = 'none';
            } else {
                alert('Vui lòng nhập yêu cầu của bạn!');
            }
        };

        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn btn-secondary';
        cancelButton.textContent = 'Hủy';
        cancelButton.onclick = function() {
            modal.style.display = 'none';
        };

        footer.appendChild(cancelButton);
        footer.appendChild(submitButton);

        content.appendChild(header);
        content.appendChild(textarea);
        content.appendChild(footer);
        modal.appendChild(content);

        // Ngăn sự kiện click lan ra ngoài modal
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Thêm modal vào document body
        document.body.appendChild(modal);

        // Hiển thị modal
        modal.style.display = 'block';

        // Tập trung vào textarea sau khi modal hiển thị
        setTimeout(function() {
            try {
                textarea.focus();
                // Kiểm tra khả năng nhập liệu
                const testInput = ' ';
                const originalValue = textarea.value;
                textarea.value += testInput;
                textarea.value = originalValue;

                // Thêm sự kiện click riêng cho textarea
                textarea.addEventListener('click', function(e) {
                    e.stopPropagation();
                    this.focus();
                });
            } catch (e) {
                console.error('Error focusing on textarea:', e);
            }
        }, 100);

        return modal;
    }

    // Gọi API để xử lý yêu cầu chỉnh sửa bằng AI
    function processAIEdit(selection, prompt, callback) {
        if (!selection.range) {
            callback && callback();
            return;
        }

        // Tạo prompt đầy đủ cho AI
        const fullPrompt = `Chỉnh sửa đoạn văn bản sau theo yêu cầu.
Văn bản gốc: "${selection.text}"
Yêu cầu: ${prompt}

Trả về chỉ văn bản đã chỉnh sửa, không bao gồm giải thích hoặc bất kỳ phần nào khác.`;

        // Gọi API để sinh nội dung mới
        $.ajax({
            type: 'POST',
            url: window.VigAiRoute.stream,
            data: {
                '_token': window.VigAiRoute.csrf,
                'message': fullPrompt,
                'type': 0, // Type 0 sẽ sử dụng prompt tùy chỉnh
                'externalId': externalId || ''
            },
            success: function(response) {
                try {
                    // Xử lý response
                    let newContent = '';

                    // Kiểm tra nếu response là string
                    if (typeof response === 'string') {
                        // Loại bỏ các markup không cần thiết
                        newContent = cleanupAIResponse(response);
                    } else if (response.data && response.data.content) {
                        newContent = cleanupAIResponse(response.data.content);
                    }

                    if (newContent) {
                        // Áp dụng nội dung mới
                        applyTextEdit(selection, newContent);
                        Botble.showSuccess('Đã cập nhật nội dung đoạn văn bản');
                    } else {
                        Botble.showError('Không nhận được phản hồi hợp lệ từ AI');
                    }
                } catch (error) {
                    console.error('Lỗi khi xử lý phản hồi AI:', error);
                    Botble.showError('Không thể xử lý phản hồi: ' + error.message);
                }

                callback && callback();
            },
            error: function(error) {
                console.error('Lỗi khi gọi API:', error);
                Botble.showError('Không thể kết nối đến máy chủ AI');
                callback && callback();
            }
        });
    }

    // Làm sạch phản hồi từ AI
    function cleanupAIResponse(text) {
        // Loại bỏ các markup HTML không cần thiết nếu có
        // Giữ lại định dạng cơ bản như đoạn văn, đậm, nghiêng...
        return text.trim();
    }

    // Áp dụng nội dung mới cho đoạn văn
    function applyTextEdit(selection, newText) {
        if (!selection.range) return;

        try {
            // Xóa highlight
            removeHighlight();

            // Xóa nội dung cũ và chèn nội dung mới
            selection.range.deleteContents();

            // Nếu newText chứa HTML, chèn dưới dạng HTML
            if (newText.includes('<') && newText.includes('>')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newText;

                // Tạo fragment từ nội dung HTML
                const fragment = document.createDocumentFragment();
                while (tempDiv.firstChild) {
                    fragment.appendChild(tempDiv.firstChild);
                }

                selection.range.insertNode(fragment);
            } else {
                // Nếu chỉ là văn bản thuần túy
                const textNode = document.createTextNode(newText);
                selection.range.insertNode(textNode);
            }

            // Xóa selection
            window.getSelection().removeAllRanges();
        } catch (error) {
            console.error('Lỗi khi áp dụng chỉnh sửa:', error);
            Botble.showError('Không thể cập nhật nội dung: ' + error.message);
        }
    }

    // Hàm tạo highlight cho phần được chọn
    function highlightSelection(selection) {
        removeHighlight(); // Xóa highlight cũ nếu có

        if (selection.rangeCount) {
            try {
                const range = selection.getRangeAt(0).cloneRange();
                const span = document.createElement('span');
                span.className = 'highlight-selection';
                span.id = 'current-highlight';

                // Thử cách an toàn để highlight mà không dùng surroundContents
                try {
                    // Kiểm tra xem có thể sử dụng surroundContents hay không
                    if (isRangeSurroundable(range)) {
                        // Đặt highlight span bao quanh nội dung được chọn
                        range.surroundContents(span);
                    } else {
                        // Sử dụng phương pháp thay thế khi không thể dùng surroundContents
                        const fragment = range.extractContents();
                        span.appendChild(fragment);
                        range.insertNode(span);
                    }

                    // Lưu selection mới để có thể khôi phục sau
                    const newRange = document.createRange();
                    newRange.selectNodeContents(span);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                } catch (e) {
                    console.error('Không thể highlight toàn bộ selection, sử dụng phương pháp thay thế:', e);

                    // Thực hiện phương pháp thay thế
                    try {
                        // Đặt style trực tiếp thay vì sử dụng surroundContents
                        const selectedNodes = getSelectedNodes(selection);
                        if (selectedNodes.length > 0) {
                            // Tạo một container để lưu trữ tạm thời các node đã highlight
                            const tempSpan = document.createElement('span');
                            tempSpan.id = 'current-highlight';
                            tempSpan.className = 'highlight-selection';

                            // Thay thế node đầu tiên với container
                            const parentNode = selectedNodes[0].parentNode;
                            parentNode.insertBefore(tempSpan, selectedNodes[0]);

                            // Di chuyển tất cả các node được chọn vào container
                            selectedNodes.forEach(node => {
                                tempSpan.appendChild(node);
                            });
                        }
                    } catch (innerError) {
                        console.error('Phương pháp thay thế cũng thất bại:', innerError);
                    }
                }
            } catch (e) {
                console.error('Không thể highlight selection:', e);
            }
        }
    }

    // Kiểm tra xem Range có thể sử dụng surroundContents hay không
    function isRangeSurroundable(range) {
        // Kiểm tra nếu selection chỉ chứa text nodes hoặc hoàn toàn chứa node
        try {
            // Tạo một bản sao của range để kiểm tra
            const testRange = range.cloneRange();
            const testSpan = document.createElement('span');

            // Thử gọi surroundContents() trên bản sao
            testRange.surroundContents(testSpan);

            // Nếu không có lỗi, thì range có thể sử dụng surroundContents
            return true;
        } catch (e) {
            // Có lỗi, không thể sử dụng surroundContents
            return false;
        }
    }

    // Lấy tất cả các node được chọn trong selection
    function getSelectedNodes(selection) {
        const nodes = [];
        if (!selection.rangeCount) return nodes;

        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;

        // Nếu selection chỉ trong một node
        if (range.startContainer === range.endContainer) {
            // Nếu là text node
            if (range.startContainer.nodeType === Node.TEXT_NODE) {
                // Tạo một text node mới từ phần được chọn
                const newTextNode = document.createTextNode(
                    range.startContainer.textContent.substring(range.startOffset, range.endOffset)
                );
                nodes.push(newTextNode);

                // Cập nhật text node gốc
                const originalText = range.startContainer.textContent;
                const beforeText = originalText.substring(0, range.startOffset);
                const afterText = originalText.substring(range.endOffset);

                if (beforeText) {
                    const beforeNode = document.createTextNode(beforeText);
                    range.startContainer.parentNode.insertBefore(beforeNode, range.startContainer);
                }

                if (afterText) {
                    const afterNode = document.createTextNode(afterText);
                    range.startContainer.parentNode.insertBefore(afterNode, range.startContainer.nextSibling);
                }

                // Xóa node gốc
                range.startContainer.parentNode.removeChild(range.startContainer);
            } else {
                // Đối với node khác, thêm toàn bộ node vào danh sách
                nodes.push(range.startContainer);
            }
            return nodes;
        }

        // Xử lý trường hợp selection trải dài qua nhiều node
        // Đây là cách đơn giản, không hoàn chỉnh nhưng sẽ hoạt động cho phần lớn trường hợp
        const allNodes = [];
        const getNodes = function(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                allNodes.push(node);
            } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                    getNodes(node.childNodes[i]);
                }
            }
        };

        // Lấy tất cả node con
        getNodes(container);

        // Lọc các node nằm trong phạm vi selection
        let inRange = false;
        for (let i = 0; i < allNodes.length; i++) {
            const node = allNodes[i];

            if (node === range.startContainer) {
                inRange = true;
            }

            if (inRange) {
                nodes.push(node);
            }

            if (node === range.endContainer) {
                break;
            }
        }

        return nodes;
    }

    // Hàm xóa highlight
    function removeHighlight() {
        const highlight = document.getElementById('current-highlight');
        if (highlight) {
            // Thay thế span bằng nội dung bên trong nó
            const parent = highlight.parentNode;
            while (highlight.firstChild) {
                parent.insertBefore(highlight.firstChild, highlight);
            }
            parent.removeChild(highlight);
        }
    }
}

// Hàm để khởi tạo tất cả các tính năng
function initializeFeatures() {
    // Thiết lập chỉnh sửa inline
    setupInlineEditing();
}

// Thêm container cho preview nếu chưa có
document.addEventListener("DOMContentLoaded", function() {
    // Tạo container để preview nội dung
    if (!document.getElementById('vig-ai-preview-container')) {
        const previewContainer = document.createElement('div');
        previewContainer.id = 'vig-ai-preview-container';
        previewContainer.style.border = '1px solid #e2e2e2';
        previewContainer.style.borderRadius = '5px';
        previewContainer.style.padding = '15px';
        previewContainer.style.margin = '15px 0';
        previewContainer.style.minHeight = '100px';

        // Chèn container vào sau textarea input
        const inputArea = document.getElementById('completion-ask');
        if (inputArea && inputArea.parentNode) {
            inputArea.parentNode.insertBefore(previewContainer, inputArea.nextSibling);
        } else {
            // Nếu không tìm thấy input, thêm vào một vị trí phù hợp khác
            const formGroup = document.querySelector('.form-group');
            if (formGroup) {
                formGroup.appendChild(previewContainer);
            }
        }
    }

    // Tạo indicator cho streaming
    if (!document.querySelector('.vig-ai-streaming-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'vig-ai-streaming-indicator';
        indicator.textContent = 'Đang tạo nội dung...';
        indicator.style.position = 'fixed';
        indicator.style.bottom = '20px';
        indicator.style.right = '20px';
        indicator.style.backgroundColor = '#4CAF50';
        indicator.style.color = 'white';
        indicator.style.padding = '8px 15px';
        indicator.style.borderRadius = '5px';
        indicator.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        indicator.style.zIndex = '9999';
        indicator.style.display = 'none';
        document.body.appendChild(indicator);
    }

    // Cập nhật label cho nút chính
    const generateBtn = document.querySelector('.btn-vig-ai-completion');
    if (generateBtn) {
        generateBtn.textContent = 'Tạo nội dung tự động';
        generateBtn.title = 'Tự động tạo cả description và nội dung bài viết';
    }

    // Gọi hàm khởi tạo tính năng
    initializeFeatures();
});

// Sự kiện thay đổi loại nội dung
$(document).on('change', '#completion-select-type', function (event) {
    event.preventDefault();
    event.stopPropagation();
    promptType = $(this).val();
});

// Sự kiện click vào nút tạo nội dung
$(document).on('click', '.btn-vig-ai-completion', function (event) {
    event.preventDefault();
    event.stopPropagation();

    // Lấy nội dung từ input
    let ask = $('#completion-ask').val();
    if (!ask || ask.trim() === '') {
        Botble.showError('Vui lòng nhập tiêu đề hoặc chủ đề để tạo nội dung');
        return;
    }

    // Tự động tạo cả description và nội dung
    isAutoProcessing = true;

    // Bước 1: Tạo description trước
    promptType = 9; // Chuyển sang loại description
    ajaxAi(this, ask);
    // Quá trình sẽ tiếp tục tự động trong hàm ajaxAi thông qua hàm completeDescriptionProcess
});

// Xử lý sự kiện import model
$(document).on('click', '.btn-submit-model', function (event) {
    event.preventDefault();
    event.stopPropagation();
    $(this).prop('disabled', true).addClass('button-loading');
    $.ajax({
        type: 'POST',
        url: route('vig-ai.importModel'),
        data: {
            '_token': window.VigAiRoute.csrf,
        },
        success: res => {
            if (res.error) {
                Botble.showError(res.message)
                $(this).prop('disabled', false).removeClass('button-loading');
            } else {
                Botble.showSuccess(res.message);
                setTimeout(() => {
                    window.location.reload();
                    $(this).prop('disabled', false).removeClass('button-loading');
                }, 1000);
            }
        },
        error: res => {
            $(this).prop('disabled', false).removeClass('button-loading');
            Botble.handleError(res + ' ' + res.status);
        },
    });
});

// Xử lý sự kiện chọn văn bản
function handleTextSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && selectedText.length > 0) {
        // Lấy thông tin vị trí
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Hiển thị nút sửa tại vị trí phù hợp
        const button = document.getElementById('floating-edit-button');
        button.style.top = `${window.scrollY + rect.bottom + 5}px`;
        button.style.left = `${window.scrollX + rect.left + rect.width / 2 - 12}px`;
        button.style.display = 'flex';

        // Lưu văn bản được chọn để sử dụng sau này
        currentSelectedText = selectedText;

        // Thêm lớp highlight cho văn bản được chọn
        addHighlightToSelection(range);
    } else {
        // Ẩn nút nếu không có văn bản nào được chọn
        document.getElementById('floating-edit-button').style.display = 'none';

        // Xóa highlight
        removeHighlights();
    }
}

// Xử lý khi nhấn nút chỉnh sửa
function handleEditButtonClick() {
    // Hiển thị modal với văn bản đã chọn
    showPromptModal();

    // Ẩn nút sau khi nhấn
    document.getElementById('floating-edit-button').style.display = 'none';
}

// Xử lý AI action với prompt
function doAiAction(prompt) {
    // Đảm bảo vigAiConfig đã được định nghĩa
    if (typeof window.vigAiConfig === 'undefined' || !window.vigAiConfig.routes || !window.vigAiConfig.routes.inlineEdit) {
        toastr.error('Cấu hình không hợp lệ. Vui lòng làm mới trang và thử lại.');
        return;
    }

    // Hiển thị loading
    handleLoadingState(true);

    // Gửi request tới server
    $.ajax({
        url: vigAiConfig.routes.inlineEdit,
        type: 'POST',
        data: {
            text: currentSelectedText,
            prompt: prompt,
            _token: $('meta[name="csrf-token"]').attr('content')
        },
        success: function(response) {
            if (response.error) {
                toastr.error(response.message);
            } else {
                // Thay thế văn bản được chọn bằng văn bản mới
                replaceSelectedText(response.data.content);
                toastr.success(response.message);
            }

            // Ẩn loading
            handleLoadingState(false);
        },
        error: function(xhr) {
            // Hiển thị thông báo lỗi
            toastr.error(xhr.responseJSON?.message || 'Đã xảy ra lỗi trong quá trình xử lý.');

            // Ẩn loading
            handleLoadingState(false);
        }
    });
}

// Thêm highlight cho văn bản được chọn
function addHighlightToSelection(range) {
    removeHighlights(); // Xóa highlight cũ trước khi thêm mới

    const span = document.createElement('span');
    span.className = 'highlight-selection';
    span.id = 'vig-ai-selection-highlight';

    try {
        range.surroundContents(span);
    } catch (e) {
        console.error('Không thể highlight văn bản:', e);
    }
}

// Xóa tất cả highlights
function removeHighlights() {
    const highlights = document.querySelectorAll('.highlight-selection');
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        while (highlight.firstChild) {
            parent.insertBefore(highlight.firstChild, highlight);
        }
        parent.removeChild(highlight);
    });
}

// Thay thế văn bản đã chọn bằng văn bản mới
function replaceSelectedText(newText) {
    const highlight = document.getElementById('vig-ai-selection-highlight');
    if (highlight) {
        highlight.innerHTML = newText;
        removeHighlights();
    } else {
        // Nếu không tìm thấy highlight, thử thay thế trực tiếp vào selection
        const selection = window.getSelection();
        if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(newText));
        }
    }
}

// Xử lý trạng thái loading
function handleLoadingState(isLoading) {
    const button = document.getElementById('floating-edit-button');
    if (isLoading) {
        button.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
        button.disabled = true;
    } else {
        button.innerHTML = '<i class="fa fa-edit"></i>';
        button.disabled = false;
    }
}

// Khởi tạo chức năng chỉnh sửa inline
function initializeInlineEditing() {
    // Kiểm tra nếu chức năng đã được khởi tạo
    if (document.getElementById('floating-edit-button')) {
        console.log('Chức năng chỉnh sửa inline đã được khởi tạo trước đó');
        return;
    }

    // Khởi tạo biến lưu trữ văn bản đã chọn
    currentSelectedText = '';

    // Tạo nút sửa floating
    const editButton = document.createElement('button');
    editButton.id = 'floating-edit-button';
    editButton.innerHTML = '<i class="fa fa-edit"></i>';
    editButton.style.display = 'none'; // Ẩn nút mặc định
    editButton.style.position = 'absolute'; // Đảm bảo vị trí tuyệt đối
    editButton.style.zIndex = '100000'; // Z-index cao để hiển thị trên các phần tử khác

    // Thêm sự kiện click cho nút
    editButton.addEventListener('click', function() {
        // Kiểm tra nếu hàm handleEditButtonClick tồn tại
        if (typeof handleEditButtonClick === 'function') {
            handleEditButtonClick();
        } else {
            // Mặc định hiển thị modal
            if (currentSelectedText) {
                showPromptModal(currentSelectedText);
            }
            // Ẩn nút
            this.style.display = 'none';
        }
    });

    // Thêm nút vào document
    document.body.appendChild(editButton);

    // Lắng nghe sự kiện chọn văn bản
    document.addEventListener('mouseup', function(e) {
        if (typeof handleTextSelection === 'function') {
            handleTextSelection(e);
        }
    });

    document.addEventListener('keyup', function(e) {
        if (typeof handleTextSelection === 'function') {
            handleTextSelection(e);
        }
    });

    console.log('Đã khởi tạo chức năng chỉnh sửa inline');
}

// Gọi khởi tạo khi tài liệu đã sẵn sàng
$(document).ready(function() {
    // Tạo biến mặc định nếu chưa được định nghĩa
    window.vigAiConfig = window.vigAiConfig || {
        enableInlineEditing: false,
        routes: {
            inlineEdit: window.VigAiRoute?.stream || ''
        }
    };

    // Kiểm tra nếu có quyền chỉnh sửa inline
    if (vigAiConfig.enableInlineEditing) {
        initializeInlineEditing();
    }
});

