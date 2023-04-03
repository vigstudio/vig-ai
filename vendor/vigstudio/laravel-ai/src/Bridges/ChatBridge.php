<?php

namespace VigStudio\LaravelAI\Bridges;

use Illuminate\Database\Eloquent\Model;
use VigStudio\LaravelAI\Contracts\Bridge;
use VigStudio\LaravelAI\Contracts\HasModel;
use VigStudio\LaravelAI\Contracts\HasNew;
use VigStudio\LaravelAI\Contracts\HasProvider;
use VigStudio\LaravelAI\Models\Chat;

final class ChatBridge implements Bridge
{
    use HasProvider, HasModel, HasNew;

    /**
     * @var string|null The external id of the chat, returned by the provider
     */
    private ?string $externalId;

    /**
     * @var array The messages sent and received in the chat
     */
    private array $messages = [];

    /**
     * @var Chat|null The corresponding chat model
     */
    private ?Chat $chat;

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
     * Setter for the messages
     */
    public function withMessages(array $messages = null): self
    {
        $this->messages = $messages ?? [];

        return $this;
    }

    /**
     * Getter for the messages
     */
    public function messages(): array
    {
        return $this->messages;
    }

    /**
     * Setter for the chat
     */
    public function withChat(Chat $chat): self
    {
        $this->chat = $chat;

        $this->withModel($chat->model)
            ->withExternalId($chat->external_id)
            ->withMessages($chat->messages);

        return $this;
    }

    /**
     * Getter for the chat
     */
    public function chat(): Chat
    {
        return $this->chat;
    }

    /**
     * Returns a representation of the chat as an array
     */
    public function toArray(): array
    {
        return [
            'model_id' => $this->model?->id,
            'external_id' => $this->externalId,
            'messages' => $this->messages,
        ];
    }

    /**
     * Import the chat data into a Model
     */
    public function import(): Model
    {
        $this->chat = $this->chat ?? ( new Chat );
        $this->chat->forceFill($this->toArray())->save();

        return $this->chat;
    }

    /**
     * Send a message to the chat
     */
    public function send($message): string
    {
        /**
         * Append the message to the messages array
         */
        $this->messages[] = [
            'role' => 'user',
            'content' => $message,
        ];

        /**
         * Get the response from the provider, in the TextResponse format
         */
        $response = $this->provider->getConnector()->chat($this->model->external_id, $this->messages);

        /**
         * Populate local data
         */
        $this->externalId = $response->externalId();
        $this->messages = array_merge($this->messages, [$response->message()->toArray()]);

        /**
         * Import into a model
         */
        $this->import();

        /**
         * Return the content of the response
         */
        return $response->message()->content();
    }

    /**
     * Send a message to the chat Stream
     */
    public function sendStream($message): string
    {
        /**
         * Append the message to the messages array
         */
        $this->messages[] = [
            'role' => 'user',
            'content' => $message,
        ];

        /**
         * Get the response from the provider, in the TextResponse format
         */
        $response = $this->provider->getConnector()->chatStream($this->model->external_id, $this->messages);

        /**
         * Populate local data
         */
        $this->externalId = $response->externalId();
        $this->messages = array_merge($this->messages, [$response->message()->toArray()]);

        /**
         * Import into a model
         */
        $this->import();

        /**
         * Return the content of the response
         */
        return $response->message()->content();
    }
}
