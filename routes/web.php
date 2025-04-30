<?php

use VigStudio\VigAI\Http\Controllers\VigAiController;

Route::group([
    'controller' => VigAiController::class,
    'middleware' => ['web', 'core'],
], function () {
    Route::group([
        'prefix' => BaseHelper::getAdminPrefix() . '/vig-ai',
        'as' => 'vig-ai.',
    ], function () {
        Route::get('stream', ['as' => 'stream', 'uses' => 'stream']);
        Route::post('importModel', ['as' => 'importModel', 'uses' => 'importModel']);
        Route::post('generateImage', ['as' => 'generateImage', 'uses' => 'generateImage']);
    });
});
