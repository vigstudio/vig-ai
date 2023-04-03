<?php

namespace VigStudio\LaravelAI\Commands;

use Illuminate\Console\Command;
use VigStudio\LaravelAI\Bridges\ModelBridge;
use VigStudio\LaravelAI\Contracts\ConsoleProviderDependent;
use VigStudio\LaravelAI\Models\Model;

class ImportModels extends Command
{
    use ConsoleProviderDependent;

    /**
     * @var string The signature of the console command.
     */
    protected $signature = 'ai:import-models';

    /**
     * @var string The description of the console command.
     */
    protected $description = 'Import models from AI provider';

    public function handle(): void
    {
        $provider = $this->askForProvider();

        Model::whereProvider($provider->value)->update([
            'is_active' => false,
        ]);

        $this->withProgressBar($provider->getConnector()->listModels(), function (ModelBridge $modelBridge) {
            $modelBridge->import();
        });
    }
}
