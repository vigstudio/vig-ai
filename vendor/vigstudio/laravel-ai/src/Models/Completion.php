<?php

namespace VigStudio\LaravelAI\Models;

use Illuminate\Database\Eloquent\Model as EloquentModel;
use VigStudio\LaravelAI\Contracts\BelongsToModel;

class Completion extends EloquentModel
{
    use BelongsToModel;

    protected $table = 'vig_ai_completions';

    protected $fillable = [
        'model_id',
        'external_id',
        'prompt',
        'completion',
    ];
}
