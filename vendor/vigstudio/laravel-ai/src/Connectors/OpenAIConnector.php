<?php

namespace VigStudio\LaravelAI\Connectors;

use Exception;
use Illuminate\Support\Collection;
use Orhanerday\OpenAi\OpenAi;
use VigStudio\LaravelAI\Bridges\ModelBridge;
use VigStudio\LaravelAI\Contracts\Connector;
use VigStudio\LaravelAI\Enums\Provider;
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
     * @var int - The default max tokens for the OpenAI API
     */
    private int $defaultMaxTokens = 5;

    /**
     * @var float - The default temperature for the OpenAI API
     */
    private float $defaultTemperature = 0;

    /**
     * @param  OpenAi  $client - The OpenAI client
     */
    public function __construct(protected OpenAi $client)
    {
    }

    /**
     * Setter for the default max tokens
     */
    public function withDefaultMaxTokens(int $maxTokens): self
    {
        $this->defaultMaxTokens = $maxTokens;

        return $this;
    }

    /**
     * Setter for the default temperature
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
        $models = json_decode($this->client->listModels());

        if (empty($models->error)) {
            return Collection::make($models->data)->map(function ($model) {
                return ModelBridge::new()->withProvider(Provider::OpenAI)
                    ->withName($model->id ?? '')
                    ->withExternalId($model->id ?? '');
            });
        }

        return Collection::make($models->error);
    }

    /**
     * {@inheritDoc}
     *
     * @throws Exception
     */
    public function complete(string $model, string $prompt, int $maxTokens = null, float $temperature = null): TextResponse
    {
        $response = $this->client->completion([
            'model' => $model,
            'prompt' => $prompt,
            'max_tokens' => $maxTokens ?? $this->defaultMaxTokens,
            'temperature' => $temperature ?? $this->defaultTemperature,
        ]);

        $response = json_decode($response);

        $contents = [];

        foreach ($response->choices as $result) {
            $contents[] = $result->text;
        }

        return TextResponse::new()->withExternalId($response->id)->withMessage(
            MessageResponse::new()->withContent(implode("\n--\n", $contents))->withRole('assistant')
        );
    }

    /**
     * {@inheritDoc}
     *
     * @throws Exception
     */
    public function completeStream(string $model, string $prompt, int $maxTokens = null, float $temperature = null): TextResponse
    {
        $contents = '';
        $result = [];
        $id = '';
        $stream = $this->client->completion([
            'model' => $model,
            'prompt' => $prompt,
            'max_tokens' => 3000,
            'stream' => true,
        ], function ($curl_info, $data) use (&$contents, &$id) {
            $clean = str_replace('data: ', '', $data);
            $arr = json_decode($clean, true);

            if ($data != "data: [DONE]\n\n" and isset($arr['choices'][0]['text'])) {
                $id = $arr['id'];
                $contents .= $arr['choices'][0]['text'];
            }

            return strlen($data);
        });

        $result[] = $contents;

        return TextResponse::new()->withExternalId($id)->withMessage(
            MessageResponse::new()->withContent(implode("\n--\n", $result))->withRole('assistant')
        );
    }

    /**
     * {@inheritDoc}
     *
     * @throws Exception
     */
    public function chat(string $model, array|string $messages): TextResponse
    {
        $messages = is_array($messages) ? $messages : [
            [
                'role' => 'user',
                'content' => $messages,
            ],
        ];

        $chat = $this->client->chat([
            'model' => $model,
            'messages' => $messages,
        ]);

        $chat = json_decode($chat);

        $response = TextResponse::new()->withExternalId($chat->id);

        foreach ($chat->choices as $choice) {
            $response->withMessage(
                MessageResponse::new()->withContent($choice->message->content)->withRole($choice->message->role)
            );
        }

        return $response;
    }

    /**
     * {@inheritDoc}
     *
     * @throws Exception
     */
    public function chatStream(string $model, array|string $messages): TextResponse
    {
        $messages = is_array($messages) ? $messages : [
            [
                'role' => 'user',
                'content' => $messages,
            ],
        ];

        $content = '';
        $role = 'assistant';
        $id = '';
        $chat = $this->client->chat([
            'model' => $model,
            'messages' => $messages,
            'stream' => true,
        ], function ($curl_info, $data) use (&$content, &$role, &$id) {
            $jsonStrings = explode("\n\n", $data);
            foreach ($jsonStrings as $string) {
                $clean = str_replace('data: ', '', $string);
                $arr = json_decode($clean, true);

                if (! empty($arr['choices'][0]['delta']['role'])) {
                    $role = $arr['choices'][0]['delta']['role'];
                }

                if (! empty($arr['id'])) {
                    $id = $arr['id'];
                }

                if (! empty($arr['choices'][0]['delta']['content'])) {
                    $content .= $arr['choices'][0]['delta']['content'];
                }
            }

            return strlen($data);
        });

        $response = TextResponse::new()->withExternalId($id);

        $response->withMessage(
            MessageResponse::new()->withContent($content)->withRole($role)
        );

        return $response;
    }

    /**
     * {@inheritDoc}
     *
     * @throws Exception
     */
    public function imageGenerate(string $prompt, int $width, int $height): ImageResponse
    {
        $response = $this->client->image([
            'prompt' => $prompt,
            'n' => 1,
            'size' => sprintf('%dx%d', $width, $height),
            'response_format' => 'url',
        ]);

        $url = null;
        $response = json_decode($response);
        foreach ($response->data as $data) {
            $url = $data->url;
            // $data->b64_json; // null
        }

        return ImageResponse::new()->withCreatedAt($response->created)->withUrl($url);
    }
}
