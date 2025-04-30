<?php

namespace VigStudio\VigAI\Http\Controllers;

use Botble\Base\Http\Controllers\BaseController;
use Botble\Base\Http\Responses\BaseHttpResponse;
use Illuminate\Http\Request;
use VigStudio\LaravelAI\Bridges\ChatBridge;
use VigStudio\LaravelAI\Bridges\ImageBridge;
use VigStudio\LaravelAI\Enums\Provider;
use VigStudio\LaravelAI\Models\Chat;
use VigStudio\LaravelAI\Models\Model;

class VigAiController extends BaseController
{
    public function stream(Request $request)
    {
        $message = $this->prompt($request->input('message'), $request->input('type'));
        $externalId = $request->input('externalId');

        $provider = Provider::from('openai');
        $chat = ChatBridge::new()->withProvider($provider)->withModel('gpt-4o-mini');

        $withChat = Chat::where('external_id', $externalId)->first();
        if ($withChat) {
            $chat->withChat($withChat);
        }

        return response()->eventStream(function () use ($chat, $message) {
            $stream = $chat->sendStream($message);
            foreach ($stream as $chunk) {
                yield $chunk;
            }

            yield json_encode(['external_id' => $chat->externalId()]);

        }, endStreamWith: '[DONE]');
    }

    public function importModel(Request $request, BaseHttpResponse $response)
    {
        $provider = Provider::from('openai');

        Model::whereProvider('openai')->update([
            'is_active' => false,
        ]);

        $models = $provider->getConnector()->listModels();

        if (! empty($models['message'])) {
            return $response->setError()->setMessage($models['message'])->toApiResponse();
        }

        foreach ($models as $modelBridge) {
            $modelBridge->import();
        }

        return $response->setError(false)->toApiResponse();
    }

    public function generateImage(Request $request, BaseHttpResponse $response)
    {
        try {
            // Lấy thông tin từ request
            $prompt = $request->input('prompt', '');
            $width = $request->input('width', 1024);
            $height = $request->input('height', 1024);

            if (empty($prompt)) {
                return $response->setError()->setMessage('Vui lòng cung cấp mô tả cho ảnh')->toApiResponse();
            }

            // Kiểm tra và điều chỉnh kích thước hợp lệ cho OpenAI
            $validSizes = ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'];
            $requestedSize = "{$width}x{$height}";

            if (! in_array($requestedSize, $validSizes)) {
                // Nếu kích thước không hợp lệ, chọn kích thước hợp lệ gần nhất
                if ($width >= 1000 && $height >= 1000) {
                    $size = '1024x1024';  // Sử dụng kích thước lớn cho ảnh lớn
                } elseif ($width >= 500 && $height >= 500) {
                    $size = '512x512';    // Sử dụng kích thước trung bình
                } else {
                    $size = '256x256';    // Sử dụng kích thước nhỏ
                }

                // Tách số từ chuỗi size để gán cho width và height
                list($width, $height) = explode('x', $size);
            }

            // Khởi tạo provider và tạo ảnh
            $provider = Provider::from('openai');

            $imageUrl = ImageBridge::new()
                ->withProvider($provider)
                ->generate($prompt, (int) $width, (int) $height);

            // Trả về URL ảnh
            return $response->setData(['url' => $imageUrl])->toApiResponse();
        } catch (\Exception $e) {
            return $response->setError()->setMessage('Lỗi khi tạo ảnh: ' . $e->getMessage())->toApiResponse();
        }
    }

    public function prompt(string $topic, string|int $type)
    {
        return match ($type) {
            '1' => "Write a blog post with the title \"$topic\".
                    Format the content using proper HTML tags:
                    - Use <h1> for the main title
                    - Use <h2> for main sections
                    - Use <h3> for subsections
                    - Use <h4> for smaller sections
                    - Use <p> for paragraphs
                    - Use <strong> or <b> for emphasis
                    - Use <em> or <i> for italics
                    - Use <ul> and <li> for unordered lists
                    - Use <ol> and <li> for ordered lists
                    - Use <blockquote> for quotations
                    - Use <code> for code snippets
                    - Use <pre><code> for code blocks

                    The length of the article should be between 1000 and 3000 words to ensure comprehensive and valuable information for readers.
                    Structure the content with a clear hierarchy of headings to help readers easily find the information they need.
                    The content should be arranged in a logical order and provide complete information to answer readers' questions.
                    Please detect the language of \"$topic\" and write the content in that same language.",

            '2' => "Create an outline for a blog post with the title \"$topic\".
                    Format the content using proper HTML tags:
                    - Use <h1> for the main title
                    - Use <h2> for main sections
                    - Use <h3> for subsections
                    - Use <ul> and <li> for unordered lists
                    - Use <ol> and <li> for ordered lists

                    Please detect the language of \"$topic\" and write the outline in that same language.",

            '3' => "Brainstorm ideas about \"$topic\".
                    Format the content using proper HTML tags:
                    - Use <h1> for the main title
                    - Use <h2> for categories
                    - Use <ul> and <li> for lists of ideas

                    Please detect the language of \"$topic\" and write the brainstorming content in that same language.",

            '4' => "Write a social media post about \"$topic\" with hashtags.
                    Format the content using proper HTML tags:
                    - Use <h2> for a title if needed
                    - Use <p> for paragraphs
                    - Use <strong> or <b> to emphasize important keywords

                    Please detect the language of \"$topic\" and write the social media post in that same language.",

            '5' => "Write a creative story about \"$topic\" with engaging content that attracts readers.
                    Format the content using proper HTML tags:
                    - Use <h1> for the story title
                    - Use <h2> for chapters or main sections
                    - Use <h3> for scenes
                    - Use <blockquote> for memorable quotes or important citations
                    - Use <p> for paragraphs

                    Please detect the language of \"$topic\" and write the story in that same language.",

            '6' => "Write a job description for \"$topic\" with content that attracts candidates.
                    Format the content using proper HTML tags:
                    - Use <h1> for the job title
                    - Use <h2> for main sections like Requirements, Responsibilities
                    - Use <h3> for subsections
                    - Use <ul> and <li> for lists of key points

                    Please detect the language of \"$topic\" and write the job description in that same language.",

            '7' => "Write a product introduction for \"$topic\" with content that attracts readers and increases sales potential.
                    Format the content using proper HTML tags:
                    - Use <h1> for the product name
                    - Use <h2> for main sections like Features, Benefits
                    - Use <h3> for subsections
                    - Use <strong> or <b> for important points
                    - Use <ul> and <li> for lists of features

                    The length of the article should be between 500 and 3000 words to ensure comprehensive and valuable information for readers.
                    The content should have clear headings to help readers easily find the information they need.
                    The content should be arranged in a logical order and provide complete information to answer readers' questions.
                    Please detect the language of \"$topic\" and write the product introduction in that same language.",

            '8' => "Write an advertising article with the title and requirements \"$topic\" with content that attracts readers.
                    Format the content using proper HTML tags:
                    - Use <h1> for the main title
                    - Use <h2> for main sections
                    - Use <h3> for subsections
                    - Use <strong> or <b> for important points
                    - Use <ul> and <li> for lists of key points

                    The content should be arranged in a logical order and provide complete information to answer readers' questions.
                    Please detect the language of \"$topic\" and write the advertising article in that same language.",

            '9' => "Write a short description (meta description) about \"$topic\" with a length of approximately 150-160 characters.
                    The description should be concise, engaging, and contain important keywords.
                    The purpose of the meta description is to encourage users to click on search results.
                    Create content that is no more than 160 characters to optimize display on search engines.
                    No need to use HTML, just write plain text.
                    Please detect the language of \"$topic\" and write the description in that same language.",

            '10' => "Create a concise meta description for SEO about the topic \"$topic\".
                    - Exact length between 150-160 characters (not exceeding 400 characters)
                    - The description must be engaging, encouraging users to click on search results
                    - Contains the main keyword \"$topic\"
                    - Do not use any HTML tags
                    - Return only plain text suitable for a meta description field
                    - Brief, concise, describing the basic value of the topic

                    NOTE: Return ONLY the META DESCRIPTION as plain text, without any formatting or other annotations.
                    Please detect the language of \"$topic\" and write the meta description in that same language.",

            default => "Answer the following request: $topic

                    Format your response using proper HTML tags:
                    - Use <h1> for the main title
                    - Use <h2> for main sections
                    - Use <h3> for subsections
                    - Use <ul> and <li> for unordered lists
                    - Use <ol> and <li> for ordered lists
                    - Use <strong> or <b> for emphasis

                    This is just a request; please provide the exact content as requested, with appropriate structure and formatting.
                    Please detect the language of the request and respond in that same language.",
        };
    }
}
