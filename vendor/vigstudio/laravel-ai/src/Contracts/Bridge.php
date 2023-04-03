<?php

namespace VigStudio\LaravelAI\Contracts;

use Illuminate\Database\Eloquent\Model;
use VigStudio\LaravelAI\Enums\Provider;

/**
 * The bridge is a way to connect the AI provider to the application.
 * It takes care of translating the AI provider's response to a format that the application can understand.
 */
interface Bridge
{
    /**
     * Return a new instance of the bridge.
     */
    public static function new(): self;

    /**
     * Set the provider for the bridge.
     * This is implemented in the HasProvider trait.
     * Bridges should implement this interface and use the trait.
     */
    public function withProvider(Provider $provider): self;

    /**
     * This function should return an array representation of the current bridge.
     */
    public function toArray(): array;

    /**
     * This function should import the current bridge into the application.
     * It should return the imported laravel model.
     */
    public function import(): Model;
}
