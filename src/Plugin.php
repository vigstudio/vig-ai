<?php

namespace VigStudio\VigAI;

include __DIR__ . '/../vendor/autoload.php';

use BaseHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Contracts\Foundation\Application;
use Botble\PluginManagement\Abstracts\PluginOperationAbstract;
use VigStudio\LaravelAI\Models\Model;
use VigStudio\LaravelAI\Enums\Provider;

class Plugin extends PluginOperationAbstract
{
    public static function activated()
    {
        $migrationPath = plugin_path('vig-ai/vendor/vigstudio/laravel-ai/database/migrations');

        $files = app(Filesystem::class);
        $app = app(Application::class);

        if ($files->isDirectory($migrationPath)) {
            $app['migrator']->run($migrationPath);
        }

        $provider = Provider::from('openai');

        Model::whereProvider('openai')->update([
            'is_active' => false,
        ]);

        foreach ($provider->getConnector()->listModels() as $modelBridge) {
            $modelBridge->import();
        }
    }

    public static function remove()
    {
        Schema::dropIfExists('vig_ai_images');
        Schema::dropIfExists('vig_ai_completions');
        Schema::dropIfExists('vig_ai_chats');
        Schema::dropIfExists('vig_ai_models');

        $migrations = [];
        foreach (BaseHelper::scanFolder(plugin_path('vig-ai/vendor/vigstudio/laravel-ai/database/migrations')) as $file) {
            $migrations[] = pathinfo($file, PATHINFO_FILENAME);
        }

        DB::table('migrations')->whereIn('migration', $migrations)->delete();
    }
}
