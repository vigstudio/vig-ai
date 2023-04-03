<?php

namespace VigStudio\LaravelAI\Bridges;

use Illuminate\Database\Eloquent\Model;
use VigStudio\LaravelAI\Contracts\Bridge;
use VigStudio\LaravelAI\Contracts\HasModel;
use VigStudio\LaravelAI\Contracts\HasNew;
use VigStudio\LaravelAI\Contracts\HasProvider;
use VigStudio\LaravelAI\Models\Image;

class ImageBridge implements Bridge
{
    use HasProvider, HasModel, HasNew;

    /**
     * @var string|null The external id of the image, returned by the provider
     */
    private ?string $externalId;

    /**
     * @var string|null The prompt of the image, provided by the user
     */
    private ?string $prompt;

    /**
     * @var int|null The width of the image, provided by the user
     */
    private ?int $width;

    /**
     * @var int|null The height of the image, provided by the user
     */
    private ?int $height;

    /**
     * @var string|null The url of the image, returned by the provider
     */
    private ?string $url;

    /**
     * @var Image|null The corresponding image model
     */
    private ?Image $image;

    /**
     * Setter for the external id
     */
    public function withExternalId(string $externalId = null): self
    {
        $this->externalId = $externalId;

        return $this;
    }

    /**
     * Getter for the external id
     */
    public function externalId(): string
    {
        return $this->externalId;
    }

    /**
     * Setter for the prompt
     */
    public function withPrompt(string $prompt = null): self
    {
        $this->prompt = $prompt;

        return $this;
    }

    /**
     * Getter for the prompt
     */
    public function prompt(): string
    {
        return $this->prompt;
    }

    /**
     * Setter for the width
     */
    public function withWidth(int $width = null): self
    {
        $this->width = $width;

        return $this;
    }

    /**
     * Getter for the width
     */
    public function width(): int
    {
        return $this->width;
    }

    /**
     * Setter for the height
     */
    public function withHeight(int $height = null): self
    {
        $this->height = $height;

        return $this;
    }

    /**
     * Getter for the height
     */
    public function height(): int
    {
        return $this->height;
    }

    /**
     * Setter for the url
     */
    public function withUrl(string $url = null): self
    {
        $this->url = $url;

        return $this;
    }

    /**
     * Getter for the url
     */
    public function url(): string
    {
        return $this->url;
    }

    /**
     * Setter for the image
     */
    public function withImage(Image $image): self
    {
        $this->image = $image;

        $this->withExternalId($image->external_id)
            ->withPrompt($image->prompt)
            ->withWidth($image->width)
            ->withHeight($image->height)
            ->withUrl($image->url);

        return $this;
    }

    /**
     * Getter for the image
     */
    public function image(): Image
    {
        return $this->image;
    }

    /**
     * Returns the array representation of the bridge
     */
    public function toArray(): array
    {
        return [
            'model_id' => 1,
            'prompt' => $this->prompt,
            'width' => $this->width,
            'height' => $this->height,
            'url' => $this->url,
        ];
    }

    /**
     * Imports the bridge into the database
     */
    public function import(): Model
    {
        $this->image = $this->image ?? ( new Image );
        $this->image->forceFill($this->toArray())->save();

        return $this->image;
    }

    /**
     * Generates an image, using the AI provider
     */
    public function generate(string $prompt, int $width, int $height): string
    {
        /**
         * Get the response from the provider, in the ImageResponse format
         */
        $response = $this->provider()->getConnector()->imageGenerate($prompt, $width, $height);

        /**
         * Populate local data
         */
        $this->prompt = $prompt;
        $this->width = $width;
        $this->height = $height;
        $this->url = $response->url();

        /**
         * Import into a model
         */
        $this->import();

        /**
         * Return the url
         */
        return $this->url;
    }
}
