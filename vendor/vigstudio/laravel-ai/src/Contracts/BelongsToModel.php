<?php

namespace VigStudio\LaravelAI\Contracts;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use VigStudio\LaravelAI\Models\Model;

/**
 * This trait should be used by Eloquent models
 * that belong to an AI model
 */
trait BelongsToModel
{
    /**
     * The relation with the model
     */
    public function model(): BelongsTo
    {
        return $this->belongsTo(Model::class);
    }
}
