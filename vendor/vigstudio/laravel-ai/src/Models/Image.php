<?php

namespace VigStudio\LaravelAI\Models;

use Illuminate\Database\Eloquent\Model as EloquentModel;

class Image extends EloquentModel
{
    protected $table = 'vig_ai_images';

    protected $fillable = [
        'model_id',
        'prompt',
        'width',
        'height',
        'url',
    ];
}
