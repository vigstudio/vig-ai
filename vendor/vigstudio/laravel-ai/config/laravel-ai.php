<?php

return [
    'openai' => [
        'api_key'             => env('AI_OPENAI_API_KEY', null),
        'default_max_tokens'  => env('AI_OPENAI_DEFAULT_MAX_TOKENS', 5),
        'default_temperature' => env('AI_OPENAI_DEFAULT_TEMPERATURE', 0.2),
    ],
];
