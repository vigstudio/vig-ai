<?php

namespace VigStudio\LaravelAI\Contracts;

use VigStudio\LaravelAI\Models\Model;

trait HasModel
{
    use HasProvider;

    /**
     * @var Model The model
     */
    private Model $model;

    /**
     * Proxy setter for the model. This just calls the private method.
     * This is done to make possible overriding the method in the trait implementations,
     * having still the possibility to call the private method.
     */
    public function withModel(Model|string $model): self
    {
        return $this->_withModel($model);
    }

    /**
     * Real setter for the model
     */
    private function _withModel(Model|string $model): self
    {
        if (is_string($model)) {
            $model = Model::whereExternalId($model)
                ->whereProvider($this->provider)
                ->firstOrFail();
        }

        $this->model = $model;

        return $this;
    }

    /**
     * Getter for the model
     */
    public function model(): Model
    {
        return $this->model;
    }
}
