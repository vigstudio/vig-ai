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
        Route::post('completion', ['as' => 'completion', 'uses' => 'completion']);
        Route::post('chat', ['as' => 'chat', 'uses' => 'chat']);
        Route::post('importModel', ['as' => 'importModel', 'uses' => 'importModel']);
    });
});
