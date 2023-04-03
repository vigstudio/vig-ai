<?php

namespace VigStudio\LaravelAI\Models;

use Illuminate\Database\Eloquent\Model as EloquentModel;
use VigStudio\LaravelAI\Enums\Provider;

class Model extends EloquentModel
{
    protected $table = 'vig_ai_models';

    protected $fillable = [
        'is_active',
        'name',
        'external_id',
        'provider',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'provider' => Provider::class,
    ];
}
