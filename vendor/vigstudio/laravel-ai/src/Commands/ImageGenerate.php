<?php

namespace VigStudio\LaravelAI\Commands;

use Illuminate\Console\Command;
use VigStudio\LaravelAI\Bridges\ImageBridge;
use VigStudio\LaravelAI\Contracts\ConsoleProviderDependent;

class ImageGenerate extends Command
{
    use ConsoleProviderDependent;

    protected $signature = 'ai:image:generate';

    protected $description = 'Command description';

    public function handle(): void
    {
        $provider = $this->askForProvider();

        $prompt = $this->ask('You');

        $this->info(
            'AI: '.
            ImageBridge::new()
                ->withProvider($provider)
                ->generate($prompt, 1024, 1024)
        );
    }
}
