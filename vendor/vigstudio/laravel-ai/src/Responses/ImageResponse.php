<?php

namespace VigStudio\LaravelAI\Responses;

use VigStudio\LaravelAI\Contracts\HasNew;

class ImageResponse
{
    use HasNew;

    /**
     * @var string - The date and time the image was created
     */
    private string $createdAt;

    /**
     * @var string - The url of the image
     */
    private string $url;

    /**
     * @var string - The base64 encoded json string
     */
    private string $b64Json;

    /**
     * Setter for the createdAt
     */
    public function withCreatedAt(string $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    /**
     * Getter for the createdAt
     */
    public function createdAt(): string
    {
        return $this->createdAt;
    }

    /**
     * Setter for the url
     */
    public function withUrl(string $url): self
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
     * Setter for the b64Json
     */
    public function withB64Json(string $b64Json): self
    {
        $this->b64Json = $b64Json;

        return $this;
    }

    /**
     * Getter for the b64Json
     */
    public function b64Json(): string
    {
        return $this->b64Json;
    }
}
