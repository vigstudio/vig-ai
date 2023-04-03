<?php

namespace VigStudio\VigAI\Providers;

require __DIR__ . '/../../vendor/autoload.php';

use VigStudio\VigAI\Models\VigAi;
use Illuminate\Support\ServiceProvider;
use VigStudio\VigAI\Repositories\Caches\VigAiCacheDecorator;
use VigStudio\VigAI\Repositories\Eloquent\VigAiRepository;
use VigStudio\VigAI\Repositories\Interfaces\VigAiInterface;
use Illuminate\Support\Facades\Event;
use Botble\Base\Traits\LoadAndPublishDataTrait;
use Illuminate\Routing\Events\RouteMatched;

class VigAiServiceProvider extends ServiceProvider
{
    use LoadAndPublishDataTrait;

    public function register(): void
    {
        $this->app->bind(VigAiInterface::class, function () {
            return new VigAiCacheDecorator(new VigAiRepository(new VigAi()));
        });

        $this->setNamespace('plugins/vig-ai')->loadHelpers();
    }

    public function boot(): void
    {
        $this
            ->loadAndPublishConfigurations(['permissions'])
            ->loadAndPublishTranslations()
            ->loadAndPublishViews()
            ->loadRoutes()
            ->publishAssets();

        config()->set(['laravel-ai.openai.api_key' => setting('vig_openai_api_key', '')]);
        config()->set(['laravel-ai.openai.default_max_tokens' => 50]);
        config()->set(['laravel-ai.openai.default_temperature' => 0.2]);

        $this->app->booted(function () {
            $this->app->register(\VigStudio\LaravelAI\ServiceProvider::class);
            $this->app->register(HookServiceProvider::class);
        });

        // Event::listen(RouteMatched::class, function () {
        //     dashboard_menu()->registerItem([
        //         'id' => 'cms-plugins-vig-ai',
        //         'priority' => 5,
        //         'parent_id' => null,
        //         'name' => 'plugins/vig-ai::vig-ai.name',
        //         'icon' => 'fa fa-list',
        //         'url' => route('vig-ai.index'),
        //         'permissions' => ['vig-ai.index'],
        //     ]);
        // });
    }
}
