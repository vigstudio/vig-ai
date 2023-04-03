<?php

namespace VigStudio\LaravelAI\Contracts;

use Illuminate\Support\Collection;
use VigStudio\LaravelAI\Responses\ImageResponse;
use VigStudio\LaravelAI\Responses\TextResponse;

interface Connector
{
    /**
     * The name of the connector/provider.
     * It will be used to identify the connector in the database and to provide
     * an easy way to identify the connector.
     */
    public const NAME = 'base';

    /**
     * List all models available for this connector.
     * Typically this function will retrieve the list though the API of the provider.
     * Should return a collection of ModelObject objects.
     *
     * @return Collection - A collection of ModelBridge objects
     */
    public function listModels(): Collection;

    /**
     * Complete a prompt with the given model.
     */
    public function complete(string $model, string $prompt, int $maxTokens, float $temperature): TextResponse;

    /**
     * Send a chat message to the given model.
     *
     * @return TextResponse - The response from the provider
     */
    public function chat(string $model, array|string $messages): TextResponse;

    /**
     * Generate an image from the given prompt.
     *
     * @return ImageResponse - The response from the provider
     */
    public function imageGenerate(string $prompt, int $width, int $height): ImageResponse;
}
