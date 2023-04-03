<?php

namespace VigStudio\VigAI\Providers;

use Illuminate\Support\ServiceProvider;
use Assets;

class HookServiceProvider extends ServiceProvider
{
    public function boot()
    {
        add_filter(BASE_FILTER_AFTER_SETTING_CONTENT, [$this, 'addSettings'], 99);
        add_filter(BASE_FILTER_FORM_EDITOR_BUTTONS, [$this, 'addViewButton'], 120, 1);
    }

    public function addViewButton($data)
    {
        Assets::addScriptsDirectly(['vendor/core/plugins/vig-ai/js/vig-ai.js?v=1.0.1']);

        return $data . view('plugins/vig-ai::index')->render();
    }

    public function addSettings(?string $data = null): string
    {
        return $data . view('plugins/vig-ai::setting')->render();
    }
}
