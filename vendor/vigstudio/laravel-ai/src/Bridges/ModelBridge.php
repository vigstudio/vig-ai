<?php

namespace VigStudio\LaravelAI\Bridges;

use VigStudio\LaravelAI\Contracts\Bridge;
use VigStudio\LaravelAI\Contracts\HasModel;
use VigStudio\LaravelAI\Contracts\HasNew;
use VigStudio\LaravelAI\Contracts\HasProvider;
use VigStudio\LaravelAI\Models\Model;

final class ModelBridge implements Bridge
{
    use HasProvider, HasModel, HasNew;

    /**
     * @var string The external id of the model, returned by the provider
     */
    private string $externalId;

    /**
     * @var string The name of the model
     */
    private string $name;

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
     * Setter for the name
     */
    public function withName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    /**
     * Getter for the name
     */
    public function name(): string
    {
        return $this->name;
    }

    /**
     * Setter for the model
     */
    public function withModel(Model|string $model): self
    {
        /**
         * Call the trait setter for the model
         */
        $this->_withModel($model);

        /**
         * Update other properties
         */
        $this->withExternalId($this->model->external_id);
        $this->withName($this->model->name);

        return $this;
    }

    /**
     * Returns the array representation of the model
     */
    public function toArray(): array
    {
        return [
            'external_id' => $this->externalId,
            'name' => $this->name,
        ];
    }

    /**
     * Imports the model into the database
     */
    public function import(): Model
    {
        $model = Model::updateOrCreate([
            'external_id' => $this->externalId,
            'provider' => $this->provider,
        ], array_merge(
            $this->toArray(),
            [
                'provider' => $this->provider,
                'is_active' => true,
            ]
        ));

        $this->withModel($model);

        return $model;
    }
}
