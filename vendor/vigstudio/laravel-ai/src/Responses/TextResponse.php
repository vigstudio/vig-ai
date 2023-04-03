<?php

namespace VigStudio\LaravelAI\Responses;

use VigStudio\LaravelAI\Contracts\HasNew;

class TextResponse
{
    use HasNew;

    /**
     * @var string - The external id of the text
     */
    private string $externalId;

    /**
     * @var MessageResponse - The message, in the MessageResponse format
     */
    private MessageResponse $message;

    /**
     * Setter for the external id
     */
    public function withExternalId(string $externalId): self
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
     * Setter for the message
     */
    public function withMessage(MessageResponse $message): self
    {
        $this->message = $message;

        return $this;
    }

    /**
     * Getter for the message
     */
    public function message(): MessageResponse
    {
        return $this->message;
    }
}
