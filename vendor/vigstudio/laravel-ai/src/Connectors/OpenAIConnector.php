<?php

namespace VigStudio\LaravelAI\Connectors;

use Illuminate\Support\Collection;
use OpenAI\Exceptions\ErrorException;
use OpenAI\Resources\Chat;
use OpenAI\Resources\Completions;
use OpenAI\Resources\Images;
use OpenAI\Resources\Models;
use VigStudio\LaravelAI\Bridges\ModelBridge;
use VigStudio\LaravelAI\Contracts\Connector;
use VigStudio\LaravelAI\Responses\ImageResponse;
use VigStudio\LaravelAI\Responses\MessageResponse;
use VigStudio\LaravelAI\Responses\TextResponse;

/**
 * The Connector for the OpenAI provider
 */
class OpenAIConnector implements Connector
{
    /**
     * {@inheritDoc}
     */
    public const NAME = 'openai';

    /**
     * The OpenAI chat client
     */
    private $chat;

    /**
     * The OpenAI images client
     */
    private $images;

    /**
     * The OpenAI models client
     */
    private $models;

    /**
     * The default max tokens for completions
     */
    private int $defaultMaxTokens = 1000;

    /**
     * The default temperature for completions
     */
    private float $defaultTemperature = 0.7;

    /**
     * Create a new OpenAI connector
     */
    public function __construct($chat, $images, $models)
    {
        $this->chat = $chat;
        $this->images = $images;
        $this->models = $models;
    }

    /**
     * Set the default max tokens for completions
     */
    public function withDefaultMaxTokens(int $maxTokens): self
    {
        $this->defaultMaxTokens = $maxTokens;

        return $this;
    }

    /**
     * Set the default temperature for completions
     */
    public function withDefaultTemperature(float $temperature): self
    {
        $this->defaultTemperature = $temperature;

        return $this;
    }

    /**
     * {@inheritDoc}
     */
    public function listModels(): Collection
    {
        $response = $this->models->list();

        return collect($response->data)->map(function ($model) {
            return ModelBridge::new()
                ->withExternalId($model->id)
                ->withName($model->id);
        });
    }

    /**
     * {@inheritDoc}
     */
    public function chat(string $model, array|string $messages, bool $stream = false): TextResponse|\Generator
    {
        if ($stream) {
            return $this->chatStream($model, $messages);
        }

        try {
            $params = [
                'model' => $model,
                'messages' => is_array($messages) ? $messages : [
                    ['role' => 'user', 'content' => $messages],
                ],
                'max_tokens' => $this->defaultMaxTokens,
                'temperature' => $this->defaultTemperature,
            ];

            $response = $this->chat->create($params);

            return $this->formatTextResponse($response);
        } catch (\Exception $e) {
            if ($this->isQuotaExceeded($e)) {
                return $this->createQuotaExceededResponse();
            }

            throw $e;
        }
    }

    /**
     * Chat with streaming response
     */
    private function chatStream(string $model, array|string $messages): \Generator
    {
        try {
            $params = [
                'model' => $model,
                'messages' => is_array($messages) ? $messages : [
                    ['role' => 'user', 'content' => $messages],
                ],
                'temperature' => $this->defaultTemperature,
            ];

            $response = $this->chat->createStreamed($params);
            foreach ($response as $chunk) {
                if (isset($chunk->choices[0]->delta->content)) {
                    yield $chunk->choices[0]->delta->content;
                }
            }
        } catch (\Exception $e) {
            if ($this->isQuotaExceeded($e)) {
                yield $this->createQuotaExceededResponse()->message()->content();
            } else {
                throw $e;
            }
        }
    }

    /**
     * {@inheritDoc}
     */
    public function imageGenerate(string $prompt, int $width, int $height): ImageResponse
    {
        try {
            $response = $this->images->create([
                'prompt' => $prompt,
                'n' => 1,
                'size' => "{$width}x{$height}",
            ]);

            return ImageResponse::new()
                ->withUrl($response->data[0]->url);
        } catch (\Exception $e) {
            if ($this->isQuotaExceeded($e)) {
                return ImageResponse::new()
                    ->withUrl('https://via.placeholder.com/' . $width . 'x' . $height . '?text=Quota+Exceeded');
            }

            throw $e;
        }
    }

    /**
     * Format a text response from OpenAI
     */
    private function formatTextResponse($response): TextResponse
    {
        return TextResponse::new()
            ->withExternalId($response->id)
            ->withMessage(
                MessageResponse::new()
                    ->withContent($response->choices[0]->message->content)
                    ->withRole($response->choices[0]->message->role)
            );
    }

    /**
     * Create a quota exceeded response
     */
    private function createQuotaExceededResponse(): TextResponse
    {
        return TextResponse::new()
            ->withExternalId('quota-exceeded')
            ->withMessage(
                MessageResponse::new()
                    ->withContent('Xin lỗi, tôi đã đạt giới hạn quota. Vui lòng thử lại sau.')
                    ->withRole('assistant')
            );
    }

    /**
     * Check if the exception is a quota exceeded error
     */
    private function isQuotaExceeded(\Exception $e): bool
    {
        if (! $e instanceof ErrorException) {
            return false;
        }

        try {
            // Trong phiên bản mới của OpenAI SDK, cấu trúc lỗi có thể khác
            // Thử truy cập thông qua error() hoặc từ các thuộc tính khác
            if (method_exists($e, 'getError')) {
                return $e->getError()['code'] === 'insufficient_quota';
            }

            // Thử các cách khác để lấy mã lỗi
            if (method_exists($e, 'error')) {
                $error = $e->error();
                if (is_array($error) && isset($error['code'])) {
                    return $error['code'] === 'insufficient_quota';
                }
            }

            // Kiểm tra nội dung message xem có chứa thông tin về quota không
            $message = $e->getMessage();

            return (
                stripos($message, 'quota') !== false ||
                stripos($message, 'insufficient_quota') !== false ||
                stripos($message, 'rate limit') !== false
            );
        } catch (\Exception $innerException) {
            // Nếu có lỗi khi truy cập thuộc tính lỗi, ghi log và trả về false
            error_log('Lỗi khi kiểm tra quota: ' . $innerException->getMessage());

            return false;
        }
    }
}
