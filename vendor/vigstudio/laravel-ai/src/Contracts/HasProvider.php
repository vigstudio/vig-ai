<?php

namespace VigStudio\LaravelAI\Contracts;

use VigStudio\LaravelAI\Enums\Provider;

trait HasProvider
{
    /**
     * @var Provider - The provider
     */
    private Provider $provider;

    /**
     * Setter for the provider
     */
    public function withProvider(Provider $provider): self
    {
        $this->provider = $provider;

        return $this;
    }

    /**
     * Getter for the provider
     */
    public function provider(): Provider
    {
        return $this->provider;
    }
}
