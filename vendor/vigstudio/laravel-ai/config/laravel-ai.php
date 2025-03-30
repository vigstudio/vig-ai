<?php

return [
    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'organization' => env('OPENAI_ORGANIZATION'),
        'default_max_tokens' => 1000,
        'default_temperature' => 0.7,
    ],
];
