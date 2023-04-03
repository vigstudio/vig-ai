<?php

namespace VigStudio\LaravelAI\Bridges;

use Illuminate\Database\Eloquent\Model;
use VigStudio\LaravelAI\Contracts\Bridge;
use VigStudio\LaravelAI\Contracts\HasModel;
use VigStudio\LaravelAI\Contracts\HasNew;
use VigStudio\LaravelAI\Contracts\HasProvider;
use VigStudio\LaravelAI\Models\Completion;

class CompletionBridge implements Bridge
{
    use HasProvider, HasModel, HasNew;

    /**
     * @var string The external id of the completion, returned by the provider
     */
    private string $externalId;

    /**
     * @var string The prompt of the completion, provided by the user
     */
    private string $prompt;

    /**
     * @var string The answer to the prompt, returned by the provider
     */
    private string $answer;

    /**
     * @var Completion|null The corresponding completion model
     */
    private ?Completion $completion;

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
     * Setter for the prompt
     */
    public function withPrompt(string $prompt): self
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
     * Setter for the answer
     */
    public function withAnswer(string $answer): self
    {
        $this->answer = $answer;

        return $this;
    }

    /**
     * Getter for the answer
     */
    public function answer(): string
    {
        return $this->answer;
    }

    /**
     * Setter for the completion
     */
    public function withCompletion(Completion $completion): self
    {
        $this->completion = $completion;

        $this->withModel($completion->model)
            ->withExternalId($completion->external_id)
            ->withPrompt($completion->prompt)
            ->withAnswer($completion->answer);

        return $this;
    }

    /**
     * Getter for the completion
     */
    public function completion(): Completion
    {
        return $this->completion;
    }

    /**
     * Returns the array representation of the bridge
     */
    public function toArray(): array
    {
        return [
            'model_id' => $this->model?->id,
            'external_id' => $this->externalId(),
            'prompt' => $this->prompt(),
            'answer' => $this->answer(),
        ];
    }

    /**
     * Import the bridge into a model
     */
    public function import(): Model
    {
        $this->completion = $this->completion ?? ( new Completion );
        $this->completion->forceFill($this->toArray())->save();

        return $this->completion;
    }

    /**
     * Ask the provider to complete the given text
     */
    public function complete(string $text): string
    {
        /**
         * Get the response from the provider, in the TextResponse format
         */
        $response = $this->provider()->getConnector()->complete($this->model->external_id, $text);

        /**
         * Populate local data
         */
        $this->externalId = $response->externalId();
        $this->prompt = $text;
        $this->answer = $response->message()->content();

        /**
         * Import into a model
         */
        $this->import();

        /**
         * Return the content of the response
         */
        return $response->message()->content();
    }

    public function stream(string $text): string
    {
        /**
         * Get the response from the provider, in the TextResponse format
         */
        $response = $this->provider()->getConnector()->completeStream($this->model->external_id, $text);
        /**
         * Populate local data
         */
        $this->externalId = $response->externalId();
        $this->prompt = $text;
        $this->answer = $response->message()->content();

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
