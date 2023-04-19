<?php

namespace VigStudio\LaravelAI;

use Illuminate\Foundation\Application;
use Illuminate\Support\ServiceProvider as IlluminateServiceProvider;
use Orhanerday\OpenAi\OpenAi;
use VigStudio\LaravelAI\Commands\Chat;
use VigStudio\LaravelAI\Commands\Complete;
use VigStudio\LaravelAI\Commands\ImageGenerate;
use VigStudio\LaravelAI\Commands\ImportModels;
use VigStudio\LaravelAI\Connectors\OpenAIConnector;

class ServiceProvider extends IlluminateServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->loadMigrations();
        $this->registerCommands();
        $this->mergeConfigurations();
        $this->configureDependencyInjection();
    }

    /**
     * Load the migrations
     */
    private function loadMigrations(): void
    {
        $this->loadMigrationsFrom([
            __DIR__.'/../database/migrations/',
        ]);
    }

    /**
     * Register the commands
     */
    private function registerCommands(): void
    {
        $this->commands([
            Chat::class,
            Complete::class,
            ImageGenerate::class,
            ImportModels::class,
        ]);
    }

    /**
     * Merge the config
     */
    private function mergeConfigurations(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/laravel-ai.php', 'laravel-ai');
    }

    /**
     * Configure the Dependency Injection
     */
    private function configureDependencyInjection(): void
    {
        /**
         * The OpenAI client
         */
        $this->app->singleton(OpenAi::class, function () {
            return new OpenAi(config('laravel-ai.openai.api_key'));
        });
        /**
         * The OpenAI connector
         */
        $this->app->singleton(OpenAIConnector::class, function (Application $app) {
            return ( new OpenAIConnector($app->make(OpenAi::class)) )
                ->withDefaultMaxTokens(config('laravel-ai.openai.default_max_tokens'))
                ->withDefaultTemperature(config('laravel-ai.openai.default_temperature'));
        });
    }
}
